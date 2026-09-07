"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@coursemap/ui/primitives/button";
import { assistantTitle } from "@/lib/assistant/history";
import { useAssistant } from "./assistant-provider";

export function AssistantHistory({ onSelect }: { onSelect?: () => void }) {
  const { chats, active, select, remove } = useAssistant();
  const drafts = chats.filter((chat) => chat.messages.length > 0);
  return (
    <div className="space-y-1">
      {!drafts.length ? (
        <p className="px-3 py-5 text-sm text-muted-foreground">No chats yet</p>
      ) : null}
      {drafts.map((chat) => (
        <div key={chat.id} className="group flex min-w-0 items-center gap-1">
          <Button
            variant={active?.id === chat.id ? "secondary" : "ghost"}
            className="min-w-0 flex-1 justify-start"
            onClick={() => {
              select(chat.id);
              onSelect?.();
            }}
          >
            <MessageSquare aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{assistantTitle(chat)}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${assistantTitle(chat)}`}
            onClick={() => remove(chat.id)}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      ))}
      {drafts.length ? (
        <p className="px-3 pt-3 text-xs text-muted-foreground">
          Saved on this browser
        </p>
      ) : null}
    </div>
  );
}
