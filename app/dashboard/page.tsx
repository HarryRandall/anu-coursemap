"use client";

import { CircleAlert } from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { CourseMixChart } from "@/components/dashboard/course-mix-chart";
import { CourseProgressChart } from "@/components/dashboard/course-progress-chart";
import { DegreeCharts } from "@/components/dashboard/degree-charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { TermLoadChart } from "@/components/dashboard/term-load-chart";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { degreeByCode, majorByCode } from "@/lib/catalogue";
import {
  coursesByLevel,
  cumulativeCompletedByTerm,
  loadByTerm,
  markSeries,
} from "@/lib/dashboard-series";
import {
  STANDARD_TERM_UNITS,
  degreeUnitProgress,
  unitsByCalendarYear,
} from "@/lib/planner";
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
  const years = unitsByCalendarYear(state.attempts);
  const load = currentTermLoad(state.attempts);
  const average = recordedAverage(state.attempts);
  const issues = planIssues(state.attempts);
  const completedSeries = cumulativeCompletedByTerm(state.attempts);
  const loadSeries = loadByTerm(state.attempts);
  const marks = markSeries(state.attempts);
  const mix = coursesByLevel(state.attempts);
  const groups = requirementProgress(state.attempts, major.courseCodes);

  return (
    <AppShell title="Home" subtitle="Your degree at a glance">
      <div className="mx-auto max-w-7xl">
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

        <section
          aria-label="Key figures"
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label="Degree complete"
            value={`${progress.percent}%`}
            hint={`${progress.completed} of ${progress.total} units`}
            series={completedSeries.map(
              (units) => (units / progress.total) * 100,
            )}
            seriesLabel="Degree completion across study periods"
          />
          <KpiCard
            label="Units earned"
            value={progress.completed}
            hint={`${progress.planned} still in the plan`}
            series={completedSeries}
            seriesLabel="Units earned across study periods"
          />
          <KpiCard
            label={
              load.term
                ? `${load.term.shortName} ${load.term.year}`
                : "This period"
            }
            value={load.units}
            hint={`${load.courses} ${load.courses === 1 ? "course" : "courses"} · ${STANDARD_TERM_UNITS}u load`}
            series={loadSeries.map((item) => item.units)}
            seriesLabel="Units planned in each study period"
          />
          <KpiCard
            label="Recorded average"
            value={average ?? "Not set"}
            hint={average ? "From marks in Coursemap" : "No marks recorded"}
            series={marks}
            seriesLabel="Recorded marks over time"
          />
        </section>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-3">
          <CourseProgressChart progressByGroup={groups} />
          <DegreeCharts progress={progress} years={years} />
          <MonthCalendar attempts={state.attempts} />
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <TermLoadChart terms={loadSeries} />
          <CourseMixChart levels={mix} />
        </div>
      </div>
    </AppShell>
  );
}
