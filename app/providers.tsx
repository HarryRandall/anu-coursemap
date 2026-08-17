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
  type Attempt,
  type AttemptStatus,
  initialAttempts,
} from "@/lib/catalogue";
import type { AuthViewer } from "@/lib/auth/viewer";
import {
  addPlanCourse,
  movePlanCourse,
  recordCourseAttempt,
  removePlanCourse,
  saveProfileAndPlan,
  type CoursemapActionResult,
} from "@/lib/coursemap/actions";

export type Profile = {
  name: string;
  studentId: string;
  email: string;
  commencementYear: number;
  catalogueYear: number;
  degreeCode: string;
  majorCode: string;
  studyLoad: "Full time" | "Part time";
};

export type AppState = {
  schemaVersion: 1;
  profile: Profile;
  attempts: Attempt[];
};

type ToastTone = "success" | "warning";
type Toast = { message: string; tone: ToastTone };

type AppContextValue = {
  state: AppState;
  ready: boolean;
  demoMode: boolean;
  canAccessAdmin: boolean;
  updateProfile: (profile: Partial<Profile>) => Promise<CoursemapActionResult>;
  addCourse: (
    courseCode: string,
    termId: string,
  ) => Promise<CoursemapActionResult>;
  reorderAttempt: (
    attemptId: string,
    termId: string,
    beforeAttemptId?: string,
  ) => Promise<CoursemapActionResult>;
  updateAttempt: (
    attemptId: string,
    status: AttemptStatus,
    mark?: number,
  ) => Promise<CoursemapActionResult>;
  removeAttempt: (attemptId: string) => Promise<CoursemapActionResult>;
  togglePermission: (attemptId: string) => void;
  toggleOverloadApproval: (attemptId: string) => void;
  resetDemo: () => void;
  toast: Toast | null;
  notify: (message: string, tone?: ToastTone) => void;
};

const DEMO_STORAGE_KEY = "coursemap.demo.v1";

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
    const limit = 1;

    if (current.length < limit) {
      selected.set(attempt.courseCode, [...current, attempt]);
      return;
    }

    const lowestPriority = current.reduce(
      (lowest, item, index) =>
        statusPriority[item.status] < statusPriority[current[lowest].status]
          ? index
          : lowest,
      0,
    );
    if (
      statusPriority[attempt.status] >
      statusPriority[current[lowestPriority].status]
    ) {
      const replacement = [...current];
      replacement[lowestPriority] = attempt;
      selected.set(attempt.courseCode, replacement);
    }
  });

  const selectedIds = new Set(
    [...selected.values()].flat().map((attempt) => attempt.id),
  );
  return attempts.filter((attempt) => selectedIds.has(attempt.id));
}

function createDemoState(): AppState {
  return {
    schemaVersion: 1,
    profile: {
      name: "Harry Student",
      studentId: "u7499609",
      email: "harry.student@anu.edu.au",
      commencementYear: new Date().getFullYear(),
      catalogueYear: new Date().getFullYear(),
      degreeCode: "",
      majorCode: "",
      studyLoad: "Full time",
    },
    attempts: normaliseAttempts(initialAttempts),
  };
}

function createInitialState(demoMode: boolean, viewer: AuthViewer | null) {
  if (demoMode) return createDemoState();

  return {
    schemaVersion: 1,
    profile: {
      name: "",
      studentId: "",
      email: viewer?.email ?? "",
      commencementYear: new Date().getFullYear(),
      catalogueYear: new Date().getFullYear(),
      degreeCode: "",
      majorCode: "",
      studyLoad: "Full time",
    },
    attempts: [],
  } satisfies AppState;
}

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

