"use client";

import {
  BookOpen,
  CalendarDays,
  CircleAlert,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { DegreeCharts } from "@/components/dashboard/degree-charts";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { degreeByCode, majorByCode } from "@/lib/catalogue";
import {
  STANDARD_TERM_UNITS,
  degreeUnitProgress,
  unitsByCalendarYear,
} from "@/lib/planner";
import { currentTermLoad } from "@/lib/study-calendar";
import { planIssues, recordedAverage } from "@/lib/student-progress";

export default function DashboardPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const progress = degreeUnitProgress(state.attempts, degree.units);
  const years = unitsByCalendarYear(state.attempts);
  const load = currentTermLoad(state.attempts);
  const average = recordedAverage(state.attempts);
  const issues = planIssues(state.attempts);

  const kpis = [
    {
      label: "Degree complete",
      value: `${progress.percent}%`,
      hint: `${progress.completed} of ${progress.total} units`,
      icon: GraduationCap,
    },
    {
      label: "Units earned",
      value: progress.completed,
      hint: `${progress.planned} still in the plan`,
      icon: BookOpen,
    },
    {
      label: load.term
        ? `${load.term.shortName} ${load.term.year}`
        : "This period",
      value: load.units,
      hint: `${load.courses} courses · ${STANDARD_TERM_UNITS}u load`,
      icon: CalendarDays,
    },
    {
      label: "Recorded average",
      value: average ?? "Not set",
      hint: average ? "From marks in Coursemap" : "No marks recorded",
      icon: TrendingUp,
    },
  ];

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
          className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4"
        >
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                    {item.label}
                  </p>
                  <span className="grid size-8 place-items-center rounded-lg bg-zinc-50 text-zinc-500">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">{item.hint}</p>
              </article>
            );
          })}
        </section>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <MonthCalendar attempts={state.attempts} />
          <DegreeCharts progress={progress} years={years} />
        </div>
      </div>
    </AppShell>
  );
}
