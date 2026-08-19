"use client";

import Link from "next/link";
import {
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  MapPin,
  PenLine,
  TreePalm,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  UNIVERSITY_CALENDAR_CATEGORIES,
  groupUniversityCalendarEventsByMonth,
  type UniversityCalendarCategory,
  type UniversityCalendarEvent,
} from "@/lib/coursemap/university-calendar";

const MONTHS_PER_PAGE = 3;

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthShortNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const categoryPresentation: Record<
  UniversityCalendarCategory,
  {
    icon: LucideIcon;
    tone: "brand" | "danger" | "warning" | "success" | "info" | "neutral";
  }
> = {
  teaching: { icon: BookOpen, tone: "brand" },
  examinations: { icon: PenLine, tone: "danger" },
  enrolment: { icon: ClipboardCheck, tone: "warning" },
  graduation: { icon: GraduationCap, tone: "success" },
  holiday: { icon: TreePalm, tone: "info" },
  campus: { icon: MapPin, tone: "neutral" },
};

const categoryLabels = new Map(
  UNIVERSITY_CALENDAR_CATEGORIES.map((category) => [
    category.value,
    category.label,
  ]),
);

function keyDatesHref(year: number) {
  return `/key-dates?year=${year}`;
}

function eventDateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return {
    day: Number(date.slice(8, 10)),
    month: monthShortNames[Number(date.slice(5, 7)) - 1],
    weekday: weekdayNames[parsed.getUTCDay()],
  };
}

function CategoryBadge({ category }: { category: UniversityCalendarCategory }) {
  const { icon: Icon, tone } = categoryPresentation[category];
  return (
    <Badge tone={tone}>
      <Icon size={12} aria-hidden="true" />
      {categoryLabels.get(category)}
    </Badge>
  );
}

export function UniversityCalendarView({
  allEvents,
  availableYears,
  sourceUrl,
  todayIso,
  year,
}: {
  allEvents: UniversityCalendarEvent[];
  availableYears: number[];
  sourceUrl: string;
  todayIso: string;
  year: number;
}) {
  const months = useMemo(
    () => groupUniversityCalendarEventsByMonth(allEvents),
    [allEvents],
  );
  const [visibleMonthCount, setVisibleMonthCount] = useState(() =>
    Math.min(MONTHS_PER_PAGE, months.length),
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleMonthCount < months.length;

  const loadMore = useCallback(() => {
    setVisibleMonthCount((current) =>
      Math.min(current + MONTHS_PER_PAGE, months.length),
    );
  }, [months.length]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, visibleMonthCount]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {year}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {allEvents.length} key dates
          </p>
        </div>

        {availableYears.length > 1 ? (
          <nav aria-label="Calendar year" className="flex flex-wrap gap-1">
            {availableYears.map((availableYear) => (
              <Link
                key={availableYear}
                href={keyDatesHref(availableYear)}
                aria-current={availableYear === year ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium",
                  availableYear === year
                    ? "bg-brand-50 text-brand-700"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                {availableYear}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="space-y-7">
        {months.slice(0, visibleMonthCount).map((month) => (
          <section
            key={month.key}
            id={`month-${month.key}`}
            aria-labelledby={`month-heading-${month.key}`}
            className="scroll-mt-4"
          >
            <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-zinc-200 bg-zinc-50/95 py-2.5 backdrop-blur-sm">
              <h3
                id={`month-heading-${month.key}`}
                className="text-sm font-semibold text-zinc-900"
              >
                {month.label}
              </h3>
              <span className="text-xs text-zinc-500">
                {month.events.length}{" "}
                {month.events.length === 1 ? "date" : "dates"}
              </span>
            </div>

            <ol className="divide-y divide-zinc-100">
              {month.events.map((event) => {
                const {
                  day,
                  month: monthName,
                  weekday,
                } = eventDateParts(event.date);
                const isToday = event.date === todayIso;

                return (
                  <li
                    key={event.id}
                    className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-3.5 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <time
                      dateTime={event.date}
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        isToday ? "text-brand-700" : "text-zinc-500",
                      )}
                    >
                      {isToday ? (
                        "Today"
                      ) : (
                        <>
                          <span className="block text-[10px] tracking-wide uppercase sm:inline sm:text-xs sm:tracking-normal sm:normal-case">
                            {weekday}
                          </span>{" "}
                          <span>
                            {day} {monthName}
                          </span>
                        </>
                      )}
                    </time>

                    <div className="min-w-0">
                      <p className="text-sm leading-snug font-medium text-zinc-900">
                        {event.title}
                      </p>
                      <div className="mt-2 sm:hidden">
                        <CategoryBadge category={event.category} />
                      </div>
                    </div>

                    <div className="hidden justify-self-end sm:block">
                      <CategoryBadge category={event.category} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {hasMore ? (
        <div
          ref={loadMoreRef}
          className="flex min-h-24 items-center justify-center py-6"
        >
          <Button variant="ghost" className="min-h-11" onClick={loadMore}>
            Load more dates
          </Button>
        </div>
      ) : (
        <p className="py-8 text-center text-xs text-zinc-400">End of {year}</p>
      )}

      <p className="border-t border-zinc-200 pt-4 text-xs text-zinc-500">
        Source:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
        >
          ANU university calendar
          <ExternalLink size={11} aria-hidden="true" className="ml-1 inline" />
        </a>
      </p>
    </div>
  );
}
