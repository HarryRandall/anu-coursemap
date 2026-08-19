import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  MapPin,
  PenLine,
  TreePalm,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  UNIVERSITY_CALENDAR_CATEGORIES,
  type UniversityCalendarCategory,
  type UniversityCalendarEvent,
} from "@/lib/coursemap/university-calendar";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const categoryPresentation: Record<
  UniversityCalendarCategory,
  {
    icon: LucideIcon;
    tone: "brand" | "danger" | "warning" | "success" | "info" | "neutral";
    dot: string;
  }
> = {
  teaching: { icon: BookOpen, tone: "brand", dot: "bg-brand-500" },
  examinations: { icon: PenLine, tone: "danger", dot: "bg-rose-500" },
  enrolment: {
    icon: ClipboardCheck,
    tone: "warning",
    dot: "bg-amber-500",
  },
  graduation: {
    icon: GraduationCap,
    tone: "success",
    dot: "bg-emerald-500",
  },
  holiday: { icon: TreePalm, tone: "info", dot: "bg-sky-500" },
  campus: { icon: MapPin, tone: "neutral", dot: "bg-zinc-500" },
};

const categoryLabels = new Map(
  UNIVERSITY_CALENDAR_CATEGORIES.map((category) => [
    category.value,
    category.label,
  ]),
);

function keyDatesHref(year: number, month?: string) {
  const query = new URLSearchParams({ year: String(year) });
  if (month) query.set("month", month);
  return `/key-dates?${query.toString()}`;
}

function monthParts(month: string) {
  return {
    year: Number(month.slice(0, 4)),
    monthIndex: Number(month.slice(5, 7)) - 1,
  };
}

function monthLabel(month: string) {
  const { year, monthIndex } = monthParts(month);
  return `${monthNames[monthIndex]} ${year}`;
}

function monthCells(month: string) {
  const { year, monthIndex } = monthParts(month);
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const leading = (firstWeekday + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - leading + 1;
    return day > 0 && day <= days ? day : null;
  });
}

function isoDate(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function weekdayLabel(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
}

function shortDateLabel(date: string) {
  return `${weekdayLabel(date)} ${Number(date.slice(8, 10))} ${
    monthShortNames[Number(date.slice(5, 7)) - 1]
  }`;
}

function adjacentMonth(month: string, delta: number) {
  const { year, monthIndex } = monthParts(month);
  const next = new Date(Date.UTC(year, monthIndex + delta, 1));
  if (next.getUTCFullYear() !== year) return null;
  return `${year}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
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
  focusMonth,
  sourceUrl,
  todayIso,
  year,
}: {
  allEvents: UniversityCalendarEvent[];
  availableYears: number[];
  focusMonth: string;
  sourceUrl: string;
  todayIso: string;
  year: number;
}) {
  const monthEvents = allEvents.filter(
    (event) => event.date.slice(0, 7) === focusMonth,
  );
  const eventsByDate = new Map<string, UniversityCalendarEvent[]>();
  for (const event of monthEvents) {
    const dayEvents = eventsByDate.get(event.date);
    if (dayEvents) dayEvents.push(event);
    else eventsByDate.set(event.date, [event]);
  }
  const previousMonth = adjacentMonth(focusMonth, -1);
  const nextMonth = adjacentMonth(focusMonth, 1);

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-zinc-400 uppercase">
                University calendar
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">
                {monthLabel(focusMonth)}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {previousMonth ? (
                <Link
                  href={keyDatesHref(year, previousMonth)}
                  aria-label={`View ${monthLabel(previousMonth)}`}
                  className="grid size-11 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                </Link>
              ) : (
                <span className="grid size-11 place-items-center text-zinc-300">
                  <ChevronLeft size={17} aria-hidden="true" />
                </span>
              )}
              {nextMonth ? (
                <Link
                  href={keyDatesHref(year, nextMonth)}
                  aria-label={`View ${monthLabel(nextMonth)}`}
                  className="grid size-11 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
              ) : (
                <span className="grid size-11 place-items-center text-zinc-300">
                  <ChevronRight size={17} aria-hidden="true" />
                </span>
              )}
            </div>
          </div>

          {availableYears.length > 1 ? (
            <nav aria-label="Calendar year" className="mt-3 flex gap-1">
              {availableYears.map((availableYear) => (
                <Link
                  key={availableYear}
                  href={keyDatesHref(availableYear)}
                  aria-current={availableYear === year ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
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

          <div className="mt-4 grid grid-cols-7">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="pb-2 text-center text-[10px] font-semibold tracking-wide text-zinc-400 uppercase"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-zinc-200 ring-1 ring-zinc-200">
            {monthCells(focusMonth).map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    aria-hidden="true"
                    className="min-h-11 bg-zinc-50/80"
                  />
                );
              }
              const date = isoDate(focusMonth, day);
              const dayEvents = eventsByDate.get(date) ?? [];
              const isToday = date === todayIso;
              const content = (
                <>
                  <time
                    dateTime={date}
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-xs font-semibold",
                      isToday
                        ? "bg-brand-700 text-white"
                        : "text-zinc-700 group-hover:bg-zinc-100",
                    )}
                  >
                    {day}
                  </time>
                  {dayEvents.length > 0 ? (
                    <span
                      className="mt-auto flex items-center gap-1"
                      aria-hidden="true"
                    >
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            categoryPresentation[event.category].dot,
                          )}
                        />
                      ))}
                      {dayEvents.length > 3 ? (
                        <span className="text-[9px] font-medium text-zinc-400">
                          +{dayEvents.length - 3}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </>
              );
              const cellClasses =
                "group flex min-h-11 flex-col bg-white p-1 text-left transition";
              return dayEvents.length > 0 ? (
                <a
                  key={date}
                  href={`#date-${dayEvents[0].id}`}
                  className={cn(
                    cellClasses,
                    "hover:bg-brand-50/40 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand-600",
                  )}
                  aria-label={`${shortDateLabel(date)}, ${dayEvents.length} ${dayEvents.length === 1 ? "date" : "dates"}: ${dayEvents.map((event) => event.title).join(", ")}`}
                >
                  {content}
                </a>
              ) : (
                <div key={date} className={cellClasses}>
                  {content}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Dates this month
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {monthEvents.length} {monthEvents.length === 1 ? "date" : "dates"}
            </p>
          </div>
          {monthEvents.length > 0 ? (
            <ol className="divide-y divide-zinc-100 border-t border-zinc-100">
              {monthEvents.map((event) => {
                const isToday = event.date === todayIso;
                return (
                  <li
                    key={event.id}
                    id={`date-${event.id}`}
                    className="grid scroll-mt-4 gap-2 px-5 py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <time
                      dateTime={event.date}
                      className={cn(
                        "text-xs font-semibold",
                        isToday ? "text-brand-700" : "text-zinc-500",
                      )}
                    >
                      {isToday ? "Today" : shortDateLabel(event.date)}
                    </time>
                    <p className="text-[13px] leading-snug font-medium text-zinc-900">
                      {event.title}
                    </p>
                    <div className="justify-self-start sm:justify-self-end">
                      <CategoryBadge category={event.category} />
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="border-t border-zinc-100 px-5 py-10 text-sm text-zinc-500">
              No published dates in this month.
            </p>
          )}
        </Card>
      </div>

      <p className="text-xs text-zinc-500">
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
