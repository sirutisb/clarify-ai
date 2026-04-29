import { getLLMClient } from "../llm/client";
import { Message } from "../llm/types";
import { ClarificationResult, ClarificationStrategy, ClarificationOptions } from "./strategy";
import { stripClarifyingPrefix } from "./utils";

const SIMULATION_COUNT = 10;
const SAMPLING_TEMP = 0.7;

const CLARIFYING_QUESTION_SYSTEM_PROMPT = `You are a professional question analyzer designed to disambiguate possible interpretations of asked questions.
Your task is to respond with a follow up question to an input question.
Ask a clarification to separate an intent, your question should be consise and relevant to the question they are asking.
Do not question the premise or accuracy of the question — assume it is correct as stated.
You should give your output in the format Follow-Up Question: <>
Below are some examples:

Example 1:
Question: Who won the US open?
Follow-Up Question: Are you referring to Men's Singles or Women's Singles?

Example 2:
Question: How many Grammy Awards does Whitney Houston have?
Follow-Up Question: Are you referring to the number of Grammy Awards Whitney Houston won, or the number of Grammy Awards Whitney Houston was nominated for?

Example 3:
Question: Tell me about the Apollo program.
Follow-Up Question: Are you referring to the overall history, a specific mission like Apollo 11, or the technology?`;

const SIMULATION_SYSTEM_PROMPT = `You are a simulated user responding to a clarifying question.
Your task is to select EXACTLY ONE option from the choices presented in the follow-up question.
Respond to the follow-up question by picking EXACTLY ONE of the choices from the question.
IMPORTANT: Provide ONLY the specific interpretation. Do not use conversational filler, do not write complete sentences, and do not describe your choice. Be as brief as possible.
Here are some examples below:

Example 1:
Question: Who won the US open?
Follow-Up Question: Are you referring to Men's Singles or Women's Singles?
Answer: Women's Singles

Example 2:
Question: How many Grammy Awards does Whitney Houston have?
Follow-Up Question: Are you referring to the number of Grammy Awards Whitney Houston won, or the number of Grammy Awards Whitney Houston was nominated for?
Answer: The number of Grammy Awards Whitney Houston won

Example 3:
Question: Tell me about apple
Follow-Up Question: Are you referring to the tech company Apple, or the fruit apple?
Answer: The tech company Apple
Example 4:
Question: What is the matrix?
Follow-Up Question: Are you referring to the movie, the mathematical concept, or the organizational structure?
Answer: the mathematical concept`;

function buildSimulationUserMessage(userInput: string, clarifyingQ: string): string {
  return `Question: ${userInput}\n${clarifyingQ}`;
}

interface NLIBatchResponse {
  matrix: boolean[][];
  score_matrix: number[][];
}

async function checkBatchEquivalence(
  question: string,
  answers: string[],
): Promise<NLIBatchResponse> {
  const nliUrl = process.env.NLI_SERVICE_URL || "http://localhost:8000";
  const response = await fetch(`${nliUrl}/batch_equivalence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: question, answers }),
  });

  if (!response.ok) {
    throw new Error(`NLI service error: ${response.status}`);
  }

  const data = await response.json();
  // console.log("[IntentSim API Call] NLI Batch Equivalence Response:", JSON.stringify(data, null, 2));
  return data;
}

function findConnectedComponents(
  equivalenceMatrix: boolean[][],
  size: number,
): number[][] {
  const visited = new Set<number>();
  const clusters: number[][] = [];

  for (let i = 0; i < size; i++) {
    if (visited.has(i)) continue;

    const cluster: number[] = [];
    const stack = [i];

    while (stack.length > 0) {
      const node = stack.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      cluster.push(node);

      for (let neighbor = 0; neighbor < size; neighbor++) {
        if (!visited.has(neighbor) && equivalenceMatrix[node][neighbor]) {
          stack.push(neighbor);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function computeEntropy(clusters: number[][], total: number): number {
  let entropy = 0;
  for (const cluster of clusters) {
    const p = cluster.length / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export class IntentSimStrategy implements ClarificationStrategy {
  name = "intent-sim";

  async evaluate(prompt: string, options?: ClarificationOptions): Promise<ClarificationResult> {
    const client = getLLMClient();

    // Stage 1: Generate clarifying question (greedy)
    const clarifyingRaw = await client.chat(
      [
        { role: "system", content: CLARIFYING_QUESTION_SYSTEM_PROMPT },
        { role: "user", content: `Question: ${prompt}` },
      ],
      { temperature: 0, max_tokens: 128, enable_thinking: false },
    );
    const clarifyingQ = stripClarifyingPrefix(clarifyingRaw);
    console.log("[IntentSim Stage 1] Generated Clarifying Question:", clarifyingQ);

    // Stage 2: Simulate user responses
    const simulationMessages: Message[] = [
      { role: "system", content: SIMULATION_SYSTEM_PROMPT },
      { role: "user", content: buildSimulationUserMessage(prompt, clarifyingQ) },
    ];

    // Parallelize simulations in batches: n=4, n=4, n=2 to speed up execution
    console.log("[IntentSim Stage 2] Starting parallel simulations (batches: n=4, n=4, n=2)");
    const batchPromises = [
      client.chatMulti(simulationMessages, {
        temperature: SAMPLING_TEMP,
        max_tokens: 30,
        enable_thinking: false,
        n: 4,
      }),
      client.chatMulti(simulationMessages, {
        temperature: SAMPLING_TEMP,
        max_tokens: 30,
        enable_thinking: false,
        n: 4,
      }),
      client.chatMulti(simulationMessages, {
        temperature: SAMPLING_TEMP,
        max_tokens: 30,
        enable_thinking: false,
        n: 2,
      }),
    ];

    const batchResults = await Promise.all(batchPromises);
    const simulations = batchResults.flat();

    simulations.forEach((response, i) => {
      console.log(`[IntentSim Stage 2] Simulation ${i + 1} Response:`, response);
    });
    console.log("[IntentSim Stage 2] All Simulations:", simulations);

    // Stage 3: Build equivalence graph via NLI.
    // Use the *original* ambiguous prompt as context — NOT the clarifying
    // question. The clarifying question is long and shared between every
    // simulation, which makes the premises near-identical and pushes NLI
    // to predict entailment for everything (entropy collapses to 0).
    const { matrix } = await checkBatchEquivalence(prompt, simulations);

    // Find connected components
    const clusters = findConnectedComponents(matrix, simulations.length);
    console.log("[IntentSim Stage 3] Connected Components (Clusters):", clusters);

    // Stage 4: Compute entropy
    const entropy = computeEntropy(clusters, SIMULATION_COUNT);
    console.log("[IntentSim Stage 4] Computed Entropy:", entropy);

    // Stage 5: Decision
    if (options?.entropyThreshold === undefined) {
      throw new Error("entropyThreshold is required in ClarificationOptions");
    }
    const threshold = options.entropyThreshold;
    const shouldClarify = entropy > threshold;

    return {
      shouldClarify,
      clarifyingQuestion: shouldClarify ? clarifyingQ : undefined,
      originalMessage: prompt,
      debug: {
        strategy: this.name,
        entropy,
        clusters,
      },
    };
  }
}
