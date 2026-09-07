"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@coursemap/ui/primitives/alert";
import { useCoursemap } from "@/app/providers";
import { DegreeProgressHero } from "@/ui/dashboard/degree-progress-hero";
import {
  buildMetricViews,
  MetricCardView,
  type MetricCourse,
} from "@/ui/dashboard/metric-cards";
import { MonthCalendar } from "@/ui/dashboard/month-calendar";
import { PlanEmptyState } from "@/ui/dashboard/plan-empty-state";
import { RequirementsPanel } from "@/ui/dashboard/requirements-panel";
import {
  UniversityMetricsPreview,
  PlanningMetricsPreview,
  TuitionMetric,
} from "@/ui/dashboard/university-metrics-preview";
import { DegreeComposition } from "@/ui/dashboard/degree-composition";
import { AppShell } from "@/ui/shell";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  cumulativeDashboardUnits,
  currentDashboardTermId,
  dashboardCalendarEvents,
  dashboardTermLoads,
  type DashboardTermPoint,
} from "@/lib/coursemap/dashboard-series";
import { requirementBucketProgress } from "@/lib/coursemap/requirement-progress";
import {
  planTimelineTerms,
  planTimelineYears,
} from "@/lib/coursemap/plan-timeline";
import type { Term } from "@/lib/coursemap/types";
import {
  degreeUnitProgress,
  effectiveStatus,
  planningCourseForAttempt,
  unitsForAttempt,
} from "@/lib/planner";

function finishLabelFor(
  termLoads: readonly DashboardTermPoint[],
  terms: readonly Term[],
) {
  const last = [...termLoads].reverse().find((load) => load.units > 0);
  if (!last) return null;
  const term = terms.find((item) => item.id === last.id);
  if (term?.endsOn) {
    const date = new Date(`${term.endsOn}T00:00:00`);
    return date.toLocaleDateString("en-AU", {
      month: "short",
      year: "numeric",
    });
  }
  const suffix = last.id.split("-").at(-1);
  if (suffix === "s1") return `Jun ${last.year}`;
  if (suffix === "s2") return `Nov ${last.year}`;
  return `${term?.name ?? last.label} ${last.year}`;
}

export function Dashboard({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const previewMetrics = process.env.NODE_ENV === "development";
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
  const unitTarget = degree?.units ?? null;
  const progress = degreeUnitProgress(
    state.attempts,
    unitTarget ?? 0,
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
  const enrolledUnits = planned
    .filter((item) => item.attempt.status === "enrolled")
    .reduce(
      (total, item) => total + unitsForAttempt(item.attempt, item.course),
      0,
    );
  const termLoads = useMemo(
    () =>
      dashboardTermLoads({ ...planningCatalogue, attempts: state.attempts }),
    [planningCatalogue, state.attempts],
  );
  const cumulativeUnits = useMemo(
    () => cumulativeDashboardUnits(termLoads),
    [termLoads],
  );
  const calendarEvents = useMemo(
    () =>
      dashboardCalendarEvents({
        ...planningCatalogue,
        attempts: state.attempts,
      }),
    [planningCatalogue, state.attempts],
  );
  const currentTermId = useMemo(
    () => currentDashboardTermId(timelineTerms),
    [timelineTerms],
  );
  const buckets = useMemo(
    () =>
      requirementBucketProgress({
        requirements: catalogue.structureRequirements,
        attempts: state.attempts,
        catalogue: planningCatalogue,
      }),
    [catalogue.structureRequirements, planningCatalogue, state.attempts],
  );

  const metricViews = useMemo(() => {
    const coursesInTerm = (termId: string | undefined): MetricCourse[] =>
      termId
        ? planned
            .filter((item) => item.attempt.termId === termId)
            .map((item) => ({
              code: item.course.code,
              units: unitsForAttempt(item.attempt, item.course),
              ready: !["blocked", "approval"].includes(
                effectiveStatus(
                  item.attempt,
                  state.attempts,
                  planningCatalogue,
                ),
              ),
            }))
        : [];

    const currentIndex = termLoads.findIndex(
      (load) => load.id === currentTermId,
    );
    const firstPlannedIndex = termLoads.findIndex((load) => load.planned > 0);
    const focusIndex = currentIndex >= 0 ? currentIndex : firstPlannedIndex;
    const focus = focusIndex >= 0 ? termLoads[focusIndex] : undefined;
    const upcoming = focusIndex >= 0 ? termLoads.slice(focusIndex) : [];
    // Between semesters the focus already is the next one to start.
    const next =
      currentIndex >= 0
        ? upcoming.slice(1).find((load) => load.units > 0)
        : focus;

    return buildMetricViews({
      unitTarget,
      progress,
      enrolledUnits,
      cumulative: cumulativeUnits,
      buckets,
      focusTermLabel: focus?.label ?? null,
      focusCourses: coursesInTerm(focus?.id),
      nextTermLabel: next?.label ?? null,
      nextCourses: coursesInTerm(next?.id),
      upcoming,
      finishLabel: finishLabelFor(termLoads, timelineTerms),
    });
  }, [
    buckets,
    cumulativeUnits,
    currentTermId,
    enrolledUnits,
    planned,
    planningCatalogue,
    progress,
    state.attempts,
    termLoads,
    timelineTerms,
    unitTarget,
  ]);

  if (!degree) {
    return (
      <AppShell fill>
        <PlanEmptyState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex flex-col gap-6">
        <h1 className="sr-only">Dashboard</h1>

        {unitTarget === null && (
          <Alert>
            <TriangleAlert
              aria-hidden="true"
              className="text-amber-600 dark:text-amber-400"
            />
            <AlertTitle>Unit target not recorded</AlertTitle>
            <AlertDescription>
              {progress.completed} completed and {progress.planned} planned
              units are mapped, but the published programme has no total unit
              target, so no completion percentage can be calculated.
            </AlertDescription>
          </Alert>
        )}

        <section aria-label="Your metrics" className="flex flex-col gap-4">
          {previewMetrics ? (
            <UniversityMetricsPreview />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCardView view={metricViews["completion-ring"]} />
              <MetricCardView view={metricViews.remaining} />
              <TuitionMetric />
              <MetricCardView view={metricViews.readiness} />
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
          <DegreeProgressHero
            progress={progress}
            unitTarget={unitTarget}
            enrolledUnits={enrolledUnits}
          />
          <RequirementsPanel
            buckets={buckets}
            requirementsImported={catalogue.programmeRequirementsImported}
          />
        </div>

        {previewMetrics ? (
          <PlanningMetricsPreview />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(["load", "coverage", "semester-bars"] as const).map((id) => (
              <MetricCardView compact key={id} view={metricViews[id]} />
            ))}
          </div>
        )}

        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <DegreeComposition
            courseLinks={Object.fromEntries(
              catalogue.courses.map((course) => [
                course.code,
                `/courses/${course.code}?year=${course.year}`,
              ]),
            )}
          />
          <MonthCalendar events={calendarEvents} />
        </div>

        {!catalogue.programmeRequirementsImported && (
          <Alert>
            <TriangleAlert aria-hidden="true" className="text-primary" />
            <AlertTitle>Programme rules are not imported yet</AlertTitle>
            <AlertDescription>
              Rule coverage and requirement checking appear once the official
              source has been imported and reviewed.{" "}
              <Link
                href="/admin"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Open the admin console
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AppShell>
  );
}
