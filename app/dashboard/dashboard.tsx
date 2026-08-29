"use client";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ListChecks,
  Map,
} from "lucide-react";
import { useMemo } from "react";
import { useCoursemap } from "@/app/providers";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { TermLoadChart } from "@/components/dashboard/term-load-chart";
import { UnitsTrendChart } from "@/components/dashboard/units-trend-chart";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
import { StatTile } from "@/components/ui/stat-tile";
import { DegreeProgressBar } from "@/components/plan/degree-progress-bar";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  cumulativeDashboardUnits,
  currentDashboardTermId,
  dashboardCalendarEvents,
  dashboardTermLoads,
} from "@/lib/coursemap/dashboard-series";
import {
  planTimelineTerms,
  planTimelineYears,
} from "@/lib/coursemap/plan-timeline";
import {
  degreeUnitProgress,
  effectiveStatus,
  planningCourseForAttempt,
  unitsForAttempt,
} from "@/lib/planner";

export function Dashboard({ catalogue }: { catalogue: PlanCatalogue }) {
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
    () =>
      planTimelineTerms({
        terms: catalogue.terms,
        years: timelineYears,
      }),
    [catalogue.terms, timelineYears],
  );
  const planningCatalogue = useMemo(
    () => ({ ...catalogue, terms: timelineTerms }),
    [catalogue, timelineTerms],
  );
  const progress = degreeUnitProgress(
    state.attempts,
    degree?.units ?? 0,
    planningCatalogue,
  );
  const planned = useMemo(
    () =>
      state.attempts
        .map((attempt) => ({
          attempt,
          course: planningCourseForAttempt(attempt, planningCatalogue),
          term: timelineTerms.find((term) => term.id === attempt.termId),
        }))
        .filter(
          (
            item,
          ): item is {
            attempt: (typeof state.attempts)[number];
            course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
            term: (typeof timelineTerms)[number] | undefined;
          } => Boolean(item.course),
        ),
    [planningCatalogue, state, timelineTerms],
  );
  const blocked = planned.filter(
    (item) =>
      effectiveStatus(item.attempt, state.attempts, planningCatalogue) ===
      "blocked",
  );
  const plannedUnits = planned.reduce(
    (total, item) =>
      item.attempt.status === "failed"
        ? total
        : total + unitsForAttempt(item.attempt, item.course),
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
  const dashboardCatalogue = useMemo(
    () => planningCatalogue,
    [planningCatalogue],
  );
  const termLoads = useMemo(
    () =>
      dashboardTermLoads({ ...dashboardCatalogue, attempts: state.attempts }),
    [dashboardCatalogue, state.attempts],
  );
  const cumulativeUnits = useMemo(
    () => cumulativeDashboardUnits(termLoads),
    [termLoads],
  );
  const calendarEvents = useMemo(
    () =>
      dashboardCalendarEvents({
        ...dashboardCatalogue,
        attempts: state.attempts,
      }),
    [dashboardCatalogue, state.attempts],
  );
  const currentTermId = useMemo(
    () => currentDashboardTermId(timelineTerms),
    [timelineTerms],
  );

  if (!degree) {
    return (
      <AppShell>
        <Card className="mx-auto w-full max-w-xl">
          <Empty className="min-h-64">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GraduationCap aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Set up your plan first</EmptyTitle>
              <EmptyDescription>
                Choose a published degree before Coursemap can calculate your
                progress.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <ButtonLink href="/onboarding">Start onboarding</ButtonLink>
            </EmptyContent>
          </Empty>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <h1 className="sr-only">{degree.name}</h1>

        <Card className="overflow-hidden">
          <CardHeader className="flex-col items-stretch p-5 sm:flex-row sm:items-start sm:p-6">
            <div>
              <CardTitle className="text-xs tracking-wide text-zinc-500 uppercase">
                Degree progress
              </CardTitle>
              <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                {progress.percent}% complete
              </p>
              <CardDescription className="mt-1 text-sm">
                {progress.completed} of {progress.total} units completed
              </CardDescription>
            </div>
            <CardAction>
              <ButtonLink href="/plan" size="sm" variant="secondary">
                <Map size={15} /> Edit plan
              </ButtonLink>
            </CardAction>
          </CardHeader>
          <CardContent className="sm:px-6 sm:pb-6">
            <DegreeProgressBar progress={progress} compact />
            {!catalogue.programmeRequirementsImported && (
              <p className="mt-4 text-xs leading-5 text-zinc-500">
                Programme rule coverage will appear once the official source is
                imported and reviewed.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            description={`${progress.completed} completed · ${progress.planned} planned · ${progress.total} units total`}
            icon={<GraduationCap aria-hidden="true" />}
            label="Degree progress"
            unit="%"
            value={progress.percent}
          />
          <StatTile
            description="Only published course years are shown."
            icon={<BookOpen aria-hidden="true" />}
            label="Courses in your plan"
            value={planned.length}
          />
          <StatTile
            description="Based on imported requisite references."
            icon={<AlertTriangle aria-hidden="true" />}
            label="Prerequisite alerts"
            value={blocked.length}
          />
          <StatTile
            description={`Across ${termLoads.filter((term) => term.units > 0).length} planned semesters`}
            icon={<Map aria-hidden="true" />}
            label="Scheduled load"
            unit="units"
            value={plannedUnits}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <UnitsTrendChart
            degreeUnits={progress.total}
            points={cumulativeUnits}
          />
          <MonthCalendar events={calendarEvents} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <TermLoadChart terms={termLoads} currentTermId={currentTermId} />
          <Card className="overflow-hidden">
            <CardHeader
              className="items-center border-b border-zinc-100"
              title="Next in your plan"
              description="Your next scheduled courses, drawn from the saved plan."
              action={
                <ButtonLink href="/plan" size="sm" variant="secondary">
                  Edit plan
                </ButtonLink>
              }
            />
            {nextCourses.length === 0 ? (
              <Empty className="rounded-none px-5 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookOpen aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No courses planned yet</EmptyTitle>
                  <EmptyDescription>
                    Choose a course from your plan board to get started.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="divide-y divide-zinc-100">
                {nextCourses.map(({ attempt, course, term }) => {
                  const status = effectiveStatus(
                    attempt,
                    state.attempts,
                    planningCatalogue,
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
          <Card>
            <CardHeader className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <ListChecks size={17} aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Plan checks</CardTitle>
                  <CardDescription className="mt-1 leading-5">
                    {blocked.length === 0
                      ? "No prerequisite conflicts are currently detected in imported course data."
                      : `${blocked.length} ${blocked.length === 1 ? "course needs" : "courses need"} a prerequisite check before enrolment.`}
                  </CardDescription>
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
            </CardHeader>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
