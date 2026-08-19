import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  MapPin,
  PenLine,
  TreePalm,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  UNIVERSITY_CALENDAR_CATEGORIES,
  decorateUniversityCalendarEvents,
  groupUniversityCalendarEventsByMonth,
  upcomingUniversityCalendarEvents,
  type UniversityCalendarCategory,
  type UniversityCalendarEvent,
} from "@/lib/coursemap/university-calendar";
import {
  loadPublishedUniversityCalendar,
  type UniversityCalendarData,
} from "@/lib/coursemap/university-calendar-data";

export const dynamic = "force-dynamic";

const ANU_CALENDAR_URL =
  "https://www.anu.edu.au/directories/university-calendar";

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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT_LABELS = [
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

/** Weekday abbreviation for an ISO day, computed in UTC to stay machine-independent. */
function weekdayLabel(date: string) {
  return WEEKDAY_LABELS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function shortDateLabel(date: string) {
  const day = Number(date.slice(8, 10));
  const month = MONTH_SHORT_LABELS[Number(date.slice(5, 7)) - 1];
  return `${weekdayLabel(date)} ${day} ${month}`;
}

function keyDatesHref(year?: number, category?: UniversityCalendarCategory) {
  const query = new URLSearchParams();
  if (year) query.set("year", String(year));
  if (category) query.set("category", category);
  const suffix = query.toString();
  return suffix ? `/key-dates?${suffix}` : "/key-dates";
}

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
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

function EventDateBlock({
  date,
  isToday,
  isPast,
}: {
  date: string;
  isToday: boolean;
  isPast: boolean;
}) {
  return (
    <time
      dateTime={date}
      className={cn(
        "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white ring-1 ring-inset",
        isToday ? "ring-2 ring-brand-400" : "ring-zinc-200",
      )}
    >
      <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
        {weekdayLabel(date)}
      </span>
      <span
        className={cn(
          "text-lg leading-6 font-bold",
          isPast ? "text-zinc-500" : "text-zinc-900",
        )}
      >
        {Number(date.slice(8, 10))}
      </span>
    </time>
  );
}

function TimelineEvent({
  event,
  todayIso,
}: {
  event: UniversityCalendarEvent;
  todayIso: string;
}) {
  const isToday = event.date === todayIso;
  const isPast = event.date < todayIso;
  return (
    <li className="group relative flex gap-4 pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute top-16 bottom-0 left-7 w-px bg-zinc-200 group-last:hidden"
      />
      <EventDateBlock date={event.date} isToday={isToday} isPast={isPast} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "text-sm leading-snug font-medium",
              isPast ? "text-zinc-500" : "text-zinc-900",
            )}
          >
            {event.title}
          </p>
          {isToday && (
            <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
              Today
            </span>
          )}
        </div>
        <div className="mt-1.5">
          <CategoryBadge category={event.category} />
        </div>
      </div>
    </li>
  );
}

function EmptyCalendarCard() {
  return (
    <Card className="px-6 py-12 text-center sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <CalendarDays size={22} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900">
        No key dates published yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        Key dates are imported from the official ANU university calendar. Once
        an import is published, semester starts, census dates and examination
        periods will appear here.
      </p>
      <div className="mt-6 flex justify-center">
        <a
          href={ANU_CALENDAR_URL}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "secondary" })}
        >
          View the ANU calendar
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
    </Card>
  );
}