export function AppProvider({
  children,
  demoMode,
  viewer,
  canAccessAdmin,
  initialState: suppliedInitialState,
}: {
  children: React.ReactNode;
  demoMode: boolean;
  viewer: AuthViewer | null;
  canAccessAdmin: boolean;
  initialState?: AppState;
}) {
  const initialState = useMemo(
    () => suppliedInitialState ?? createInitialState(demoMode, viewer),
    [demoMode, suppliedInitialState, viewer],
  );
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!demoMode) {
      window.queueMicrotask(() => {
        if (!cancelled) {
          setState(initialState);
          setReady(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    try {
      const stored = window.localStorage.getItem(DEMO_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidStoredState(parsed)) {
          window.queueMicrotask(() => {
            if (!cancelled) {
              setState({
                ...parsed,
                attempts: normaliseAttempts(parsed.attempts),
              });
            }
          });
        }
      }
    } catch {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
    } finally {
      window.queueMicrotask(() => {
        if (!cancelled) setReady(true);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [demoMode, initialState]);

  useEffect(() => {
    if (demoMode && ready) {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    }
  }, [demoMode, ready, state]);

  useEffect(() => {
    if (!viewer) return;

    const refreshRestoredPage = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", refreshRestoredPage);
    return () => window.removeEventListener("pageshow", refreshRestoredPage);
  }, [viewer]);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateProfile = useCallback(
    async (profile: Partial<Profile>) => {
      const nextProfile = { ...state.profile, ...profile };
      if (!demoMode) {
        const result = await saveProfileAndPlan(nextProfile);
        if (!result.ok) return result;
      }
      setState((current) => ({ ...current, profile: nextProfile }));
      return { ok: true, message: "Profile and academic plan saved" };
    },
    [demoMode, state.profile],
  );

  const addCourse = useCallback(
    async (courseCode: string, termId: string) => {
      const occurrenceCount = state.attempts.filter(
        (attempt) => attempt.courseCode === courseCode,
      ).length;
      if (occurrenceCount >= 1) {
        return { ok: false, message: `${courseCode} is already in your plan` };
      }
      const result = demoMode
        ? {
            ok: true,
            id: `a-${courseCode.toLowerCase()}-${termId}-${state.attempts.length + 1}`,
            message: `${courseCode} added to the plan`,
          }
        : await addPlanCourse(courseCode, termId);
      if (!result.ok || !result.id) return result;
      setState((current) => ({
        ...current,
        attempts: [
          ...current.attempts,
          { id: result.id!, courseCode, termId, status: "planned" },
        ],
      }));
      return result;
    },
    [demoMode, state.attempts],
  );

  const reorderAttempt = useCallback(
    async (attemptId: string, termId: string, beforeAttemptId?: string) => {
      const previousAttempts = state.attempts;
      setState((current) => {
        const moving = current.attempts.find(
          (attempt) => attempt.id === attemptId,
        );
        if (!moving || beforeAttemptId === attemptId) return current;

        const remaining = current.attempts.filter(
          (attempt) => attempt.id !== attemptId,
        );
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
      if (demoMode) return { ok: true, message: "Course moved" };
      const result = await movePlanCourse(attemptId, termId, beforeAttemptId);
      if (!result.ok) {
        setState((current) => ({ ...current, attempts: previousAttempts }));
      }
      return result;
    },
    [demoMode, state.attempts],
  );

  const updateAttempt = useCallback(
    async (attemptId: string, status: AttemptStatus, mark?: number) => {
      const attempt = state.attempts.find((item) => item.id === attemptId);
      if (!attempt) return { ok: false, message: "Course was not found" };
      if (!demoMode && attempt.status !== "planned") {
        return {
          ok: false,
          message: "Recorded attempts stay in your academic history",
        };
      }
      if (!demoMode && status === "planned") {
        return {
          ok: false,
          message: "Recorded attempts stay in your academic history",
        };
      }
      const savedMark =
        status === "completed"
          ? demoMode
            ? (mark ?? attempt.mark ?? 68)
            : mark
          : status === "failed"
            ? demoMode
              ? (mark ?? attempt.mark ?? 42)
              : mark
            : undefined;
      const result =
        !demoMode && status !== "planned"
          ? await recordCourseAttempt(attemptId, status, savedMark)
          : { ok: true, id: attemptId, message: "Academic history updated" };
      if (!result.ok) return result;
      setState((current) => ({
        ...current,
        attempts: current.attempts.map((attempt) =>
          attempt.id === attemptId
            ? {
                ...attempt,
                id: result.id ?? attempt.id,
                status,
                mark: savedMark,
              }
            : attempt,
        ),
      }));
      return result;
    },
    [demoMode, state.attempts],
  );

  const removeAttempt = useCallback(
    async (attemptId: string) => {
      const attempt = state.attempts.find((item) => item.id === attemptId);
      if (attempt?.status === "completed" || attempt?.status === "failed") {
        return {
          ok: false,
          message: "Recorded attempts stay in your academic history",
        };
      }
      if (!attempt) return { ok: false, message: "Course was not found" };
      const result = demoMode
        ? {
            ok: true,
            message: `${attempt.courseCode} removed from the plan`,
          }
        : await removePlanCourse(attemptId);
      if (!result.ok) return result;
      setState((current) => ({
        ...current,
        attempts: current.attempts.filter((item) => item.id !== attemptId),
      }));
      return result;
    },
    [demoMode, state.attempts],
  );

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

  const resetDemo = useCallback(() => {
    if (demoMode) setState(createDemoState());
  }, [demoMode]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      ready,
      demoMode,
      canAccessAdmin,
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
      demoMode,
      canAccessAdmin,
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
          className="fixed top-4 right-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] animate-toast-in items-start gap-3 rounded-xl bg-white p-3.5 text-zinc-900 shadow-lg ring-1 ring-zinc-200 sm:top-6 sm:right-6"
        >
          <span
            aria-hidden="true"
            className={
              toast.tone === "warning"
                ? "grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100 ring-inset"
                : "grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 ring-inset"
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
