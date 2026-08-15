"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Attempt } from "@/lib/catalogue";
import { accent } from "@/lib/ui";
import {
  eventsOnDay,
  focusMonthForPlan,
  isSameDay,
  monthCells,
  monthLabel,
  shiftMonth,
  weekdayLabels,
  type YearMonth,
} from "@/lib/study-calendar";

const gridCells = 42;

export function MonthCalendar({ attempts }: { attempts: Attempt[] }) {
  const today = useMemo(() => new Date(), []);
  const initial = useMemo(
    () => focusMonthForPlan(attempts, today),
    [attempts, today],
  );
  const [focus, setFocus] = useState<YearMonth>(initial);
  const cells = monthCells(focus);
  const padded: Array<Date | null> = [
    ...cells,
    ...Array.from({ length: gridCells - cells.length }, () => null),
  ];

  return (
    <Card className="flex h-[21.5rem] w-full flex-col p-4 lg:w-72">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">
          {monthLabel(focus)}
        </p>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setFocus((current) => shiftMonth(current, -1))}
            className="grid size-11 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setFocus((current) => shiftMonth(current, 1))}
            className="grid size-11 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="pb-1 text-center text-[10px] font-semibold tracking-wide text-zinc-400 uppercase"
          >
            {label}
          </div>
        ))}
        {padded.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="h-9" />;
          }
          const events = eventsOnDay(cell, attempts);
          const isToday = isSameDay(cell, today);
          const dayClass = cn(
            "mx-auto flex size-8 flex-col items-center justify-center rounded-full text-[12px] font-medium",
            isToday && "bg-brand-600 text-white",
            !isToday && events.length > 0 && "text-zinc-900",
            !isToday && events.length === 0 && "text-zinc-500",
          );

          if (events.length === 0) {
            return (
              <div
                key={cell.toISOString()}
                className="grid h-9 place-items-center"
              >
                <span className={dayClass}>{cell.getDate()}</span>
              </div>
            );
          }

          return (
            <div key={cell.toISOString()} className="group relative h-9">
              <button
                type="button"
                aria-label={`${cell.getDate()} ${monthLabel(focus)}, ${events.map((event) => event.course.code).join(", ")}`}
                className={cn(dayClass, !isToday && "hover:bg-zinc-100")}
              >
                {cell.getDate()}
                <span
                  className={cn(
                    "mt-px size-1 rounded-full",
                    isToday ? "bg-white" : accent[events[0].course.accent].dot,
                  )}
                  aria-hidden="true"
                />
              </button>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white shadow-md group-focus-within:block group-hover:block"
              >
                {events.map((event) => event.course.code).join(", ")}
              </span>
            </div>
          );
        })}
      </div>
      <Link
        href="/calendar"
        className="mt-auto text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        Open calendar
      </Link>
    </Card>
  );
}