export default async function KeyDatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string | string[];
    category?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const rawYear = firstParam(params.year);
  const requestedYear = /^\d{4}$/.test(rawYear) ? Number(rawYear) : undefined;
  const rawCategory = firstParam(params.category);
  const activeCategory = UNIVERSITY_CALENDAR_CATEGORIES.find(
    (category) => category.value === rawCategory,
  )?.value;

  let data: UniversityCalendarData = {
    year: requestedYear ?? null,
    availableYears: [],
    events: [],
  };
  try {
    data = await loadPublishedUniversityCalendar(requestedYear);
  } catch {
    // Keep the page renderable with the empty state while the source recovers.
  }

  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const allEvents = decorateUniversityCalendarEvents(data.events);
  const events = activeCategory
    ? allEvents.filter((event) => event.category === activeCategory)
    : allEvents;
  const months = groupUniversityCalendarEventsByMonth(events);
  const viewingCurrentYear =
    data.year !== null && String(data.year) === todayIso.slice(0, 4);
  const upcoming = viewingCurrentYear
    ? upcomingUniversityCalendarEvents(allEvents, todayIso, 3)
    : [];

  const categoryCounts = new Map<UniversityCalendarCategory, number>();
  for (const event of allEvents) {
    categoryCounts.set(
      event.category,
      (categoryCounts.get(event.category) ?? 0) + 1,
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="sr-only">Key dates</h1>

        {allEvents.length === 0 ? (
          <EmptyCalendarCard />
        ) : (
          <>
            {upcoming.length > 0 && (
              <Card>
                <CardHeader
                  title="Next up"
                  description="The next key dates on the calendar"
                  icon={
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <CalendarDays size={17} aria-hidden="true" />
                    </span>
                  }
                />
                <ol className="divide-y divide-zinc-100 border-t border-zinc-100">
                  {upcoming.map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3"
                    >
                      <time
                        dateTime={event.date}
                        className={cn(
                          "w-24 shrink-0 text-[13px] font-semibold",
                          event.date === todayIso
                            ? "text-brand-700"
                            : "text-zinc-600",
                        )}
                      >
                        {event.date === todayIso
                          ? "Today"
                          : shortDateLabel(event.date)}
                      </time>
                      <p className="min-w-0 flex-1 text-sm font-medium text-zinc-900">
                        {event.title}
                      </p>
                      <CategoryBadge category={event.category} />
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            <nav
              aria-label="Filter by category"
              className="flex flex-wrap gap-2"
            >
              {[
                {
                  value: undefined,
                  label: "All",
                  count: allEvents.length,
                },
                ...UNIVERSITY_CALENDAR_CATEGORIES.map((category) => ({
                  value: category.value,
                  label: category.label,
                  count: categoryCounts.get(category.value) ?? 0,
                })),
              ].map((chip) => {
                const isActive = chip.value === activeCategory;
                return (
                  <Link
                    key={chip.label}
                    href={keyDatesHref(requestedYear, chip.value)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium ring-1 transition ring-inset",
                      isActive
                        ? "bg-brand-700 text-white ring-brand-700"
                        : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-900",
                    )}
                  >
                    {chip.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {chip.count}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {months.length > 1 && (
              <nav
                aria-label="Jump to month"
                className="flex flex-wrap gap-x-1"
              >
                {months.map((month) => (
                  <a
                    key={month.key}
                    href={`#month-${month.key}`}
                    className="flex min-h-11 items-center rounded-lg px-2.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    {MONTH_SHORT_LABELS[Number(month.key.slice(5, 7)) - 1]}
                  </a>
                ))}
              </nav>
            )}

            {events.length === 0 && activeCategory ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-5 py-8 text-center">
                <p className="text-sm text-zinc-600">
                  No {categoryLabels.get(activeCategory)?.toLowerCase()} dates
                  match this filter.
                </p>
                <Link
                  href={keyDatesHref(requestedYear)}
                  className="mt-1 inline-flex min-h-11 items-center text-[13px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  Clear the category filter
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {months.map((month) => (
                  <section
                    key={month.key}
                    id={`month-${month.key}`}
                    aria-label={month.label}
                    className="scroll-mt-6"
                  >
                    <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                      {month.label}
                      <span className="ml-2 text-xs font-medium text-zinc-500">
                        {month.events.length}{" "}
                        {month.events.length === 1 ? "date" : "dates"}
                      </span>
                    </h2>
                    <ol className="mt-3">
                      {month.events.map((event) => (
                        <TimelineEvent
                          key={event.id}
                          event={event}
                          todayIso={todayIso}
                        />
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}

            <p className="border-t border-zinc-200 pt-4 text-xs text-zinc-500">
              Source:{" "}
              <a
                href={ANU_CALENDAR_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
              >
                ANU university calendar
                <ExternalLink
                  size={11}
                  aria-hidden="true"
                  className="ml-1 inline"
                />
              </a>
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
