"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  useState,
  useRef,
  useEffect,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { loadAssistantModels } from "@/lib/assistant/model-actions";
import { createAssistantDraftStore } from "@/lib/assistant/draft-store";
import { assistantMockResponse } from "@/lib/assistant/history";
import type { AssistantDraft } from "@/lib/assistant/history";

type ModelCatalogue = Awaited<ReturnType<typeof loadAssistantModels>>;

type AssistantState = {
  streaming: { id: string; length: number } | null;
  catalogue: ModelCatalogue | null;
  loadModels: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  returnPath: string;
  setReturnPath: (path: string) => void;
  chats: AssistantDraft[];
  active: AssistantDraft | undefined;
  select: (id: string) => void;
  newChat: () => void;
  update: (patch: Partial<Pick<AssistantDraft, "draft" | "model">>) => void;
  send: () => void;
  remove: (id: string) => void;
  rename: (id: string, title: string) => void;
};
const AssistantContext = createContext<AssistantState | null>(null);

export function AssistantProvider({
  children,
  owner,
}: {
  children: ReactNode;
  owner: string | null;
}) {
  const [streaming, setStreaming] = useState<{
    id: string;
    length: number;
  } | null>(null);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
    },
    [],
  );
  const [catalogue, setCatalogue] = useState<ModelCatalogue | null>(null);
  const modelRequest = useRef<Promise<void> | null>(null);
  const loadModels = useCallback(() => {
    if (modelRequest.current) return;
    modelRequest.current = loadAssistantModels()
      .then(setCatalogue)
      .catch(() => {
        modelRequest.current = null;
        setCatalogue({
          models: [],
          defaultModel: "",
          error:
            "The models could not be loaded. Reopen the assistant to retry.",
        });
      });
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const routeId =
    pathname.startsWith("/compass/") && pathname !== "/compass/usage"
      ? pathname.split("/")[2]
      : undefined;
  const [panelOpen, setPanelOpen] = useState(false);
  const [returnPath, setReturnPath] = useState("/dashboard");
  const key = `coursemap:compass:drafts:${owner ?? "guest"}`;
  const store = useMemo(() => createAssistantDraftStore(key), [key]);
  const chats = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [selected, setSelected] = useState<string | null | undefined>(
    undefined,
  );
  const selectedId = routeId
    ? routeId === "new"
      ? null
      : routeId
    : selected === undefined
      ? chats[0]?.id
      : selected;
  const active = chats.find((chat) => chat.id === selectedId);
  const update = useCallback(
    (patch: Partial<Pick<AssistantDraft, "draft" | "model">>) => {
      const id = selectedId ?? crypto.randomUUID();
      store.update((previous) => {
        const chat = previous.find((entry) => entry.id === id) ?? {
          id,
          draft: "",
          model: "",
          updatedAt: "",
          messages: [],
        };
        return [
          {
            ...chat,
            ...patch,
            updatedAt: chat.updatedAt || new Date().toISOString(),
          },
          ...previous.filter((entry) => entry.id !== id),
        ].slice(0, 50);
      });
      setSelected(id);
      if (routeId === "new") router.replace(`/compass/${id}`);
    },
    [selectedId, store, routeId, router],
  );
  return (
    <AssistantContext.Provider
      value={{
        streaming,
        catalogue,
        loadModels,
        panelOpen,
        setPanelOpen,
        returnPath,
        setReturnPath,
        chats,
        active,
        select: (id) => {
          setSelected(id);
          if (pathname.startsWith("/compass/")) router.push(`/compass/${id}`);
        },
        newChat: () => {
          setSelected(null);
          if (pathname.startsWith("/compass/")) router.push("/compass/new");
        },
        update,
        send: () => {
          if (!selectedId || streaming || !active?.draft.trim()) return;
          const replyId = crypto.randomUUID();
          const response = assistantMockResponse(
            active.draft,
            active.messages.filter((message) => message.role === "assistant")
              .length,
          );
          const words = response.match(/\S+\s*/gu) ?? [];
          let word = 0;
          let length = 0;
          const startedAt = Date.now();
          setStreaming({ id: replyId, length });
          streamTimer.current = setInterval(() => {
            if (Date.now() - startedAt < 900) return;
            length += words[word++]?.length ?? 0;
            if (word > words.length) {
              if (streamTimer.current) clearInterval(streamTimer.current);
              streamTimer.current = null;
              setStreaming(null);
            } else setStreaming({ id: replyId, length });
          }, 35);
          store.update((previous) =>
            previous.map((chat) => {
              if (chat.id !== selectedId || !chat.draft.trim()) return chat;
              return {
                ...chat,
                draft: "",
                updatedAt: new Date().toISOString(),
                messages: [
                  ...chat.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "user" as const,
                    text: chat.draft.trim(),
                  },
                  {
                    id: replyId,
                    role: "assistant" as const,
                    text: response,
                  },
                ],
              };
            }),
          );
        },
        rename: (id, title) => {
          const name = title.trim().replace(/\s+/g, " ").slice(0, 64);
          if (!name) return;
          store.update((previous) =>
            previous.map((chat) =>
              chat.id === id ? { ...chat, title: name } : chat,
            ),
          );
        },
        remove: (id) => {
          store.update((previous) => previous.filter((chat) => chat.id !== id));
          if (selectedId === id) {
            setSelected(null);
            if (routeId) router.replace("/compass/new");
          }
        },
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("The Compass provider is missing.");
  return value;
}
