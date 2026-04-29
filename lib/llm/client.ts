import OpenAI from "openai";
import { Message, LLMOptions, DEFAULT_LLM_OPTIONS } from "./types";

const THINK_REGEX = /<think>[\s\S]*?<\/think>/g;
const OPEN_TAG = "<think>";
const CLOSE_TAG = "</think>";

function stripThinkBlocks(text: string): string {
  return text.replace(THINK_REGEX, "").trim();
}

// Returns the length of the prefix of `buf` that is safe to emit without
// risking a partial tag at the boundary. Holds back the largest suffix of
// `buf` that is also a prefix of `tag`.
function safeEmitLen(buf: string, tag: string): number {
  const max = Math.min(tag.length - 1, buf.length);
  for (let len = max; len > 0; len--) {
    if (buf.endsWith(tag.slice(0, len))) return buf.length - len;
  }
  return buf.length;
}

export type StreamChunk = { type: "thinking" | "content"; text: string };

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor() {
    const baseURL =
      process.env.OPENAI_BASE_URL || "http://localhost:8080/v1";
    this.model = process.env.OPENAI_MODEL || "";
    this.client = new OpenAI({
      baseURL,
      apiKey: process.env.OPENAI_API_KEY || "not-needed",
    });
  }

  async chat(messages: Message[], options?: LLMOptions): Promise<string> {
    const results = await this.chatMulti(messages, { ...options, n: 1 });
    return results[0] || "";
  }

  async chatMulti(messages: Message[], options?: LLMOptions): Promise<string[]> {
    const opts = { ...DEFAULT_LLM_OPTIONS, ...options };

    // Note: the OpenAI Node SDK doesn't unwrap `extra_body` like the Python SDK.
    // Pass server-specific kwargs at the top level so llama-server / vLLM
    // actually see them.
    const extras: Record<string, unknown> = {};
    if (opts.top_k !== undefined) extras.top_k = opts.top_k;
    if (opts.enable_thinking !== undefined) {
      extras.chat_template_kwargs = { enable_thinking: opts.enable_thinking };
    }

    const response: any = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      top_p: opts.top_p,
      presence_penalty: 1.5,
      n: opts.n,
      ...extras,
    } as any);

    return (response.choices || []).map((choice: any) =>
      stripThinkBlocks(choice.message?.content || "")
    );
  }

  async *chatStream(
    messages: Message[],
    options?: LLMOptions,
  ): AsyncIterable<StreamChunk> {
    const opts = { ...DEFAULT_LLM_OPTIONS, ...options };

    const extras: Record<string, unknown> = {};
    if (opts.top_k !== undefined) extras.top_k = opts.top_k;
    if (opts.enable_thinking !== undefined) {
      extras.chat_template_kwargs = { enable_thinking: opts.enable_thinking };
    }

    const stream: any = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: opts.temperature,
      max_tokens: opts.max_tokens,
      top_p: opts.top_p,
      presence_penalty: 1.5,
      stream: true,
      ...extras,
    } as any);

    let buffer = "";
    let insideThink = false;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta ?? {};

      // Some OpenAI-compatible reasoning servers (e.g. vLLM with DeepSeek-R1)
      // expose thinking tokens on a separate `reasoning_content` field.
      const reasoningDelta: string = delta.reasoning_content || "";
      if (reasoningDelta) {
        process.stdout.write(reasoningDelta);
        yield { type: "thinking", text: reasoningDelta };
      }

      const contentDelta: string = delta.content || "";
      if (!contentDelta) continue;

      buffer += contentDelta;

      // Drain the buffer, alternating between content and thinking modes.
      // Hold back partial-tag suffixes so a tag split across chunks isn't
      // mis-emitted as content (or stuck inside think forever).
      while (true) {
        if (insideThink) {
          const closeIdx = buffer.indexOf(CLOSE_TAG);
          if (closeIdx === -1) {
            const safeLen = safeEmitLen(buffer, CLOSE_TAG);
            if (safeLen > 0) {
              const text = buffer.slice(0, safeLen);
              process.stdout.write(text);
              yield { type: "thinking", text };
              buffer = buffer.slice(safeLen);
            }
            break;
          }
          if (closeIdx > 0) {
            const text = buffer.slice(0, closeIdx);
            process.stdout.write(text);
            yield { type: "thinking", text };
          }
          buffer = buffer.slice(closeIdx + CLOSE_TAG.length);
          insideThink = false;
        } else {
          const openIdx = buffer.indexOf(OPEN_TAG);
          if (openIdx === -1) {
            const safeLen = safeEmitLen(buffer, OPEN_TAG);
            if (safeLen > 0) {
              yield { type: "content", text: buffer.slice(0, safeLen) };
              buffer = buffer.slice(safeLen);
            }
            break;
          }
          if (openIdx > 0) {
            yield { type: "content", text: buffer.slice(0, openIdx) };
          }
          buffer = buffer.slice(openIdx + OPEN_TAG.length);
          insideThink = true;
        }
      }
    }

    // Flush whatever remains in the buffer at end-of-stream.
    if (buffer.length > 0) {
      if (insideThink) {
        process.stdout.write(buffer);
        yield { type: "thinking", text: buffer };
      } else {
        yield { type: "content", text: buffer };
      }
    }
  }
}

let clientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!clientInstance) {
    clientInstance = new LLMClient();
  }
  return clientInstance;
}
