"use client";

import { BookOpenCheck, CircleAlert, ListChecks } from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  degreeUnitProgress,
  planningCourseForAttempt,
  unitsForAttempt,
} from "@/lib/planner";

export function Requirements({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const progress = degreeUnitProgress(
    state.attempts,
    degree?.units ?? 0,
    catalogue,
  );
  const courses = useMemo(
    () =>
      state.attempts
        .map((attempt) => ({
          attempt,
          course: planningCourseForAttempt(attempt, catalogue),
        }))
        .filter(
          (
            entry,
          ): entry is {
            attempt: (typeof state.attempts)[number];
            course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
          } => Boolean(entry.course),
        ),
    [catalogue, state],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <h1 className="sr-only">Requirements</h1>

        {!degree ? (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Choose a published degree</EmptyTitle>
                <EmptyDescription>
                  Select a published degree in onboarding to begin.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <ButtonLink href="/onboarding">Start onboarding</ButtonLink>
              </EmptyContent>
            </Empty>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="px-5 pt-5 pb-4">
                <CardTitle>Overall unit progress</CardTitle>
                <CardAction>
                  <strong className="text-2xl tracking-tight text-zinc-950">
                    {progress.percent}%
                  </strong>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                  <span
                    className="block h-full bg-brand-700"
                    style={{ width: `${Math.min(100, progress.percent)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-zinc-600">
                  {progress.completed} completed units · {progress.planned}{" "}
                  planned units · {progress.remaining} units still to plan
                </p>
              </CardContent>
            </Card>

            {!catalogue.programmeRequirementsImported && (
              <Alert tone="warning" className="rounded-xl px-5 py-4">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  Detailed requirement mapping is not imported yet
                </AlertTitle>
                <AlertDescription>
                  Coursemap will not pretend that the old sample core, elective
                  or major buckets are this degree&apos;s official rules.
                  Imported programme requirements will replace this notice when
                  they are reviewed.
                </AlertDescription>
              </Alert>
            )}

            <Card className="overflow-hidden">
              <CardHeader
                className="border-b border-zinc-100"
                title="Courses currently in your plan"
                description="Published course data only."
              />
              {courses.length === 0 ? (
                <Empty className="rounded-none">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BookOpenCheck aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No planned or recorded courses yet</EmptyTitle>
                    <EmptyDescription>
                      Add courses to your plan to track them here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
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
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900">
                          {course.code} · {course.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {unitsForAttempt(attempt, course)} units ·{" "}
                          {attempt.status}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        <p className="flex items-center gap-2 text-xs text-zinc-400">
          <BookOpenCheck size={14} /> Always confirm enrolment and graduation
          requirements with ANU.
        </p>
      </div>
    </AppShell>
  );
}
