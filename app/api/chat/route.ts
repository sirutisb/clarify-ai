import { NextRequest } from "next/server";
import { getLLMClient } from "@/lib/llm/client";
import { Message } from "@/lib/llm/types";

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: Message[] };

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }


  const client = getLLMClient();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of client.chatStream(messages, { enable_thinking: false })) {
          // Defensive: with enable_thinking:false the model shouldn't emit
          // thinking tokens, but never surface them in the answer stream.
          if (chunk.type === "content") {
            controller.enqueue(encoder.encode(chunk.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
