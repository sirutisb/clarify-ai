export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  repeat_penalty?: number;
  enable_thinking?: boolean;
  n?: number;
}

export const DEFAULT_LLM_OPTIONS: LLMOptions = {
  temperature: 1.0,
  max_tokens: 1024,
  top_p: 0.95,
  enable_thinking: false,
};
