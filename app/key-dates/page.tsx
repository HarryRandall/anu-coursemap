import { CalendarDays, ExternalLink } from "lucide-react";
import { UniversityCalendarView } from "@/components/key-dates/university-calendar-view";
import { AppShell } from "@/components/shell/app-shell";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { decorateUniversityCalendarEvents } from "@/lib/coursemap/university-calendar";
import {
  loadPublishedUniversityCalendar,
  type UniversityCalendarData,
} from "@/lib/coursemap/university-calendar-data";

export const dynamic = "force-dynamic";

const ANU_CALENDAR_URL =
  "https://www.anu.edu.au/directories/university-calendar";

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
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
  }>;
}) {
  const params = await searchParams;
  const rawYear = firstParam(params.year);
  const requestedYear = /^\d{4}$/.test(rawYear) ? Number(rawYear) : undefined;

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

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <h1 className="sr-only">Key dates</h1>

        {allEvents.length === 0 || data.year === null ? (
          <EmptyCalendarCard />
        ) : (
          <UniversityCalendarView
            key={data.year}
            allEvents={allEvents}
            availableYears={data.availableYears}
            sourceUrl={ANU_CALENDAR_URL}
            todayIso={todayIso}
            year={data.year}
          />
        )}
      </div>
    </AppShell>
  );
}
