"use client";

import { BookOpenCheck, CircleAlert, ListChecks } from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { degreeUnitProgress, planningCourseByCode } from "@/lib/planner";

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
    [catalogue, state],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <h1 className="sr-only">Requirements</h1>

        {!degree ? (
          <Card className="p-8 text-center">
            <ListChecks className="mx-auto text-brand-600" size={28} />
            <p className="mt-4 text-sm text-zinc-700">
              Select a published degree in onboarding to begin.
            </p>
            <ButtonLink className="mt-5" href="/onboarding">
              Start onboarding
            </ButtonLink>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Overall unit progress
                  </h2>
                </div>
                <strong className="text-2xl tracking-tight text-zinc-950">
                  {progress.percent}%
                </strong>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <span
                  className="block h-full bg-brand-700"
                  style={{ width: `${Math.min(100, progress.percent)}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-600">
                {progress.completed} completed units · {progress.planned}{" "}
                planned units · {progress.remaining} units still to plan
              </p>
            </Card>

            {!catalogue.programmeRequirementsImported && (
              <Card className="border-amber-200 bg-amber-50/60 p-5">
                <div className="flex gap-3">
                  <CircleAlert
                    className="mt-0.5 shrink-0 text-amber-700"
                    size={18}
                  />
                  <div>
                    <h2 className="text-sm font-semibold text-amber-950">
                      Detailed requirement mapping is not imported yet
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      Coursemap will not pretend that the old sample core,
                      elective or major buckets are this degree&apos;s official
                      rules. Imported programme requirements will replace this
                      notice when they are reviewed.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Courses currently in your plan
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Published course data only.
                </p>
              </div>
              {courses.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-zinc-500">
                  No planned or recorded courses yet.
                </p>
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
                          {course.units} units · {attempt.status}
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
