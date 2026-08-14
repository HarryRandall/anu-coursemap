"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Attempt,
  AttemptStatus,
  courseOccurrenceLimit,
  initialAttempts,
} from "@/lib/catalogue";

type Profile = {
  name: string;
  studentId: string;
  email: string;
  commencementYear: number;
  catalogueYear: number;
  degreeCode: string;
  majorCode: string;
  studyLoad: "Full time" | "Part time";
};

type AppState = {
  schemaVersion: 1;
  profile: Profile;
  attempts: Attempt[];
};

type ToastTone = "success" | "warning";
type Toast = { message: string; tone: ToastTone };

type AppContextValue = {
  state: AppState;
  ready: boolean;
  updateProfile: (profile: Partial<Profile>) => void;
  addCourse: (courseCode: string, termId: string) => { ok: boolean; message: string };
  reorderAttempt: (attemptId: string, termId: string, beforeAttemptId?: string) => void;
  updateAttempt: (attemptId: string, status: AttemptStatus, mark?: number) => void;
  removeAttempt: (attemptId: string) => { ok: boolean; message: string };
  togglePermission: (attemptId: string) => void;
  toggleOverloadApproval: (attemptId: string) => void;
  resetDemo: () => void;
  toast: Toast | null;
  notify: (message: string, tone?: ToastTone) => void;
};

const STORAGE_KEY = "coursemap.demo.v1";

const statusPriority: Record<AttemptStatus, number> = {
  completed: 4,
  enrolled: 3,
  planned: 2,
  failed: 1,
};

function normaliseAttempts(attempts: Attempt[]) {
  const selected = new Map<string, Attempt[]>();

  attempts.forEach((attempt) => {
    const current = selected.get(attempt.courseCode) ?? [];
    const limit = courseOccurrenceLimit(attempt.courseCode);

    if (current.length < limit) {
      selected.set(attempt.courseCode, [...current, attempt]);
      return;
    }

    const lowestPriority = current.reduce(
      (lowest, item, index) =>
        statusPriority[item.status] < statusPriority[current[lowest].status] ? index : lowest,
      0,
    );
    if (statusPriority[attempt.status] > statusPriority[current[lowestPriority].status]) {
      const replacement = [...current];
      replacement[lowestPriority] = attempt;
      selected.set(attempt.courseCode, replacement);
    }
  });

  const selectedIds = new Set([...selected.values()].flat().map((attempt) => attempt.id));
  return attempts.filter((attempt) => selectedIds.has(attempt.id));
}

const defaultState: AppState = {
  schemaVersion: 1,
  profile: {
    name: "Harry Student",
    studentId: "u7499609",
    email: "harry.student@anu.edu.au",
    commencementYear: 2026,
    catalogueYear: 2026,
    degreeCode: "BCOMP",
    majorCode: "SOFT-MAJ",
    studyLoad: "Full time",
  },
  attempts: normaliseAttempts(initialAttempts),
};

const AppContext = createContext<AppContextValue | null>(null);

