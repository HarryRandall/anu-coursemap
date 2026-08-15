"use client";

import { CircleAlert } from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { CourseMixChart } from "@/components/dashboard/course-mix-chart";
import { CourseProgressChart } from "@/components/dashboard/course-progress-chart";
import { MetricsPanel } from "@/components/dashboard/metrics-panel";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { TermLoadChart } from "@/components/dashboard/term-load-chart";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { degreeByCode, majorByCode } from "@/lib/catalogue";
import {
  coursesByLevel,
  cumulativeCompletedByTerm,
  loadByTerm,
  markSeries,
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
  const completed = cumulativeCompletedByTerm(state.attempts);
  const loads = loadByTerm(state.attempts);
  const marks = markSeries(state.attempts);
  const mix = coursesByLevel(state.attempts);
  const groups = requirementProgress(state.attempts, major.courseCodes);

  return (
    <AppShell title="Home" subtitle="Your degree at a glance">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
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

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            Performance
          </h2>
          <Card className="overflow-hidden">
            <MetricsPanel
              metrics={[
                {
                  id: "complete",
                  label: "Degree complete",
                  value: `${progress.percent}%`,
                  hint: `${progress.completed} of ${progress.total} units`,
                  points: completed.map((point) => ({
                    label: point.label,
                    value: (point.value / progress.total) * 100,
                  })),
                  format: (value) => `${Math.round(value)}%`,
                },
                {
                  id: "earned",
                  label: "Units earned",
                  value: String(progress.completed),
                  hint: `${progress.planned} still in the plan`,
                  points: completed,
                  format: (value) => `${value} units`,
                },
                {
                  id: "load",
                  label: load.term
                    ? `${load.term.shortName} ${load.term.year}`
                    : "This period",
                  value: String(load.units),
                  hint: `${load.courses} ${load.courses === 1 ? "course" : "courses"} · ${STANDARD_TERM_UNITS}u load`,
                  points: loads.map((item) => ({
                    label: item.label,
                    value: item.units,
                  })),
                  format: (value) => `${value} units`,
                },
                {
                  id: "average",
                  label: "Recorded average",
                  value: average ? String(average) : "Not set",
                  hint: average
                    ? "From marks in Coursemap"
                    : "No marks recorded",
                  points: marks,
                  format: (value) => String(Math.round(value)),
                },
              ]}
            />
          </Card>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            Progress
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <CourseProgressChart progressByGroup={groups} />
            <TermLoadChart terms={loads} />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            This month
          </h2>
          <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <MonthCalendar attempts={state.attempts} />
            <CourseMixChart levels={mix} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
