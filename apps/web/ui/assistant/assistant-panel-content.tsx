"use client";

import { Maximize2, Minimize2, Plus, X } from "lucide-react";
import { Button } from "@coursemap/ui/primitives/button";
import { AssistantChatPicker } from "./assistant-chat-picker";
import { AssistantIcon } from "./assistant-icon";
import { useAssistant } from "./assistant-provider";
import { AssistantConversation } from "./assistant-conversation";
import { AssistantComposer } from "./assistant-composer";

const suggestions = [
  "Which courses can I take next semester?",
  "What requirements do I still need to meet?",
  "Help me organise my degree plan",
];

export function AssistantPanelContent({
  expanded,
  hideHeader = false,
  onExpand,
  onClose,
}: {
  expanded: boolean;
  hideHeader?: boolean;
  onExpand: () => void;
  onClose: () => void;
}) {
  const { active, update, newChat, send } = useAssistant();
  const draft = active?.draft ?? "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      {!hideHeader && (
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <AssistantChatPicker />
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New chat"
              onClick={newChat}
            >
              <Plus aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"

              aria-label={expanded ? "Dock assistant" : "Expand assistant"}
              onClick={onExpand}
            >
              {expanded ? (
                <Minimize2 aria-hidden="true" />
              ) : (
                <Maximize2 aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close assistant"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </header>
      )}
      {active?.messages.length ? (
        <AssistantConversation messages={active.messages} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-8">
          <div className="my-auto flex w-full max-w-sm flex-col items-center gap-5 text-center">
            <AssistantIcon className="size-8" />
            <div className="space-y-2">
              <h3 className="text-base font-medium">How can I help?</h3>
              <p className="text-sm text-muted-foreground">
                Ask about your courses or degree plan.
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-auto max-w-full py-2 text-left whitespace-normal"
                  onClick={() => update({ draft: suggestion })}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-3xl">
        <AssistantComposer
          onSend={send}
          model={active?.model ?? ""}
          onModelChange={(model) => update({ model })}
          draft={draft}
          onDraftChange={(draft) => update({ draft })}
        />
      </div>
    </div>
  );
}
