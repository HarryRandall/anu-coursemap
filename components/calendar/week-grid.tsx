"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  DAY_START_HOUR,
  HOUR_COUNT,
  HOUR_HEIGHT_PX,
  WEEKDAYS,
  addDays,
  formatClock,
  isSameDay,
  nowLinePx,
  sessionHeightPx,
  sessionKindLabel,
  sessionKindShort,
  sessionTopPx,
  weekdayIndex,
  type ClassSession,
} from "@/lib/calendar";
import { sessionSurface } from "@/components/calendar/session-styles";

const hours = Array.from(
  { length: HOUR_COUNT },
  (_, index) => DAY_START_HOUR + index,
);

/** Today is resolved on the client only so the grid hydrates deterministically. */
function useClientNow() {
  return useSyncExternalStore(
    () => () => {},
    () => Date.now(),
    () => null,
  );
}

export function WeekGrid({
  weekStart,
  sessions,
  selectedSessionId,
  highlightedCourseCode,
  onSelect,
}: {
  weekStart: Date;
  sessions: ClassSession[];
  selectedSessionId: string | null;
  highlightedCourseCode: string | null;
  onSelect: (sessionId: string) => void;
}) {
  const nowMs = useClientNow();
  const today = nowMs === null ? null : new Date(nowMs);
  const todayInWeek = Boolean(
    today &&
    today.getDay() >= 1 &&
    today.getDay() <= 5 &&
    today >= weekStart &&
    today < addDays(weekStart, 5),
  );
  const todayColumn = todayInWeek && today ? weekdayIndex(today) : null;
  const nowOffset = todayInWeek && today ? nowLinePx(today) : null;

  return (
    <section
      aria-label="Weekly timetable"
      className="grid min-w-[46rem] grid-cols-[3.5rem_repeat(5,minmax(0,1fr))]"
    >
      <div className="sticky top-0 z-20 h-14 border-b border-zinc-200/70 bg-white" />
      {WEEKDAYS.map((day, index) => {
        const date = addDays(weekStart, index);
        const isToday = today ? isSameDay(date, today) : false;
        return (
          <div
            key={day}
            className="sticky top-0 z-20 flex h-14 items-center justify-center gap-1.5 border-b border-zinc-200/70 bg-white"
          >
            <span
              className={cn(
                "text-[11px] font-semibold tracking-[0.08em] uppercase",
                isToday ? "text-brand-600" : "text-zinc-400",
              )}
            >
              {day}
            </span>
            <span
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "grid size-7 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
                isToday ? "bg-brand-600 text-white" : "text-zinc-700",
              )}
            >
              {date.getDate()}
            </span>
          </div>
        );
      })}

      <div className="pt-3 pb-4">
        <div
          className="relative"
          style={{ height: HOUR_COUNT * HOUR_HEIGHT_PX }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative"
              style={{ height: HOUR_HEIGHT_PX }}
            >
              <span className="absolute top-0 right-2.5 -translate-y-1/2 text-[10px] font-medium text-zinc-400 tabular-nums">
                {formatClock(hour * 60)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {WEEKDAYS.map((day, index) => {
        const daySessions = sessions.filter(
          (session) => session.weekday === index,
        );
        return (
          <div
            key={day}
            className={cn(
              "border-l border-zinc-100 pt-3 pb-4",
              todayColumn === index && "bg-brand-50/25",
            )}
          >
            <div
              className="relative"
              style={{ height: HOUR_COUNT * HOUR_HEIGHT_PX }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-t border-zinc-100"
                  style={{ height: HOUR_HEIGHT_PX }}
                />
              ))}

              {nowOffset !== null && todayColumn === index && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                  style={{ top: nowOffset }}
                >
                  <span className="size-1.5 -translate-x-[3px] rounded-full bg-rose-500" />
                  <span className="h-px flex-1 bg-rose-500/70" />
                  <span className="sr-only">Current time</span>
                </div>
              )}

              {daySessions.map((session) => {
                const selected = session.id === selectedSessionId;
                const dimmed =
                  highlightedCourseCode !== null &&
                  highlightedCourseCode !== session.courseCode &&
                  !selected;
                const surface = sessionSurface[session.accent];
                const tall = session.durationMinutes >= 90;
                return (
                  <button
                    key={session.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${session.courseCode} ${sessionKindLabel[session.kind]}, ${formatClock(session.startMinutes)} to ${formatClock(session.startMinutes + session.durationMinutes)}, ${session.location}${selected ? ", selected" : ""}`}
                    onClick={() => onSelect(session.id)}
                    className={cn(
                      "absolute right-1.5 left-1.5 z-10 flex flex-col overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5 text-left ring-1 transition-[background-color,box-shadow,opacity] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
                      surface.block,
                      surface.edge,
                      selected &&
                        "z-30 shadow-md ring-2 ring-zinc-900 ring-offset-1",
                      dimmed && "opacity-30",
                    )}
                    style={{
                      top: sessionTopPx(session) + 3,
                      height: Math.max(sessionHeightPx(session) - 6, 40),
                    }}
                  >
                    <span
                      className={cn(
                        "w-fit rounded px-1 py-px text-[9px] font-bold tracking-[0.06em] uppercase",
                        surface.chip,
                      )}
                    >
                      {sessionKindShort[session.kind]}
                    </span>
                    <span className="mt-0.5 truncate text-[12px] font-semibold">
                      {session.courseCode}
                    </span>
                    {tall && (
                      <span className="truncate text-[10px] text-zinc-500">
                        {formatClock(session.startMinutes)} · {session.location}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
