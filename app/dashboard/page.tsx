"use client";

import { CircleAlert } from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { AttentionCard } from "@/components/dashboard/attention-card";
import { CourseProgressChart } from "@/components/dashboard/course-progress-chart";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { StatCards } from "@/components/dashboard/stat-cards";
import { TermLoadChart } from "@/components/dashboard/term-load-chart";
import { UnitsTrendChart } from "@/components/dashboard/units-trend-chart";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { degreeByCode, majorByCode, terms } from "@/lib/catalogue";
import { cumulativeUnitsByTerm, unitsByTerm } from "@/lib/dashboard-series";
import {
  STANDARD_TERM_UNITS,
  degreeUnitProgress,
  missingPrereqs,
} from "@/lib/planner";
import { currentTermLoad } from "@/lib/study-calendar";
import {
  planIssues,
  recordedAverage,
  requirementProgress,
} from "@/lib/student-progress";
import type { Tone } from "@/lib/ui";

function gradeBand(average: number): { label: string; tone: Tone } {
  if (average >= 80) return { label: "High Distinction", tone: "success" };
  if (average >= 70) return { label: "Distinction", tone: "success" };
  if (average >= 60) return { label: "Credit", tone: "brand" };
  if (average >= 50) return { label: "Pass", tone: "neutral" };
  return { label: "Below pass", tone: "danger" };
}

function termShortLabel(termId: string) {
  const term = terms.find((item) => item.id === termId);
  return term ? `${term.shortName} ${term.year}` : "Unscheduled";
}

export default function DashboardPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const progress = degreeUnitProgress(state.attempts, degree.units);
  const load = currentTermLoad(state.attempts);
  const average = recordedAverage(state.attempts);
  const cumulative = cumulativeUnitsByTerm(state.attempts);
  const perTerm = unitsByTerm(state.attempts);
  const groups = requirementProgress(state.attempts, major.courseCodes);
  const issues = planIssues(state.attempts).map((issue) => ({
    id: issue.attempt.id,
    code: issue.course.code,
    name: issue.course.name,
    termLabel: termShortLabel(issue.attempt.termId),
    status: issue.status,
    note:
      issue.status === "blocked"
        ? `Needs ${missingPrereqs(issue.attempt, state.attempts).join(" + ")} completed or scheduled earlier`
        : "Convener permission is required",
  }));

  return (
    <AppShell title="Home" subtitle="Your degree at a glance">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
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

        <StatCards
          stats={[
            {
              id: "complete",
              label: "Degree complete",
              value: `${progress.percent}%`,
              sub: `${progress.completed} of ${progress.total} units earned`,
              bar: {
                completedPct: (progress.completed / progress.total) * 100,
                plannedPct: (progress.planned / progress.total) * 100,
              },
            },
            {
              id: "earned",
              label: "Units earned",
              value: String(progress.completed),
              sub: `${progress.planned}u planned · ${progress.remaining}u not yet mapped`,
            },
            {
              id: "load",
              label: load.term
                ? `${load.term.shortName} ${load.term.year} load`
                : "Current load",
              value: `${load.units}u`,
              sub: `${load.courses} ${load.courses === 1 ? "course" : "courses"} · standard is ${STANDARD_TERM_UNITS}u`,
            },
            {
              id: "average",
              label: "Average mark",
              value: average ? String(average) : "Not set",
              sub: average
                ? "Weighted by units, from your marks"
                : "Add marks to see your average",
              badge: average ? gradeBand(average) : undefined,
            },
          ]}
        />

        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <UnitsTrendChart points={cumulative} degreeUnits={progress.total} />
          <MonthCalendar attempts={state.attempts} />
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          <CourseProgressChart progressByGroup={groups} />
          <TermLoadChart terms={perTerm} currentTermId={load.term?.id} />
          <AttentionCard items={issues} />
        </div>
      </div>
    </AppShell>
  );
}
