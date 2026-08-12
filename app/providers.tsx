"use client";

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

type AppContextValue = {
  state: AppState;
  ready: boolean;
  updateProfile: (profile: Partial<Profile>) => void;
  addCourse: (courseCode: string, termId: string) => { ok: boolean; message: string };
  moveAttempt: (attemptId: string, termId: string) => void;
  updateAttempt: (attemptId: string, status: AttemptStatus, mark?: number) => void;
  removeAttempt: (attemptId: string) => { ok: boolean; message: string };
  togglePermission: (attemptId: string) => void;
  toggleOverloadApproval: (attemptId: string) => void;
  resetDemo: () => void;
  toast: string | null;
  notify: (message: string) => void;
};

const STORAGE_KEY = "coursemap.demo.v1";

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
  attempts: initialAttempts,
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
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidStoredState(parsed)) {
          window.queueMicrotask(() => {
            if (!cancelled) setState(parsed);
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

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const updateProfile = useCallback((profile: Partial<Profile>) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, ...profile },
    }));
  }, []);

  const addCourse = useCallback((courseCode: string, termId: string) => {
    let result = { ok: true, message: `${courseCode} added to the plan` };
    setState((current) => {
      const duplicate = current.attempts.some(
        (attempt) =>
          attempt.courseCode === courseCode &&
          attempt.status !== "failed" &&
          attempt.termId === termId,
      );
      if (duplicate) {
        result = { ok: false, message: `${courseCode} is already in that semester` };
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

  const moveAttempt = useCallback((attemptId: string, termId: string) => {
    setState((current) => ({
      ...current,
      attempts: current.attempts.map((attempt) =>
        attempt.id === attemptId ? { ...attempt, termId } : attempt,
      ),
    }));
  }, []);

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
      moveAttempt,
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
      moveAttempt,
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
        <div className="toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {toast}
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
