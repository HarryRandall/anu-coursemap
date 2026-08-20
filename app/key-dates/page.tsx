import { CalendarDays, CircleAlert, ExternalLink } from "lucide-react";
import { UniversityCalendarView } from "@/components/key-dates/university-calendar-view";
import { AppShell } from "@/components/shell/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
    <Card>
      <Empty className="py-12 sm:py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No key dates published yet</EmptyTitle>
          <EmptyDescription>
            Key dates are imported from the official ANU university calendar.
            Once an import is published, semester starts, census dates and
            examination periods will appear here.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <a
            href={ANU_CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            View the ANU calendar
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </EmptyContent>
      </Empty>
    </Card>
  );
}

function CalendarLoadError({ retryHref }: { retryHref: string }) {
  return (
    <Card className="mx-auto max-w-xl p-4 sm:p-5">
      <Alert tone="warning" role="alert">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Key dates temporarily unavailable</AlertTitle>
        <AlertDescription>
          The published calendar could not be loaded. Please try again shortly.
        </AlertDescription>
      </Alert>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={retryHref} size="sm" variant="primary">
          Try again
        </ButtonLink>
        <a
          href={ANU_CALENDAR_URL}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          View the ANU calendar
          <ExternalLink size={14} aria-hidden="true" />
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
  let calendarUnavailable = false;
  try {
    data = await loadPublishedUniversityCalendar(requestedYear);
  } catch {
    calendarUnavailable = true;
  }

  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const allEvents = decorateUniversityCalendarEvents(data.events);
  const retryHref = requestedYear
    ? `/key-dates?year=${requestedYear}`
    : "/key-dates";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <h1 className="sr-only">Key dates</h1>

        {calendarUnavailable ? (
          <CalendarLoadError retryHref={retryHref} />
        ) : allEvents.length === 0 || data.year === null ? (
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
