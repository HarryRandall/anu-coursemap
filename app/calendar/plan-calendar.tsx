"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  planTimelineTerms,
  planTimelineYears,
} from "@/lib/coursemap/plan-timeline";
import { planningCourseForAttempt } from "@/lib/planner";

export function PlanCalendar({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const timelineYears = useMemo(
    () =>
      planTimelineYears({
        degree,
        commencementYear: state.profile.commencementYear,
        extensionYears: state.profile.extensionYears,
      }),
    [degree, state.profile.commencementYear, state.profile.extensionYears],
  );
  const timelineTerms = useMemo(
    () => planTimelineTerms({ terms: catalogue.terms, years: timelineYears }),
    [catalogue.terms, timelineYears],
  );
  const planningCatalogue = useMemo(
    () => ({ ...catalogue, terms: timelineTerms }),
    [catalogue, timelineTerms],
  );
  const groups = useMemo(
    () =>
      timelineTerms
        .filter((term) => term.id !== "unscheduled")
        .map((term) => ({
          term,
          courses: state.attempts
            .filter((attempt) => attempt.termId === term.id)
            .map((attempt) => ({
              attempt,
              course: planningCourseForAttempt(attempt, planningCatalogue),
            }))
            .filter(
              (
                entry,
              ): entry is {
                attempt: (typeof state.attempts)[number];
                course: NonNullable<
                  ReturnType<typeof planningCourseForAttempt>
                >;
              } => Boolean(entry.course),
            ),
        }))
        .filter((group) => group.courses.length > 0),
    [planningCatalogue, state, timelineTerms],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <h1 className="sr-only">Plan calendar</h1>

        {groups.length === 0 ? (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  No courses scheduled in a published study period
                </EmptyTitle>
                <EmptyDescription>
                  Add courses to your plan to see their published offerings
                  here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map(({ term, courses }) => (
              <Card key={term.id} className="overflow-hidden">
                <CardHeader
                  className="items-center border-b border-zinc-100"
                  title={`${term.name} ${term.year}`}
                  description={term.dates}
                  action={
                    <span className="text-xs text-zinc-500">
                      {courses.length} course{courses.length === 1 ? "" : "s"}
                    </span>
                  }
                />
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
                        href={`/courses/${course.code}?year=${course.year}`}
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
      </div>
    </AppShell>
  );
}
