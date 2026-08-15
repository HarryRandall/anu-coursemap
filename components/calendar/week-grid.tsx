"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
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
    <section aria-label="Weekly timetable" className="min-w-[48rem]">
      <div className="grid grid-cols-[3.75rem_repeat(5,minmax(0,1fr))]">
        <div className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm" />
        {WEEKDAYS.map((day, index) => {
          const date = addDays(weekStart, index);
          const isToday = today ? isSameDay(date, today) : false;
          return (
            <div
              key={day}
              className={cn(
                "sticky top-0 z-20 border-b border-l border-zinc-200/80 bg-white/90 px-2 py-3 text-center backdrop-blur-sm",
                isToday && "bg-brand-50/80",
              )}
            >
              <p
                className={cn(
                  "text-[11px] font-semibold tracking-wide uppercase",
                  isToday ? "text-brand-700" : "text-zinc-400",
                )}
              >
                {day}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-semibold tabular-nums",
                  isToday ? "text-brand-900" : "text-zinc-800",
                )}
                aria-current={isToday ? "date" : undefined}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}

        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative"
              style={{ height: HOUR_HEIGHT_PX }}
            >
              <span className="absolute top-0 right-2 -translate-y-1/2 font-mono text-[10px] font-medium text-zinc-400">
                {formatClock(hour * 60)}
              </span>
            </div>
          ))}
        </div>

        {WEEKDAYS.map((day, index) => {
          const daySessions = sessions.filter(
            (session) => session.weekday === index,
          );
          return (
            <div
              key={day}
              className={cn(
                "relative border-l border-zinc-100",
                todayColumn === index && "bg-brand-50/30",
              )}
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
                  className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
                  style={{ top: nowOffset }}
                >
                  <span className="size-2 -translate-x-1 rounded-full bg-rose-500" />
                  <span className="h-px flex-1 bg-rose-500" />
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
                return (
                  <button
                    key={session.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${session.courseCode} ${sessionKindLabel[session.kind]}, ${formatClock(session.startMinutes)} to ${formatClock(session.startMinutes + session.durationMinutes)}, ${session.location}${selected ? ", selected" : ""}`}
                    onClick={() => onSelect(session.id)}
                    className={cn(
                      "absolute right-1 left-1 z-10 flex min-h-11 flex-col overflow-hidden rounded-xl px-2.5 py-1.5 text-left shadow-xs ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                      surface.block,
                      selected && "z-30 shadow-md ring-2 ring-zinc-900",
                      dimmed && "opacity-35",
                    )}
                    style={{
                      top: sessionTopPx(session) + 4,
                      height: Math.max(sessionHeightPx(session) - 8, 44),
                    }}
                  >
                    <span
                      className={cn(
                        "absolute inset-y-1.5 left-1 w-1 rounded-full",
                        surface.bar,
                      )}
                    />
                    <span className="flex items-center gap-1 pl-1.5">
                      <span
                        className={cn(
                          "rounded px-1 py-px text-[9px] font-bold tracking-wide uppercase",
                          surface.chip,
                        )}
                      >
                        {sessionKindShort[session.kind]}
                      </span>
                      {selected && (
                        <Check
                          size={12}
                          strokeWidth={2.75}
                          className="text-zinc-900"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 truncate pl-1.5 font-mono text-[11px] font-bold">
                      {session.courseCode}
                    </span>
                    {session.durationMinutes >= 90 && (
                      <span className="truncate pl-1.5 text-[10px] text-zinc-600">
                        {formatClock(session.startMinutes)} · {session.location}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
