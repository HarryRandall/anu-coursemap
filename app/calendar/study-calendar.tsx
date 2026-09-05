"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { EventCalendar } from "@reui/components/event-calendar/event-calendar";
import { EventCalendarContent } from "@reui/components/event-calendar/event-calendar-content";
import { EventCalendarNav } from "@reui/components/event-calendar/event-calendar-nav";
import type { CalendarEvent } from "@reui/components/event-calendar/event-calendar-types";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  planTimelineTerms,
  planTimelineYears,
} from "@/lib/coursemap/plan-timeline";
import {
  decorateUniversityCalendarEvents,
  UNIVERSITY_CALENDAR_CATEGORIES,
  type UniversityCalendarCategory,
  type UniversityCalendarEventRecord,
} from "@/lib/coursemap/university-calendar";
import { cn } from "@/lib/cn";

const CATEGORY_COLORS: Record<UniversityCalendarCategory, string> = {
  teaching: "var(--color-sky-500)",
  examinations: "var(--color-rose-500)",
  enrolment: "var(--color-amber-500)",
  graduation: "var(--color-violet-500)",
  holiday: "var(--color-emerald-500)",
  campus: "var(--color-zinc-500)",
};

const PLAN_TERM_FILTER = "plan-terms" as const;
type CalendarFilter = UniversityCalendarCategory | typeof PLAN_TERM_FILTER;

/** Local midnight for an ISO day; matches the calendar's display time zone. */
function localMidnight(isoDay: string) {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function StudyCalendar({
  catalogue,
  keyDates,
}: {
  catalogue: PlanCatalogue;
  keyDates: UniversityCalendarEventRecord[];
}) {
  const { state } = useCoursemap();
  const [hidden, setHidden] = useState<ReadonlySet<CalendarFilter>>(new Set());

  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const timelineTerms = useMemo(() => {
    const years = planTimelineYears({
      degree,
      commencementYear: state.profile.commencementYear,
      extensionYears: state.profile.extensionYears,
    });
    return planTimelineTerms({ terms: catalogue.terms, years });
  }, [
    catalogue.terms,
    degree,
    state.profile.commencementYear,
    state.profile.extensionYears,
  ]);

  const courseCountByTerm = useMemo(() => {
    const counts = new Map<string, number>();
    state.attempts.forEach((attempt) => {
      counts.set(attempt.termId, (counts.get(attempt.termId) ?? 0) + 1);
    });
    return counts;
  }, [state.attempts]);

  const events = useMemo<CalendarEvent[]>(() => {
    const termEvents: CalendarEvent[] = hidden.has(PLAN_TERM_FILTER)
      ? []
      : timelineTerms
          .filter((term) => term.id !== "unscheduled")
          .filter((term) => term.startsOn && term.endsOn)
          .map((term) => {
            const courses = courseCountByTerm.get(term.id) ?? 0;
            return {
              id: `term-${term.id}`,
              title: `${term.name} ${term.year}${
                courses > 0
                  ? ` · ${courses} course${courses === 1 ? "" : "s"}`
                  : ""
              }`,
              start: localMidnight(term.startsOn as string),
              end: addDays(localMidnight(term.endsOn as string), 1),
              allDay: true,
              readOnly: true,
              color: "var(--primary)",
              priority: 10,
            };
          });

    const keyDateEvents: CalendarEvent[] = decorateUniversityCalendarEvents(
      keyDates,
    )
      .filter((event) => !hidden.has(event.category))
      .map((event) => {
        const start = localMidnight(event.date);
        return {
          id: `key-date-${event.id}`,
          title: event.title,
          start,
          end: addDays(start, 1),
          allDay: true,
          readOnly: true,
          color: CATEGORY_COLORS[event.category],
        };
      });

    return [...termEvents, ...keyDateEvents];
  }, [courseCountByTerm, hidden, keyDates, timelineTerms]);

  const toggleFilter = (filter: CalendarFilter) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  };

  const legend: Array<{ id: CalendarFilter; label: string; color: string }> = [
    { id: PLAN_TERM_FILTER, label: "Plan terms", color: "var(--primary)" },
    ...UNIVERSITY_CALENDAR_CATEGORIES.map(({ value, label }) => ({
      id: value as CalendarFilter,
      label,
      color: CATEGORY_COLORS[value],
    })),
  ];

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <h1 className="sr-only">Study calendar</h1>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Calendar filters"
        >
          {legend.map(({ id, label, color }) => {
            const off = hidden.has(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={!off}
                onClick={() => toggleFilter(id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  off
                    ? "bg-transparent text-muted-foreground/70 line-through"
                    : "bg-card text-foreground/80 shadow-xs hover:bg-accent/50",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", off && "opacity-30")}
                  style={{ backgroundColor: color }}
                />
                {label}
              </button>
            );
          })}
        </div>

        {keyDates.length === 0 ? (
          <Alert tone="neutral">
            <CalendarDays aria-hidden="true" />
            <AlertDescription>
              No published ANU key dates are available yet, so the calendar
              shows your plan&apos;s study periods only.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <EventCalendar
            events={events}
            defaultView="month"
            views={["month", "agenda"]}
            interactions={{ drag: false, resize: false, selectSlot: false }}
            eventTooltip
            agendaDayCount={60}
            className="h-[clamp(32rem,calc(100dvh-14rem),46rem)]"
            classNames={{ nav: "border-b border-border px-3 py-2" }}
          >
            <EventCalendarNav />
            <EventCalendarContent />
          </EventCalendar>
        </div>
      </div>
    </AppShell>
  );
}
