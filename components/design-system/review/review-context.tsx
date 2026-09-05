"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  emptyComponentReviewFile,
  type ComponentReviewDecision,
  type ComponentReviewFile,
  type ComponentReviewItem,
  type ComponentReviewRecord,
  type ComponentReviewSource,
} from "./review-types";

export type ComponentReviewFilter =
  "all" | "unreviewed" | ComponentReviewDecision;
export type ComponentReviewSourceFilter = "all" | ComponentReviewSource;

type SaveStatus = "loading" | "idle" | "saving" | "error";

type ComponentReviewContextValue = {
  decisions: Record<string, ComponentReviewRecord>;
  items: readonly ComponentReviewItem[];
  saveStatus: SaveStatus;
  error: string | null;
  setDecision: (
    item: ComponentReviewItem,
    decision: ComponentReviewDecision | null,
  ) => void;
  registerItem: (item: ComponentReviewItem) => void;
};

const ComponentReviewContext =
  createContext<ComponentReviewContextValue | null>(null);

export function useComponentReview() {
  const context = useContext(ComponentReviewContext);
  if (!context) {
    throw new Error(
      "useComponentReview must be used inside ComponentReviewProvider",
    );
  }
  return context;
}

export function ComponentReviewProvider({
  items,
  children,
}: {
  items: readonly ComponentReviewItem[];
  children: ReactNode;
}) {
  const [review, setReview] = useState<ComponentReviewFile>(
    emptyComponentReviewFile,
  );
  const [loading, setLoading] = useState(true);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [registeredItems, setRegisteredItems] = useState(() =>
    Object.fromEntries(items.map((item) => [item.id, item])),
  );
  const saveQueue = useRef(Promise.resolve());

  const registerItem = useCallback((item: ComponentReviewItem) => {
    setRegisteredItems((current) =>
      current[item.id] ? current : { ...current, [item.id]: item },
    );
  }, []);

  const allItems = useMemo(
    () => Object.values(registeredItems),
    [registeredItems],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadReview() {
      try {
        const response = await fetch("/api/design-system/review", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load your review");
        const next = (await response.json()) as ComponentReviewFile;
        setReview(next);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load your review",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadReview();
    return () => controller.abort();
  }, []);

  const setDecision = useCallback(
    (item: ComponentReviewItem, decision: ComponentReviewDecision | null) => {
      const updatedAt = new Date().toISOString();
      setError(null);
      setReview((current) => {
        const decisions = { ...current.decisions };
        if (decision === null) {
          delete decisions[item.id];
        } else {
          decisions[item.id] = { ...item, decision, updatedAt };
        }
        return { version: 1, updatedAt, decisions };
      });
      setPendingSaves((count) => count + 1);

      const save = async () => {
        const response = await fetch("/api/design-system/review", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item, decision }),
        });
        if (!response.ok) throw new Error("Could not save your review");
      };

      const pending = saveQueue.current.catch(() => {}).then(save);
      saveQueue.current = pending;
      void pending
        .catch((saveError) => {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "Could not save your review",
          );
        })
        .finally(() => setPendingSaves((count) => Math.max(0, count - 1)));
    },
    [],
  );

  const saveStatus: SaveStatus = loading
    ? "loading"
    : error
      ? "error"
      : pendingSaves > 0
        ? "saving"
        : "idle";

  const value = useMemo(
    () => ({
      decisions: review.decisions,
      items: allItems,
      saveStatus,
      error,
      setDecision,
      registerItem,
    }),
    [allItems, error, registerItem, review.decisions, saveStatus, setDecision],
  );

  return (
    <ComponentReviewContext.Provider value={value}>
      {children}
    </ComponentReviewContext.Provider>
  );
}

export function componentMatchesReviewFilters(
  item: ComponentReviewItem,
  decision: ComponentReviewDecision | undefined,
  decisionFilter: ComponentReviewFilter,
  sourceFilter: ComponentReviewSourceFilter,
) {
  const matchesDecision =
    decisionFilter === "all" ||
    (decisionFilter === "unreviewed"
      ? decision === undefined
      : decision === decisionFilter);
  const matchesSource = sourceFilter === "all" || item.source === sourceFilter;
  return matchesDecision && matchesSource;
}
