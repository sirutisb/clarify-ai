"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Send,
  Square,
  Bot,
  User,
  HelpCircle,
  Loader2,
  Brain,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

function ThinkingBlock({
  thinking,
  isStreaming,
}: {
  thinking: string;
  isStreaming?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-expand while streaming so the user sees the reasoning live.
  useEffect(() => {
    if (isStreaming) setIsExpanded(true);
  }, [isStreaming]);

  // Keep the thinking pane scrolled to the latest token while streaming.
  useEffect(() => {
    if (isStreaming && isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, isStreaming, isExpanded]);

  if (!thinking) return null;

  return (
    <div className="mb-1 w-full rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        <Brain className="size-3" />
        <span>Ambiguity Analysis{isStreaming ? "…" : ""}</span>
        {isStreaming && <Loader2 className="size-3 animate-spin ml-auto" />}
      </button>
      {isExpanded && (
        <div
          ref={scrollRef}
          className="px-3 pb-2 pt-2 text-xs text-purple-700 dark:text-purple-300 whitespace-pre-wrap border-t border-purple-200/50 dark:border-purple-800/30 max-h-80 overflow-y-auto"
        >
          {thinking}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isClarifying,
}: {
  message: ChatMessage;
  isClarifying?: boolean;
}) {
  if (message.role === "clarification") {
    return (
      <div className="flex gap-3 justify-start">
        <Avatar size="sm">
          <AvatarFallback>
            <HelpCircle className="size-3.5" />
          </AvatarFallback>
        </Avatar>
        <div className="max-w-[80%] space-y-2">
          <Badge variant="outline" className="text-xs">
            Clarification needed
          </Badge>
          <Card className="bg-amber-50 dark:bg-amber-950/30 ring-amber-200 dark:ring-amber-800">
            <CardContent className="py-2">
              {message.clarifyingQuestions?.map((q, i) => (
                <p key={i} className="text-sm">
                  {q}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <Avatar size="sm">
          <AvatarFallback>
            <Bot className="size-3.5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
        <div
          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                a: ({ children, href }) => <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">{children}</a>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-md font-bold mb-2">{children}</h3>,
                pre: ({ children }) => <pre className="bg-black/10 dark:bg-white/10 p-3 rounded-md my-2 overflow-x-auto">{children}</pre>,
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match && !className;
                  return isInline ? (
                    <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        {isUser && message.thinking && (
          <ThinkingBlock thinking={message.thinking} isStreaming={isClarifying} />
        )}
        {message.entropy !== undefined && (
          <span className="text-[10px] text-muted-foreground font-medium px-1">
            Entropy: {message.entropy.toFixed(3)}
          </span>
        )}
      </div>
      {isUser && (
        <Avatar size="sm">
          <AvatarFallback>
            <User className="size-3.5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export function Chat() {
  const [strategy, setStrategy] = useState("reasoning");
  const [entropyThreshold, setEntropyThreshold] = useState(0.5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const {
    messages,
    state,
    input,
    setInput,
    sendMessage,
    submitClarification,
    stop,
    isPendingClarification,
    pendingClarification,
  } = useChat({ strategy, entropyThreshold });

  const [clarificationAnswer, setClarificationAnswer] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage(input);
    setInput("");
  };

  const handleClarificationSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!clarificationAnswer.trim()) return;
    submitClarification(clarificationAnswer);
    setClarificationAnswer("");
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Clarify AI</h1>
          <Badge variant="secondary" className="text-xs">
            {strategy}
          </Badge>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Entropy Threshold: {entropyThreshold.toFixed(2)}
            </span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={entropyThreshold}
              onChange={(e) => setEntropyThreshold(parseFloat(e.target.value))}
              className="w-32 accent-primary cursor-pointer"
            />
          </div>
          {mounted ? (
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reasoning">Reasoning</SelectItem>
                <SelectItem value="intent-sim">Intent-Sim</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="w-[180px] h-8 rounded-lg border border-input bg-transparent" />
          )}
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6" ref={scrollRef}>
        <div className="mx-auto max-w-3xl space-y-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
              <Bot className="size-10 opacity-50" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">
                Ambiguous prompts will be caught and clarified before responding.
              </p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isLastUser =
              msg.role === "user" &&
              state === "clarifying" &&
              idx === messages.length - 1;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isClarifying={isLastUser}
              />
            );
          })}
          {state === "clarifying" && !messages[messages.length - 1]?.thinking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Analyzing prompt for ambiguity...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={state === "clarifying" || state === "streaming" || isPendingClarification}
            className="h-10"
          />
          {state === "streaming" ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={stop}
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || state === "clarifying" || isPendingClarification}
            >
              <Send className="size-4" />
            </Button>
          )}
        </form>
      </div>

      <Dialog open={isPendingClarification} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Clarification Needed</DialogTitle>
            {pendingClarification?.clarifyingQuestion && (
              <DialogDescription className="text-foreground text-sm pt-1">
                {pendingClarification.clarifyingQuestion}
              </DialogDescription>
            )}
          </DialogHeader>

          {pendingClarification?.interpretations && pendingClarification.interpretations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Clarify your interpretation:
              </p>
              <ul className="space-y-1">
                {pendingClarification.interpretations.map((it, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-foreground">{it.text}</span>
                    <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0 pt-0.5">
                      {(it.prob * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendingClarification?.entropy !== undefined && (
            <p className="text-[10px] text-muted-foreground font-medium">
              Entropy: {pendingClarification.entropy.toFixed(3)}
            </p>
          )}

          <form onSubmit={handleClarificationSubmit}>
            <div className="py-2">
              <Input
                autoFocus
                value={clarificationAnswer}
                onChange={(e) => setClarificationAnswer(e.target.value)}
                placeholder="Type your answer here..."
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!clarificationAnswer.trim()}>
                Continue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