function isValidStoredState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppState>;
  return (
    candidate.schemaVersion === 1 &&
    Boolean(candidate.profile) &&
    Array.isArray(candidate.attempts)
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidStoredState(parsed)) {
          window.queueMicrotask(() => {
            if (!cancelled) {
              setState({ ...parsed, attempts: normaliseAttempts(parsed.attempts) });
            }
          });
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      window.queueMicrotask(() => {
        if (!cancelled) setReady(true);
      });
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateProfile = useCallback((profile: Partial<Profile>) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, ...profile },
    }));
  }, []);

  const addCourse = useCallback((courseCode: string, termId: string) => {
    let result = { ok: true, message: `${courseCode} added to the plan` };
    setState((current) => {
      const occurrenceCount = current.attempts.filter(
        (attempt) => attempt.courseCode === courseCode,
      ).length;
      if (occurrenceCount >= courseOccurrenceLimit(courseCode)) {
        result = { ok: false, message: `${courseCode} is already in your plan` };
        return current;
      }
      const id = `a-${courseCode.toLowerCase()}-${termId}-${current.attempts.length + 1}`;
      return {
        ...current,
        attempts: [
          ...current.attempts,
          { id, courseCode, termId, status: "planned" },
        ],
      };
    });
    return result;
  }, []);

  const reorderAttempt = useCallback(
    (attemptId: string, termId: string, beforeAttemptId?: string) => {
      setState((current) => {
        const moving = current.attempts.find((attempt) => attempt.id === attemptId);
        if (!moving || beforeAttemptId === attemptId) return current;

        const remaining = current.attempts.filter((attempt) => attempt.id !== attemptId);
        const next = { ...moving, termId };
        const beforeIndex = beforeAttemptId
          ? remaining.findIndex((attempt) => attempt.id === beforeAttemptId)
          : -1;

        if (beforeIndex >= 0) {
          remaining.splice(beforeIndex, 0, next);
        } else {
          let insertAt = remaining.length;
          for (let index = remaining.length - 1; index >= 0; index -= 1) {
            if (remaining[index].termId === termId) {
              insertAt = index + 1;
              break;
            }
          }
          remaining.splice(insertAt, 0, next);
        }

        return { ...current, attempts: remaining };
      });
    },
    [],
  );

  const updateAttempt = useCallback(
    (attemptId: string, status: AttemptStatus, mark?: number) => {
      setState((current) => ({
        ...current,
        attempts: current.attempts.map((attempt) =>
          attempt.id === attemptId
            ? {
                ...attempt,
                status,
                mark:
                  status === "completed"
                    ? mark ?? attempt.mark ?? 68
                    : status === "failed"
                      ? mark ?? attempt.mark ?? 42
                      : undefined,
              }
            : attempt,
        ),
      }));
    },
    [],
  );

  const removeAttempt = useCallback((attemptId: string) => {
    let result = { ok: true, message: "Course removed from the plan" };
    setState((current) => {
      const attempt = current.attempts.find((item) => item.id === attemptId);
      if (attempt?.status === "completed" || attempt?.status === "failed") {
        result = { ok: false, message: "Recorded attempts stay in your academic history" };
        return current;
      }
      if (attempt) result = { ok: true, message: `${attempt.courseCode} removed from the plan` };
      return {
        ...current,
        attempts: current.attempts.filter((item) => item.id !== attemptId),
      };
    });
    return result;
  }, []);

  const togglePermission = useCallback((attemptId: string) => {
    setState((current) => ({
      ...current,
      attempts: current.attempts.map((attempt) =>
        attempt.id === attemptId
          ? { ...attempt, permissionApproved: !attempt.permissionApproved }
          : attempt,
      ),
    }));
  }, []);

  const toggleOverloadApproval = useCallback((attemptId: string) => {
    setState((current) => ({
      ...current,
      attempts: current.attempts.map((attempt) =>
        attempt.id === attemptId
          ? { ...attempt, overloadApproved: !attempt.overloadApproved }
          : attempt,
      ),
    }));
  }, []);

  const resetDemo = useCallback(() => setState(defaultState), []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      ready,
      updateProfile,
      addCourse,
      reorderAttempt,
      updateAttempt,
      removeAttempt,
      togglePermission,
      toggleOverloadApproval,
      resetDemo,
      toast,
      notify,
    }),
    [
      state,
      ready,
      updateProfile,
      addCourse,
      reorderAttempt,
      updateAttempt,
      removeAttempt,
      togglePermission,
      toggleOverloadApproval,
      resetDemo,
      toast,
      notify,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl bg-white p-3.5 text-zinc-900 shadow-lg ring-1 ring-zinc-200 animate-toast-in sm:right-6 sm:top-6"
        >
          <span
            aria-hidden="true"
            className={
              toast.tone === "warning"
                ? "grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100"
                : "grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100"
            }
          >
            {toast.tone === "warning" ? (
              <AlertTriangle size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold">
              {toast.tone === "warning" ? "Action needed" : "Plan updated"}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">
              {toast.message}
            </span>
          </span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
            className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useCoursemap() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useCoursemap must be used within AppProvider");
  return context;
}
