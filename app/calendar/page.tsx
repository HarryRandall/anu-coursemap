import { AppShell } from "@/components/shell";
import { StudyCalendar } from "@/components/calendar/study-calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedTermId = Array.isArray(params.term)
    ? params.term[0]
    : params.term;

  return (
    <AppShell title="Calendar">
      <StudyCalendar requestedTermId={requestedTermId} />
    </AppShell>
  );
}
