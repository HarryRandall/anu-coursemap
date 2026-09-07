import { readAssistantHistory } from "./history";
import type { AssistantDraft } from "./history";

const empty: AssistantDraft[] = [];

export function createAssistantDraftStore(key: string) {
  let snapshot = empty;
  let loaded = false;
  const listeners = new Set<() => void>();
  function getSnapshot() {
    if (!loaded && typeof window !== "undefined") {
      try {
        snapshot = readAssistantHistory(localStorage.getItem(key));
      } catch {
        snapshot = empty;
      }
      loaded = true;
    }
    return snapshot;
  }
  function notify() {
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot,
    getServerSnapshot: () => empty,
    subscribe(listener: () => void) {
      listeners.add(listener);
      function onStorage(event: StorageEvent) {
        if (event.key === key || event.key === null) {
          loaded = false;
          getSnapshot();
          notify();
        }
      }
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    update(change: (previous: AssistantDraft[]) => AssistantDraft[]) {
      snapshot = change(getSnapshot());
      try {
        localStorage.setItem(key, JSON.stringify(snapshot));
      } catch {
        /* Keep the current draft usable if browser storage is unavailable. */
      }
      notify();
    },
  };
}
