"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  ListChecks,
  Map,
  Sparkles,
} from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { StudyCalendarPreview } from "@/components/dashboard/study-calendar-preview";
import { RequirementGlance } from "@/components/dashboard/requirement-glance";
import { DegreeProgressBar } from "@/components/plan/degree-progress-bar";
import { FixIssueButton } from "@/components/plan/fix-issue-button";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { degreeByCode, majorByCode } from "@/lib/catalogue";
import { degreeUnitProgress } from "@/lib/planner";
import { planIssues } from "@/lib/student-progress";

const quickActions = [
  {
    href: "/plan",
    label: "Continue planning",
    description: "Move courses and shape each semester.",
    icon: Map,
  },
  {
    href: "/courses",
    label: "Find a course",
    description: "Search the catalogue and prerequisites.",
    icon: BookOpen,
  },
  {
    href: "/requirements",
    label: "Review requirements",
    description: "See what is covered and still missing.",
    icon: ListChecks,
  },
];

export default function DashboardPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const progress = degreeUnitProgress(state.attempts, degree.units);
  const issues = planIssues(state.attempts);
  const firstName = state.profile.name.trim().split(/\s+/)[0] || "there";
  const empty = progress.mapped === 0;

  return (
    <AppShell title="Home" subtitle="Your degree at a glance">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-2xl bg-zinc-900 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-200">
                <Sparkles size={14} aria-hidden="true" />
                Welcome back, {firstName}
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                {empty
                  ? "Start mapping your degree"
                  : "Your degree is taking shape"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">
                {degree.name} · {major.name} · {state.profile.catalogueYear}{" "}
                rules
              </p>
            </div>
            <ButtonLink
              href="/plan"
              variant="secondary"
              className="border-0 bg-white text-zinc-900 hover:bg-zinc-100"
            >
              {empty ? "Add your first course" : "Open your plan"}{" "}
              <ArrowRight size={15} />
            </ButtonLink>
          </div>

          <div className="mt-7">
            <DegreeProgressBar progress={progress} tone="dark" />
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
          <StudyCalendarPreview attempts={state.attempts} />
          <RequirementGlance
            attempts={state.attempts}
            majorCodes={major.courseCodes}
          />
        </div>

        <div className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="Plan health"
              description={
                issues.length > 0
                  ? `${issues.length} items need attention`
                  : "No prerequisite or approval issues found"
              }
              icon={
                <span
                  className={`grid size-9 place-items-center rounded-lg ${
                    issues.length > 0
                      ? "bg-amber-50 text-amber-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {issues.length > 0 ? (
                    <CircleAlert size={17} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={17} aria-hidden="true" />
                  )}
                </span>
              }
            />
            <div className="border-t border-zinc-100 px-5 py-4">
              {issues.length > 0 ? (
                <ul className="space-y-3">
                  {issues.slice(0, 4).map(({ attempt, status }) => (
                    <li
                      key={attempt.id}
                      className="flex flex-wrap items-start justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <CircleAlert
                          size={15}
                          className="mt-0.5 shrink-0 text-amber-500"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-xs font-semibold text-zinc-800">
                            {attempt.courseCode}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {status === "blocked"
                              ? "A prerequisite is missing or scheduled too late."
                              : "Convener approval still needs to be recorded."}
                          </p>
                        </div>
                      </div>
                      {status === "blocked" && (
                        <FixIssueButton attempt={attempt} />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-zinc-500">
                  {empty
                    ? "Once courses are in your plan, Coursemap will flag sequencing and approval issues here."
                    : "Coursemap has not found any sequencing or approval issues in the courses currently in your plan."}
                </p>
              )}
              <ButtonLink
                href={issues.length > 0 ? "/plan" : "/requirements"}
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
              >
                {issues.length > 0
                  ? "Review them on the plan"
                  : "Review degree progress"}{" "}
                <ArrowRight size={14} />
              </ButtonLink>
            </div>
          </Card>
        </div>

        <section className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap
              size={16}
              className="text-zinc-500"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-zinc-900">
              Quick actions
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-zinc-300 motion-reduce:transform-none"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold text-zinc-900">
                    {action.label}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                    {action.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
