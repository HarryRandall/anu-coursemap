"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock3,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import { cn } from "@/lib/cn";
import { courseByCode, terms } from "@/lib/catalogue";
import { statusLabel } from "@/lib/planner";
import { statusTone } from "@/lib/ui";

const scheduledTerms = terms.filter((term) => term.id !== "unscheduled");

export default function CalendarPage() {
  const { state } = useCoursemap();
  const firstPlannedTerm = scheduledTerms.find((term) =>
    state.attempts.some(
      (attempt) => attempt.termId === term.id && attempt.status !== "failed",
    ),
  );
  const [termId, setTermId] = useState(
    firstPlannedTerm?.id ?? scheduledTerms[0].id,
  );
  const selectedTerm =
    scheduledTerms.find((term) => term.id === termId) ?? scheduledTerms[0];
  const termAttempts = state.attempts.filter(
    (attempt) =>
      attempt.termId === selectedTerm.id && attempt.status !== "failed",
  );
  const plannedTerms = scheduledTerms.filter((term) =>
    state.attempts.some(
      (attempt) => attempt.termId === term.id && attempt.status !== "failed",
    ),
  );

  return (
    <AppShell title="Calendar" subtitle="Your study periods and key dates">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600">
              Plan-derived calendar
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Your study calendar
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              See when your planned courses sit without inventing class times or
              room information.
            </p>
          </div>
          <ButtonLink href="/plan" variant="secondary" size="sm">
            Edit plan
          </ButtonLink>
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <CardHeader
              title="Study periods"
              description={`${plannedTerms.length} periods with courses`}
              icon={
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <CalendarDays size={17} />
                </span>
              }
            />
            <div className="divide-y divide-zinc-100 border-t border-zinc-100">
              {scheduledTerms.map((term) => {
                const count = state.attempts.filter(
                  (attempt) =>
                    attempt.termId === term.id && attempt.status !== "failed",
                ).length;
                const selected = term.id === selectedTerm.id;
                return (
                  <button
                    key={term.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTermId(term.id)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400",
                      selected
                        ? "bg-brand-50 text-brand-800"
                        : "hover:bg-zinc-50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg text-[10px] font-bold",
                        selected
                          ? "bg-brand-600 text-white"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {term.shortName}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold">
                        {term.name} {term.year}
                      </span>
                      <span className="block text-[11px] text-zinc-500">
                        {count === 0
                          ? "No courses"
                          : `${count} ${count === 1 ? "course" : "courses"}`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title={`${selectedTerm.name} ${selectedTerm.year}`}
              description={selectedTerm.dates}
              action={
                <Badge tone="neutral">{termAttempts.length} courses</Badge>
              }
              icon={
                <span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-600">
                  <CalendarClock size={17} />
                </span>
              }
            />

            {termAttempts.length > 0 ? (
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {termAttempts.map((attempt) => {
                  const course = courseByCode(attempt.courseCode);
                  if (!course) return null;
                  return (
                    <Link
                      key={attempt.id}
                      href={`/courses/${course.code}`}
                      className="flex min-h-16 items-center gap-3 px-5 py-3 transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400"
                    >
                      <CourseToken
                        code={course.code}
                        accent={course.accent}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-zinc-900">
                          {course.code}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {course.name}
                        </span>
                      </span>
                      <Badge tone={statusTone[attempt.status]}>
                        {statusLabel(attempt.status)}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="border-t border-zinc-100 px-5 py-14 text-center">
                <CalendarDays className="mx-auto text-zinc-300" size={26} />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  Nothing planned for this study period
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Add a course or move one here from your plan.
                </p>
                <ButtonLink href="/plan" size="sm" className="mt-4">
                  Open plan
                </ButtonLink>
              </div>
            )}
          </Card>
        </div>

        <section className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Clock3,
              title: "Class timetable",
              copy: "Verified class times and weekly timetable views will appear here when a dependable source is connected.",
            },
            {
              icon: ClipboardList,
              title: "Assessments and dates",
              copy: "Add assessment deadlines and important study dates to one calendar without mixing them with catalogue estimates.",
            },
            {
              icon: MapPin,
              title: "Rooms and directions",
              copy: "Move from a scheduled class to room details and campus directions through the planned Room Finder.",
              href: "/rooms",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                    <Icon size={17} />
                  </span>
                  <Badge tone="neutral">Coming soon</Badge>
                </div>
                <h2 className="mt-4 text-sm font-semibold text-zinc-900">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {item.copy}
                </p>
                {item.href && (
                  <ButtonLink
                    href={item.href}
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-2"
                  >
                    View Room Finder <ArrowRight size={14} />
                  </ButtonLink>
                )}
              </Card>
            );
          })}
        </section>

        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          Coursemap currently shows catalogue study-period ranges and your own
          plan. Confirm official teaching dates, class times and locations with
          ANU before relying on them.
        </p>
      </div>
    </AppShell>
  );
}
