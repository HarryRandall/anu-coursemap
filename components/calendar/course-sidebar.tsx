"use client";

import { Eye, EyeOff } from "lucide-react";
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
      <ul className="flex flex-col items-center gap-1.5 px-3 pt-16 pb-4">
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
                title={course.code}
                aria-label={`${course.code}${hidden ? ", hidden on calendar" : ""}`}
                onClick={() => onHighlightCourse(course.code)}
                className={cn(
                  "grid size-11 place-items-center rounded-xl ring-1 ring-transparent transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                  active && "bg-zinc-100 ring-zinc-300",
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
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-200/70 px-4">
        <h2 className="text-[11px] font-semibold tracking-[0.08em] text-zinc-400 uppercase">
          Courses
        </h2>
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums">
          {attempts.length}
        </span>
      </div>

      <ul className="flex-1 space-y-1 p-2">
        {attempts.map((attempt) => {
          const course = courseByCode(attempt.courseCode);
          if (!course) return null;
          const courseSessions = sessions.filter(
            (session) => session.courseCode === course.code,
          );
          const hidden = hiddenCodes.has(course.code);
          const active = highlightedCourseCode === course.code;
          const status = effectiveStatus(attempt, allAttempts);

          return (
            <li key={attempt.id}>
              <div
                className={cn(
                  "rounded-xl ring-1 transition",
                  active
                    ? "bg-zinc-50 ring-zinc-300"
                    : "ring-transparent hover:bg-zinc-50/70",
                  hidden && "opacity-55",
                )}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onHighlightCourse(course.code)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                  >
                    <CourseToken
                      code={course.code}
                      accent={course.accent}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[12px] font-semibold text-zinc-900">
                          {course.code}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium ring-1 ring-inset",
                            toneClasses[statusTone[status]],
                          )}
                        >
                          {statusLabel(status)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                        {course.name}
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
                    className="mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-white hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500"
                  >
                    {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <ul className="space-y-px px-2 pb-2">
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
                            "flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-1 text-left transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
                            selected && "bg-white ring-1 ring-zinc-300",
                          )}
                        >
                          <span
                            className={cn(
                              "h-6 w-[3px] shrink-0 rounded-full",
                              surface.bar,
                              !selected && "opacity-60",
                            )}
                          />
                          <span className="w-16 shrink-0 text-[11px] font-medium text-zinc-700">
                            {sessionKindLabel[session.kind]}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">
                            {formatSessionTime(session)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
