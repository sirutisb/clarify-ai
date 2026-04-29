"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "clarification";
  content: string;
  thinking?: string;
  clarifyingQuestions?: string[];
  originalMessage?: string;
  entropy?: number;
}

interface Interpretation {
  text: string;
  prob: number;
}

interface ClarifyResultData {
  shouldClarify: boolean;
  clarifyingQuestion?: string;
  interpretations?: Interpretation[];
  originalMessage?: string;
  debug?: { strategy?: string; entropy?: number };
}

export interface PendingClarification {
  clarifyingQuestion?: string;
  interpretations?: Interpretation[];
  entropy?: number;
  messageId: string;
  originalMessage: string;
}

type ChatState = "idle" | "clarifying" | "streaming";

interface UseChatOptions {
  strategy?: string;
  entropyThreshold?: number;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<ChatState>("idle");
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const [pendingClarification, setPendingClarification] = useState<PendingClarification | null>(null);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const streamResponse = useCallback(
    async (userMessages: { role: string; content: string }[]) => {
      setState("streaming");
      const assistantId = crypto.randomUUID();
      addMessage({ id: assistantId, role: "assistant", content: "" });

      abortRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: userMessages }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Error: Failed to get response from LLM." }
              : m,
          ),
        );
        setState("idle");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        );
      }

      setState("idle");
    },
    [addMessage],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      addMessage(userMsg);
      setInput("");

      // Step 1: Check for ambiguity via /api/clarify
      setState("clarifying");

      try {
        const clarifyRes = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            strategy: options.strategy,
            entropyThreshold: options.entropyThreshold,
          }),
        });

        if (!clarifyRes.ok || !clarifyRes.body) {
          throw new Error("Clarify request failed");
        }

        // Stream-parse NDJSON: thinking tokens append to the user message in
        // real time; the final result event terminates the loop.
        const reader = clarifyRes.body.getReader();
        const decoder = new TextDecoder();
        let lineBuf = "";
        let clarifyData: ClarifyResultData | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuf += decoder.decode(value, { stream: true });
          const lines = lineBuf.split("\n");
          lineBuf = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.type === "thinking" && typeof parsed.text === "string") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === userMsg.id
                      ? { ...m, thinking: (m.thinking ?? "") + parsed.text }
                      : m,
                  ),
                );
              } else if (parsed.type === "result") {
                clarifyData = parsed.data as ClarifyResultData;
              }
            } catch {
              // ignore malformed lines (shouldn't happen with our framing)
            }
          }
        }

        if (!clarifyData) {
          throw new Error("No result event received from clarify stream");
        }

        if (
          clarifyData.shouldClarify &&
          (clarifyData.clarifyingQuestion || clarifyData.interpretations?.length)
        ) {
          // Update the user message with the entropy
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsg.id ? { ...m, entropy: clarifyData.debug?.entropy } : m,
            ),
          );

          // Show clarification modal
          setPendingClarification({
            clarifyingQuestion: clarifyData.clarifyingQuestion,
            interpretations: clarifyData.interpretations,
            entropy: clarifyData.debug?.entropy,
            messageId: userMsg.id,
            originalMessage: content,
          });
          setState("idle");
          return;
        }

        // Update the user message with the entropy if no clarification is needed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id ? { ...m, entropy: clarifyData.debug?.entropy } : m,
          ),
        );

        // No clarification needed - stream LLM response
        const chatMessages = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }));
        chatMessages.push({ role: "user", content });

        await streamResponse(chatMessages);
      } catch {
        setState("idle");
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Error: Could not reach the clarification service.",
        });
      }
    },
    [addMessage, messages, options.strategy, options.entropyThreshold, streamResponse],
  );

  const submitClarification = useCallback(
    async (answer: string) => {
      if (!answer.trim() || !pendingClarification) return;

      const { messageId, originalMessage } = pendingClarification;
      setPendingClarification(null);

      // Build enriched context with the original message + clarification
      const enrichedContent = `${originalMessage}\n\nClarification: ${answer}`;

      // Modify the original user message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: enrichedContent } : m,
        ),
      );

      const chatMessages = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.id === messageId ? enrichedContent : m.content,
        }));

      await streamResponse(chatMessages);
    },
    [messages, streamResponse, pendingClarification],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState("idle");
  }, []);

  return {
    messages,
    state,
    input,
    setInput,
    sendMessage,
    submitClarification,
    stop,
    isPendingClarification: pendingClarification !== null,
    pendingClarification,
  };
}
