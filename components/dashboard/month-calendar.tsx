"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Attempt } from "@/lib/catalogue";
import { accent } from "@/lib/ui";
import {
  eventsInMonth,
  eventsOnDay,
  focusMonthForPlan,
  isSameDay,
  monthCells,
  monthLabel,
  shiftMonth,
  termContaining,
  weekdayLabels,
  type YearMonth,
} from "@/lib/study-calendar";

export function MonthCalendar({ attempts }: { attempts: Attempt[] }) {
  const today = useMemo(() => new Date(), []);
  const initial = useMemo(
    () => focusMonthForPlan(attempts, today),
    [attempts, today],
  );
  const [focus, setFocus] = useState<YearMonth>(initial);
  const [selected, setSelected] = useState<Date>(
    initial.year === today.getFullYear() && initial.month === today.getMonth()
      ? today
      : new Date(initial.year, initial.month, 1),
  );
  const cells = monthCells(focus);
  const monthEvents = eventsInMonth(focus, attempts);
  const selectedEvents = eventsOnDay(selected, attempts);
  const selectedTerm = termContaining(selected);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Calendar"
        description={
          monthEvents.length === 0
            ? "No courses from your plan fall in this month."
            : `${monthEvents.length} ${monthEvents.length === 1 ? "course" : "courses"} from your plan this month`
        }
        action={
          <Link
            href="/calendar"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Full calendar
          </Link>
        }
      />
      <div className="border-t border-zinc-100 px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-900">
            {monthLabel(focus)}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setFocus((current) => shiftMonth(current, -1))}
              className="grid size-11 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setFocus((current) => shiftMonth(current, 1))}
              className="grid size-11 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-zinc-200/80 ring-1 ring-zinc-200">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="bg-zinc-50 py-2 text-center text-[10px] font-semibold tracking-wide text-zinc-400 uppercase"
            >
              {label}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div key={`empty-${index}`} className="min-h-20 bg-white" />
              );
            }
            const events = eventsOnDay(cell, attempts);
            const isToday = isSameDay(cell, today);
            const isSelected = isSameDay(cell, selected);
            const inTerm = Boolean(termContaining(cell));
            return (
              <button
                key={cell.toISOString()}
                type="button"
                onClick={() => setSelected(cell)}
                aria-label={`${cell.getDate()} ${monthLabel(focus)}${events.length ? `, ${events.map((event) => event.course.code).join(", ")}` : ""}`}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-20 flex-col gap-1 bg-white p-1.5 text-left transition hover:bg-zinc-50",
                  inTerm && "bg-brand-50/30",
                  isSelected && "ring-2 ring-brand-400 ring-inset",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[11px] font-semibold",
                    isToday ? "bg-brand-600 text-white" : "text-zinc-600",
                  )}
                >
                  {cell.getDate()}
                </span>
                <span className="flex min-h-0 flex-1 flex-col gap-0.5">
                  {events.slice(0, 2).map((event) => (
                    <span
                      key={event.attempt.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 font-mono text-[9px] font-semibold",
                        accent[event.course.accent].token,
                      )}
                    >
                      {event.course.code}
                    </span>
                  ))}
                  {events.length > 2 && (
                    <span className="px-1 text-[9px] font-medium text-zinc-400">
                      +{events.length - 2}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl bg-zinc-50 px-3.5 py-3 ring-1 ring-zinc-200/80 ring-inset">
          <p className="text-[11px] font-semibold text-zinc-500">
            {selected.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {selectedTerm ? ` · ${selectedTerm.name} ${selectedTerm.year}` : ""}
          </p>
          {selectedEvents.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {selectedEvents.map((event) => (
                <li
                  key={event.attempt.id}
                  className="flex items-center gap-2 text-[12px]"
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      accent[event.course.accent].dot,
                    )}
                    aria-hidden="true"
                  />
                  <span className="font-mono font-semibold text-zinc-800">
                    {event.course.code}
                  </span>
                  <span className="truncate text-zinc-500">
                    {event.course.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[12px] text-zinc-500">
              {selectedTerm
                ? "No course from this study period sits on this weekday."
                : "Outside a planned study period."}
            </p>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
            Courses appear on a weekday from your plan. Class times are not
            recorded yet.
          </p>
        </div>
      </div>
    </Card>
  );
}
