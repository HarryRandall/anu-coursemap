"use client";

import { useEffect, useRef } from "react";
import type { AssistantMessage } from "@/lib/assistant/history";
import { useAssistant } from "./assistant-provider";
import { LoaderCircle } from "lucide-react";
import styles from "./assistant-conversation.module.css";
import { cn } from "@/lib/cn";

export function AssistantConversation({
  messages,
}: {
  messages: AssistantMessage[];
}) {
  const { streaming } = useAssistant();
  const follow = useRef(true);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (follow.current) end.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, streaming?.length]);
  return (
    <div
      onScroll={(event) => {
        const el = event.currentTarget;
        follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      aria-busy={Boolean(streaming)}
      className="min-h-0 flex-1 overflow-y-auto px-5 py-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap",
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-3"
                : "w-full py-2",
            )}
          >
            <span className="sr-only">
              {message.role === "user" ? "You: " : "Compass: "}
            </span>
            {streaming?.id === message.id ? (
              streaming.length === 0 ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                  Thinking...
                </span>
              ) : (
                message.text
                  .slice(0, streaming.length)
                  .match(/\S+\s*/gu)
                  ?.map((word, index) => (
                    <span key={index} className={styles.word}>
                      {word}
                    </span>
                  ))
              )
            ) : (
              message.text
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
    </div>
  );
}
