"use client";

import { CircleAlert } from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { CourseMixChart } from "@/components/dashboard/course-mix-chart";
import { CourseProgressChart } from "@/components/dashboard/course-progress-chart";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { TermLoadChart } from "@/components/dashboard/term-load-chart";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { degreeByCode, majorByCode } from "@/lib/catalogue";
import {
  coursesByLevel,
  cumulativeUnitsByTerm,
  markSeries,
  unitsByTerm,
} from "@/lib/dashboard-series";
import { STANDARD_TERM_UNITS, degreeUnitProgress } from "@/lib/planner";
import { currentTermLoad } from "@/lib/study-calendar";
import {
  planIssues,
  recordedAverage,
  requirementProgress,
} from "@/lib/student-progress";

export default function DashboardPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const progress = degreeUnitProgress(state.attempts, degree.units);
  const load = currentTermLoad(state.attempts);
  const average = recordedAverage(state.attempts);
  const issues = planIssues(state.attempts);
  const cumulative = cumulativeUnitsByTerm(state.attempts);
  const perTerm = unitsByTerm(state.attempts);
  const marks = markSeries(state.attempts);
  const mix = coursesByLevel(state.attempts);
  const groups = requirementProgress(state.attempts, major.courseCodes);

  return (
    <AppShell title="Home" subtitle="Your degree at a glance">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Overview
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {degree.code} · {major.code} · {state.profile.catalogueYear}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {issues.length > 0 && (
              <ButtonLink href="/plan" variant="ghost" size="sm">
                <CircleAlert size={14} aria-hidden="true" />
                {issues.length} {issues.length === 1 ? "alert" : "alerts"}
              </ButtonLink>
            )}
            <ButtonLink href="/plan" size="sm">
              Open plan
            </ButtonLink>
          </div>
        </div>

        <MetricCards
          metrics={[
            {
              id: "complete",
              label: "Degree complete",
              value: `${progress.percent}%`,
              hint: `${progress.completed} of ${progress.total} units earned`,
              bars: cumulative.map((term) => ({
                key: term.id,
                value: term.completed,
                planned: term.planned,
                caption: `${term.label} · ${term.completed}u earned, ${term.units}u mapped`,
              })),
            },
            {
              id: "earned",
              label: "Units earned",
              value: String(progress.completed),
              hint: `${progress.planned} more mapped in the plan`,
              bars: perTerm.map((term) => ({
                key: term.id,
                value: term.completed,
                planned: term.planned,
                caption: `${term.label} · ${term.completed}u earned, ${term.planned}u planned`,
              })),
            },
            {
              id: "load",
              label: load.term
                ? `${load.term.shortName} ${load.term.year} load`
                : "Current load",
              value: `${load.units}u`,
              hint: `${load.courses} ${load.courses === 1 ? "course" : "courses"} this study period`,
              max: STANDARD_TERM_UNITS,
              bars: perTerm.map((term) => ({
                key: term.id,
                value: term.units,
                muted: term.id !== load.term?.id,
                caption: `${term.label} · ${term.units}u`,
              })),
            },
            {
              id: "average",
              label: "Recorded average",
              value: average ? String(average) : "Not set",
              hint: average
                ? "Weighted by units in Coursemap"
                : "No marks recorded yet",
              max: 100,
              bars: marks.map((point) => ({
                key: point.label,
                value: point.value,
                caption: `${point.label} · ${point.value}`,
              })),
              emptyLabel: "Add marks to see your results",
            },
          ]}
        />

        <section className="grid items-stretch gap-4 lg:grid-cols-2">
          <CourseProgressChart progressByGroup={groups} />
          <TermLoadChart terms={perTerm} currentTermId={load.term?.id} />
        </section>

        <section className="grid items-stretch gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <MonthCalendar attempts={state.attempts} />
          <CourseMixChart levels={mix} />
        </section>
      </div>
    </AppShell>
  );
}
