"use client";

import { ChevronDown, Eye, EyeOff } from "lucide-react";
import type { Attempt } from "@/lib/catalogue";
import { courseByCode } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import {
  formatSessionTime,
  sessionKindLabel,
  type ClassSession,
} from "@/lib/calendar";
import { effectiveStatus, statusLabel } from "@/lib/planner";
import { CourseToken } from "@/components/ui/course-token";
import { sessionSurface } from "@/components/calendar/session-styles";
import { statusTone, toneClasses } from "@/lib/ui";

export function CourseSidebar({
  attempts,
  allAttempts,
  sessions,
  collapsed,
  hiddenCodes,
  highlightedCourseCode,
  selectedSessionId,
  onHighlightCourse,
  onSelectSession,
  onToggleVisibility,
}: {
  attempts: Attempt[];
  allAttempts: Attempt[];
  sessions: ClassSession[];
  collapsed: boolean;
  hiddenCodes: Set<string>;
  highlightedCourseCode: string | null;
  selectedSessionId: string | null;
  onHighlightCourse: (courseCode: string) => void;
  onSelectSession: (sessionId: string) => void;
  onToggleVisibility: (courseCode: string) => void;
}) {
  if (collapsed) {
    return (
      <ul className="flex flex-col items-center gap-2 px-2 py-3">
        {attempts.map((attempt) => {
          const course = courseByCode(attempt.courseCode);
          if (!course) return null;
          const hidden = hiddenCodes.has(course.code);
          const active = highlightedCourseCode === course.code;
          return (
            <li key={attempt.id}>
              <button
                type="button"
                aria-pressed={active}
                aria-label={`${course.code}${hidden ? ", hidden on calendar" : ""}`}
                onClick={() => onHighlightCourse(course.code)}
                className={cn(
                  "rounded-xl p-0.5 ring-1 ring-transparent transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                  active && "ring-zinc-900",
                  hidden && "opacity-40",
                )}
              >
                <CourseToken
                  code={course.code}
                  accent={course.accent}
                  size="sm"
                />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-2 p-3">
      {attempts.map((attempt) => {
        const course = courseByCode(attempt.courseCode);
        if (!course) return null;
        const courseSessions = sessions.filter(
          (session) => session.courseCode === course.code,
        );
        const hidden = hiddenCodes.has(course.code);
        const active = highlightedCourseCode === course.code;
        const status = effectiveStatus(attempt, allAttempts);
        const forceOpen =
          active ||
          courseSessions.some((session) => session.id === selectedSessionId);

        return (
          <li key={attempt.id}>
            <article
              className={cn(
                "overflow-hidden rounded-2xl ring-1 ring-zinc-200/80 transition",
                active && "ring-2 ring-zinc-900",
                hidden && "opacity-60",
              )}
            >
              <div className="flex items-start gap-2 p-3">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onHighlightCourse(course.code)}
                  className="flex min-h-11 min-w-0 flex-1 items-start gap-2.5 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  <CourseToken
                    code={course.code}
                    accent={course.accent}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-[12px] font-bold text-zinc-900">
                      {course.code}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                      {course.name}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                          toneClasses[statusTone[status]],
                        )}
                      >
                        {statusLabel(status)}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {courseSessions.length}{" "}
                        {courseSessions.length === 1 ? "class" : "classes"}
                      </span>
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={!hidden}
                  aria-label={
                    hidden
                      ? `Show ${course.code} on the calendar`
                      : `Hide ${course.code} on the calendar`
                  }
                  onClick={() => onToggleVisibility(course.code)}
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                >
                  {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <details
                className="group border-t border-zinc-100"
                {...(forceOpen ? { open: true } : {})}
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[11px] font-semibold text-zinc-500 select-none [&::-webkit-details-marker]:hidden">
                  Classes this week
                  <ChevronDown
                    size={14}
                    className="transition group-open:rotate-180"
                  />
                </summary>
                <ul className="space-y-1 px-2 pb-2">
                  {courseSessions.map((session) => {
                    const selected = session.id === selectedSessionId;
                    const surface = sessionSurface[session.accent];
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onSelectSession(session.id)}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                            selected && "bg-zinc-100 ring-1 ring-zinc-900/10",
                          )}
                        >
                          <span
                            className={cn(
                              "h-8 w-1 shrink-0 rounded-full",
                              surface.bar,
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-semibold text-zinc-800">
                              {sessionKindLabel[session.kind]}
                            </span>
                            <span className="block text-[11px] text-zinc-500">
                              {formatSessionTime(session)}
                            </span>
                          </span>
                          {selected && (
                            <span className="text-[10px] font-semibold text-zinc-700">
                              Selected
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
