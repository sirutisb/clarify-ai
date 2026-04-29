import { getLLMClient } from "../llm/client";
import { ClarificationResult, ClarificationStrategy, ClarificationOptions, Interpretation } from "./strategy";
import { stripClarifyingPrefix } from "./utils";

const REASONING_SYSTEM_PROMPT = `You are an expert at analyzing question ambiguity. Given a question, identify the distinct possible interpretations a user might intend, and estimate the probability of each interpretation.

Rules:
- List between 1 and 6 distinct interpretations
- Assign a probability to each interpretation reflecting how likely a typical user means that interpretation
- Probabilities must sum to 1.0
- If the question is unambiguous, output a single interpretation with probability 1.0

You MUST respond in this exact JSON format and nothing else:
{"interpretations": [{"text": "...", "prob": 0.X}, {"text": "...", "prob": 0.X}]}`;

const CLARIFYING_QUESTION_SYSTEM_PROMPT = `You are an expert at generating clarifying questions for ambiguous queries.

Given an ambiguous question and a list of its possible intended interpretations, you must:
Write a single, concise clarifying question (under 50 words) that distinguishes between the interpretations

You MUST follow this exact output format with no deviation:
Clarification Question: <your question here>

Example 1:
Ambiguous Question: Who has the highest goals in world football?
Intended Interpretation 1: Who has the highest goals in men's world international football?
Intended Interpretation 2: Who has the highest goals all-time in men's football?
Intended Interpretation 3: Who has the highest goals in women's world international football?

Clarification Question: Are you referring to the highest goals in men's world international football, or women's?

Example 2:
Ambiguous Question: Who won the last olympic men's hockey?
Intended Interpretation 1: Who won Olympic men's ice hockey in 2014?
Intended Interpretation 2: Who won Olympic men's ice hockey in 2010?
Intended Interpretation 3: Who won Olympic men's ice hockey in 2006?
Intended Interpretation 4: Who won the 2016 olympic men's field hockey?
Intended Interpretation 5: Who won the 2012 olympic men's field hockey?
Intended Interpretation 6: Who won the 2008 olympic men's field hockey?

Clarification Question: Which year? Are you referring to field hockey or ice hockey?

Rules:
- The clarification question must differentiate ALL interpretations, in a concise question
- Do not add explanations, preamble, or any extra text outside the format.`;

function calculateEntropy(probs: number[]): number {
  return probs.reduce((sum, p) => {
    if (p <= 0) return sum;
    return sum - p * Math.log2(p);
  }, 0);
}

function parseResponse(raw: string, threshold: number): {
  shouldClarify: boolean;
  interpretations: Interpretation[];
  entropy: number;
} {
  // Extract the JSON block if the model wrapped it in markdown backticks
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonString = match ? match[1] : raw.trim();

  try {
    const parsed = JSON.parse(jsonString);
    const rawInterps = parsed.interpretations || [];
    let probs = rawInterps.map((interp: any) => interp.prob);

    // Normalize probabilities
    const total = probs.reduce((sum: number, p: number) => sum + p, 0);
    if (total > 0) {
      probs = probs.map((p: number) => p / total);
    } else {
      probs = probs.map(() => 1.0 / probs.length);
    }

    const interpretations: Interpretation[] = rawInterps.map((interp: any, i: number) => ({
      text: interp.text,
      prob: probs[i],
    }));

    const entropy = calculateEntropy(probs);
    const shouldClarify = entropy > threshold;

    return { shouldClarify, interpretations, entropy };
  } catch (e) {
    console.error("Failed to parse reasoning JSON response:", e);
    return { shouldClarify: false, interpretations: [], entropy: 0 };
  }
}

async function generateClarifyingQuestion(
  prompt: string,
  interpretations: Interpretation[],
): Promise<string> {
  const client = getLLMClient();
  const userMsg = [
    `Ambiguous Question: ${prompt}`,
    ...interpretations.map((it, i) => `Intended Interpretation ${i + 1}: ${it.text}`),
  ].join("\n");

  const raw = await client.chat(
    [
      { role: "system", content: CLARIFYING_QUESTION_SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
    { temperature: 0, max_tokens: 128, enable_thinking: false },
  );

  return stripClarifyingPrefix(raw);
}

export class ReasoningStrategy implements ClarificationStrategy {
  name = "reasoning";

  async evaluate(prompt: string, options?: ClarificationOptions): Promise<ClarificationResult> {
    const client = getLLMClient();

    let thinking = "";
    let responseContent = "";

    for await (const chunk of client.chatStream(
      [
        { role: "system", content: REASONING_SYSTEM_PROMPT },
        { role: "user", content: `Question: ${prompt}` },
      ],
      { temperature: 0, max_tokens: 3000, enable_thinking: true },
    )) {
      if (chunk.type === "thinking") {
        thinking += chunk.text;
        options?.onThinking?.(chunk.text);
      } else {
        responseContent += chunk.text;
      }
    }

    console.log(`\n[Reasoning] thinking length=${thinking.length} chars`);
    console.log(`[Reasoning] raw response: ${responseContent}`);

    if (options?.entropyThreshold === undefined) {
      throw new Error("entropyThreshold is required in ClarificationOptions");
    }
    const threshold = options.entropyThreshold;
    const { shouldClarify, interpretations, entropy } = parseResponse(responseContent, threshold);

    let clarifyingQuestion: string | undefined;
    if (shouldClarify && interpretations.length > 0) {
      clarifyingQuestion = await generateClarifyingQuestion(prompt, interpretations);
      console.log(`[Reasoning] clarifying question: ${clarifyingQuestion}`);
    }

    return {
      shouldClarify,
      clarifyingQuestion,
      interpretations: shouldClarify ? interpretations : undefined,
      originalMessage: prompt,
      thinking,
      debug: {
        strategy: this.name,
        rawResponse: responseContent,
        entropy,
      },
    };
  }
}
