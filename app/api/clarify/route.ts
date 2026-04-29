import { NextRequest } from "next/server";
import { ClarificationStrategy } from "@/lib/clarification/strategy";
import { ReasoningStrategy } from "@/lib/clarification/reasoning";
import { IntentSimStrategy } from "@/lib/clarification/intent-sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStrategy(name?: string): ClarificationStrategy {
  switch (name) {
    case "intent-sim":
      return new IntentSimStrategy();
    case "reasoning":
    default:
      return new ReasoningStrategy();
  }
}

export async function POST(request: NextRequest) {
  const { message, strategy: strategyName, entropyThreshold } = await request.json();
  console.log(`[Clarify API] Received request - message: "${message}", strategy: ${strategyName}, threshold: ${entropyThreshold}`);

  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueueLine = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      // Force the response to start flushing immediately, before the model
      // begins emitting tokens. Without this, some Next.js dev configurations
      // and proxies hold the response until completion.
      enqueueLine({ type: "start" });

      try {
        const strategy = getStrategy(strategyName);
        const result = await strategy.evaluate(message, {
          entropyThreshold,
          onThinking: (text) => enqueueLine({ type: "thinking", text }),
        });

        // Strip the already-streamed thinking before sending the terminal event.
        const { thinking: _thinking, ...resultPayload } = result;
        console.log(`[Clarify API] Final clarification result:`, JSON.stringify(resultPayload, null, 2));
        enqueueLine({ type: "result", data: resultPayload });
      } catch (error) {
        console.error("[Clarify API] Error:", error);
        enqueueLine({
          type: "result",
          data: {
            shouldClarify: false,
            originalMessage: message,
            debug: { strategy: strategyName || "reasoning", entropy: 0 },
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
    },
  });
}
