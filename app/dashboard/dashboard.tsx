"use client";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Map,
} from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  degreeUnitProgress,
  effectiveStatus,
  planningCourseByCode,
} from "@/lib/planner";

export function Dashboard({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const major = catalogue.majors.find(
    (item) => item.code === state.profile.majorCode,
  );
  const progress = degreeUnitProgress(
    state.attempts,
    degree?.units ?? 0,
    catalogue,
  );
  const planned = useMemo(
    () =>
      state.attempts
        .map((attempt) => ({
          attempt,
          course: planningCourseByCode(attempt.courseCode, catalogue),
          term: catalogue.terms.find((term) => term.id === attempt.termId),
        }))
        .filter(
          (
            item,
          ): item is {
            attempt: (typeof state.attempts)[number];
            course: NonNullable<ReturnType<typeof planningCourseByCode>>;
            term: (typeof catalogue.terms)[number] | undefined;
          } => Boolean(item.course),
        ),
    [catalogue, state],
  );
  const blocked = planned.filter(
    (item) =>
      effectiveStatus(item.attempt, state.attempts, catalogue) === "blocked",
  );

  if (!degree) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center ring-1 ring-zinc-200">
          <GraduationCap className="mx-auto text-brand-600" size={28} />
          <h1 className="mt-4 text-xl font-semibold text-zinc-950">
            Set up your plan first
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Choose a published degree before Coursemap can calculate your
            progress.
          </p>
          <ButtonLink className="mt-5" href="/onboarding">
            Start onboarding
          </ButtonLink>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">Your degree</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
              {degree.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {degree.code} · {state.profile.catalogueYear} catalogue
              {major ? ` · ${major.name}` : ""}
            </p>
          </div>
          <ButtonLink href="/plan" size="sm">
            <Map size={15} /> Open plan
          </ButtonLink>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs font-medium text-zinc-500">Degree progress</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              {progress.percent}%
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {progress.completed} completed · {progress.planned} planned ·{" "}
              {progress.total} units total
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium text-zinc-500">
              Courses in your plan
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              {planned.length}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Only published catalogue courses are shown.
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium text-zinc-500">
              Prerequisite alerts
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              {blocked.length}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Based on imported requisite references.
            </p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Your course plan
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                The latest saved courses and their study periods.
              </p>
            </div>
            <ButtonLink href="/plan" size="sm" variant="secondary">
              Edit plan
            </ButtonLink>
          </div>
          {planned.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <BookOpen className="mx-auto text-zinc-300" size={24} />
              <p className="mt-3 text-sm font-medium text-zinc-700">
                No courses planned yet
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Choose a course from your plan board to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {planned.map(({ attempt, course, term }) => {
                const status = effectiveStatus(
                  attempt,
                  state.attempts,
                  catalogue,
                );
                return (
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
                        {term ? `${term.name} ${term.year}` : "Later"}
                      </p>
                    </div>
                    {status === "blocked" ? (
                      <Badge tone="warning">
                        <AlertTriangle size={12} /> Needs prerequisites
                      </Badge>
                    ) : attempt.status === "completed" ? (
                      <Badge tone="success">
                        <CheckCircle2 size={12} /> Completed
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Planned</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {!catalogue.programmeRequirementsImported && (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs leading-5 text-zinc-600">
            Course-level planning is live. Detailed programme requirement
            mapping will appear after its source structure has been imported and
            reviewed.
          </p>
        )}
      </div>
    </AppShell>
  );
}
