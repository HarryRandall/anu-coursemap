"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  ListChecks,
  Map,
} from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import { DegreeProgressBar } from "@/components/plan/degree-progress-bar";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  planTimelineTerms,
  planTimelineYears,
} from "@/lib/coursemap/plan-timeline";
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
  const timelineYears = planTimelineYears({
    degree,
    commencementYear: state.profile.commencementYear,
    extensionYears: state.profile.extensionYears,
  });
  const timelineTerms = planTimelineTerms({
    terms: catalogue.terms,
    years: timelineYears,
  });
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
          term: timelineTerms.find((term) => term.id === attempt.termId),
        }))
        .filter(
          (
            item,
          ): item is {
            attempt: (typeof state.attempts)[number];
            course: NonNullable<ReturnType<typeof planningCourseByCode>>;
            term: (typeof timelineTerms)[number] | undefined;
          } => Boolean(item.course),
        ),
    [catalogue, state, timelineTerms],
  );
  const blocked = planned.filter(
    (item) =>
      effectiveStatus(item.attempt, state.attempts, catalogue) === "blocked",
  );
  const plannedUnits = planned.reduce(
    (total, item) =>
      item.attempt.status === "failed" ? total : total + item.course.units,
    0,
  );
  const nextCourses = planned
    .filter((item) => item.attempt.status !== "completed")
    .sort(
      (left, right) =>
        (left.term?.year ?? 9999) - (right.term?.year ?? 9999) ||
        (left.term?.id ?? "").localeCompare(right.term?.id ?? ""),
    )
    .slice(0, 5);
  const termLoads = timelineTerms
    .filter((term) => term.id !== "unscheduled")
    .map((term) => ({
      term,
      units: planned
        .filter((item) => item.attempt.termId === term.id)
        .reduce((total, item) => total + item.course.units, 0),
    }))
    .filter((item) => item.units > 0);

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
            <p className="text-sm font-medium text-brand-700">
              Welcome back
              {state.profile.name
                ? `, ${state.profile.name.split(" ")[0]}`
                : ""}
            </p>
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

        <Card className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Degree progress
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                {progress.percent}% complete
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {progress.completed} of {progress.total} units completed
              </p>
            </div>
            <ButtonLink href="/plan" size="sm" variant="secondary">
              <Map size={15} /> Edit plan
            </ButtonLink>
          </div>
          <div className="mt-5">
            <DegreeProgressBar progress={progress} compact />
          </div>
          {!catalogue.programmeRequirementsImported && (
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Programme rule coverage will appear once the official source is
              imported and reviewed.
            </p>
          )}
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <Card className="p-5">
            <p className="text-xs font-medium text-zinc-500">Scheduled load</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              {plannedUnits}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              units across {termLoads.length} planned semesters
            </p>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Next in your plan
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Your next scheduled courses, drawn from the saved plan.
                </p>
              </div>
              <ButtonLink href="/plan" size="sm" variant="secondary">
                Edit plan
              </ButtonLink>
            </div>
            {nextCourses.length === 0 ? (
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
                {nextCourses.map(({ attempt, course, term }) => {
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
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4">
                <CalendarDays size={17} className="text-brand-600" />
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Semester load
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    A live view of planned units.
                  </p>
                </div>
              </div>
              <div className="space-y-3 p-5">
                {termLoads.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Add courses to see your semester load.
                  </p>
                ) : (
                  termLoads.map(({ term, units }) => (
                    <div key={term.id}>
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="font-medium text-zinc-700">
                          {term.shortName} {term.year}
                        </span>
                        <span
                          className={
                            units > 24
                              ? "font-semibold text-amber-700"
                              : "text-zinc-500"
                          }
                        >
                          {units} / 24 units
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={
                            units > 24
                              ? "h-full bg-amber-400"
                              : "h-full bg-brand-500"
                          }
                          style={{
                            width: `${Math.min(100, (units / 24) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <ListChecks size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Plan checks
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {blocked.length === 0
                      ? "No prerequisite conflicts are currently detected in imported course data."
                      : `${blocked.length} ${blocked.length === 1 ? "course needs" : "courses need"} a prerequisite check before enrolment.`}
                  </p>
                  <ButtonLink
                    href="/requirements"
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                  >
                    Review requirements
                  </ButtonLink>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
