import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { courseByCode, terms, type Attempt, type Term } from "@/lib/catalogue";
import { STANDARD_COURSE_SLOTS } from "@/lib/planner";
import { accent } from "@/lib/ui";

function attemptsForTerm(attempts: Attempt[], termId: string) {
  return attempts.filter(
    (attempt) => attempt.termId === termId && attempt.status !== "failed",
  );
}

function YearCalendar({
  year,
  yearTerms,
  attempts,
  highlightTermId,
}: {
  year: number;
  yearTerms: Term[];
  attempts: Attempt[];
  highlightTermId?: string;
}) {
  return (
    <div>
      <p className="mb-2 px-0.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        {year}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {yearTerms.map((term) => {
          const placed = attemptsForTerm(attempts, term.id);
          const emptySlots = Math.max(0, STANDARD_COURSE_SLOTS - placed.length);
          const highlighted = term.id === highlightTermId;
          return (
            <div
              key={term.id}
              className={cn(
                "rounded-xl p-2.5 ring-1 ring-inset",
                highlighted
                  ? "bg-brand-50 ring-brand-200"
                  : "bg-zinc-50/80 ring-zinc-200/80",
              )}
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-[12px] font-semibold text-zinc-800">
                  {term.shortName}
                </p>
                <p className="text-[10px] text-zinc-400">{term.dates}</p>
              </div>
              <ul className="flex flex-col gap-1">
                {placed.map((attempt) => {
                  const course = courseByCode(attempt.courseCode);
                  if (!course) return null;
                  return (
                    <li
                      key={attempt.id}
                      className="flex min-h-8 items-center gap-1.5 rounded-lg bg-white px-1.5 ring-1 ring-zinc-200/70"
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-md font-mono text-[8px] font-bold",
                          accent[course.accent].token,
                        )}
                        aria-hidden="true"
                      >
                        {course.code.slice(0, 2)}
                      </span>
                      <span className="truncate font-mono text-[10px] font-semibold text-zinc-700">
                        {course.code}
                      </span>
                    </li>
                  );
                })}
                {Array.from({ length: emptySlots }, (_, index) => (
                  <li
                    key={`${term.id}-empty-${index}`}
                    className="min-h-8 rounded-lg border border-dashed border-zinc-200/90 bg-white/60"
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudyCalendarPreview({ attempts }: { attempts: Attempt[] }) {
  const scheduled = terms.filter((term) => term.id !== "unscheduled");
  const years = [...new Set(scheduled.map((term) => term.year))];
  const highlightTerm =
    scheduled.find((term) =>
      attempts.some(
        (attempt) =>
          attempt.termId === term.id &&
          (attempt.status === "planned" || attempt.status === "enrolled"),
      ),
    ) ?? scheduled[0];
  const plannedCount = scheduled.filter(
    (term) => attemptsForTerm(attempts, term.id).length > 0,
  ).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Study calendar"
        description={
          plannedCount === 0
            ? "A quiet year view until you place your first course."
            : `${plannedCount} study periods with courses`
        }
        icon={
          <span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-600">
            <CalendarDays size={17} aria-hidden="true" />
          </span>
        }
        action={
          <Link
            href="/calendar"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Open calendar
          </Link>
        }
      />
      <div className="grid gap-4 border-t border-zinc-100 px-4 py-4 sm:px-5 lg:grid-cols-3">
        {years.map((year) => (
          <YearCalendar
            key={year}
            year={year}
            yearTerms={scheduled.filter((term) => term.year === year)}
            attempts={attempts}
            highlightTermId={highlightTerm.id}
          />
        ))}
      </div>
    </Card>
  );
}
