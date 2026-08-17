"use client";

import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { planningCourseByCode } from "@/lib/planner";

export function PlanCalendar({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const groups = useMemo(
    () =>
      catalogue.terms
        .filter((term) => term.id !== "unscheduled")
        .map((term) => ({
          term,
          courses: state.attempts
            .filter((attempt) => attempt.termId === term.id)
            .map((attempt) => ({
              attempt,
              course: planningCourseByCode(attempt.courseCode, catalogue),
            }))
            .filter(
              (
                entry,
              ): entry is {
                attempt: (typeof state.attempts)[number];
                course: NonNullable<ReturnType<typeof planningCourseByCode>>;
              } => Boolean(entry.course),
            ),
        }))
        .filter((group) => group.courses.length > 0),
    [catalogue, state],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">Study periods</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
              Plan calendar
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Coursemap shows confirmed course offerings. Timetable times and
              rooms are not imported yet.
            </p>
          </div>
          <ButtonLink href="/plan" size="sm" variant="secondary">
            Edit plan
          </ButtonLink>
        </header>

        {groups.length === 0 ? (
          <Card className="p-10 text-center">
            <CalendarDays className="mx-auto text-zinc-300" size={28} />
            <p className="mt-4 text-sm font-medium text-zinc-700">
              No courses scheduled in a published study period
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Add courses to your plan to see their published offerings here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map(({ term, courses }) => (
              <Card key={term.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">
                      {term.name} {term.year}
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">{term.dates}</p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {courses.length} course{courses.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {courses.map(({ attempt, course }) => (
                    <div
                      key={attempt.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <CourseToken
                        accent={course.accent}
                        code={course.code}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {course.code} · {course.name}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {course.delivery} · {attempt.status}
                        </p>
                      </div>
                      <ButtonLink
                        href={`/courses/${course.code}`}
                        size="sm"
                        variant="ghost"
                      >
                        <ExternalLink size={14} /> Details
                      </ButtonLink>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="flex items-center gap-2 text-xs text-zinc-400">
          <MapPin size={14} /> Do not use this planning view as a live ANU
          timetable.
        </p>
      </div>
    </AppShell>
  );
}
