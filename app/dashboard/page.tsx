"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  ListChecks,
  Map,
  Sparkles,
} from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import {
  courseByCode,
  degreeByCode,
  majorByCode,
  terms,
} from "@/lib/catalogue";
import { earnedUnits, mappedUnits, statusLabel } from "@/lib/planner";
import { planIssues } from "@/lib/student-progress";
import { statusTone } from "@/lib/ui";

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
  const completed = earnedUnits(state.attempts);
  const mapped = mappedUnits(state.attempts);
  const planned = Math.max(0, mapped - completed);
  const remaining = Math.max(0, degree.units - mapped);
  const issues = planIssues(state.attempts);
  const firstName = state.profile.name.trim().split(/\s+/)[0] || "there";

  const nextTerm = terms.find(
    (term) =>
      term.id !== "unscheduled" &&
      state.attempts.some(
        (attempt) =>
          attempt.termId === term.id &&
          (attempt.status === "planned" || attempt.status === "enrolled"),
      ),
  );
  const nextAttempts = nextTerm
    ? state.attempts.filter(
        (attempt) =>
          attempt.termId === nextTerm.id && attempt.status !== "failed",
      )
    : [];

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
                Your degree is taking shape
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
              Open your plan <ArrowRight size={15} />
            </ButtonLink>
          </div>

          <div className="mt-7">
            <div
              className="flex h-2.5 overflow-hidden rounded-full bg-white/15"
              aria-label={`${completed} units completed, ${planned} units planned and ${remaining} units still to plan`}
            >
              <span
                className="bg-brand-400"
                style={{ width: `${(completed / degree.units) * 100}%` }}
              />
              <span
                className="bg-brand-200"
                style={{ width: `${(planned / degree.units) * 100}%` }}
              />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {[
                ["Completed", completed],
                ["In your plan", planned],
                ["Still to plan", remaining],
              ].map(([label, value]) => (
                <div key={label}>
                  <dd className="text-lg font-bold sm:text-xl">{value}</dd>
                  <dt className="text-[10px] text-zinc-400 sm:text-xs">
                    {label} units
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <Card className="overflow-hidden">
            <CardHeader
              title={
                nextTerm
                  ? `${nextTerm.name} ${nextTerm.year}`
                  : "Your next semester"
              }
              description={
                nextTerm
                  ? `${nextAttempts.length} courses · ${nextTerm.dates}`
                  : "Nothing is scheduled yet."
              }
              icon={
                <span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-600">
                  <CalendarDays size={17} />
                </span>
              }
              action={
                <Link
                  href="/calendar"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Calendar
                </Link>
              }
            />

            {nextAttempts.length > 0 ? (
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {nextAttempts.map((attempt) => {
                  const course = courseByCode(attempt.courseCode);
                  if (!course) return null;
                  return (
                    <Link
                      key={attempt.id}
                      href={`/courses/${course.code}`}
                      className="flex min-h-16 items-center gap-3 px-5 py-3 transition hover:bg-zinc-50"
                    >
                      <CourseToken
                        code={course.code}
                        accent={course.accent}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-zinc-900">
                          {course.code}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {course.name}
                        </span>
                      </span>
                      <Badge tone={statusTone[attempt.status]}>
                        {statusLabel(attempt.status)}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="border-t border-zinc-100 px-5 py-10 text-center">
                <p className="text-sm font-medium text-zinc-700">
                  Start with the courses you already know
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  You can leave uncertain choices in Later.
                </p>
                <ButtonLink href="/courses" size="sm" className="mt-4">
                  Browse courses
                </ButtonLink>
              </div>
            )}
          </Card>

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
                    <CircleAlert size={17} />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                </span>
              }
            />
            <div className="border-t border-zinc-100 px-5 py-4">
              {issues.length > 0 ? (
                <ul className="space-y-3">
                  {issues.slice(0, 3).map(({ attempt, status }) => (
                    <li key={attempt.id} className="flex items-start gap-2.5">
                      <CircleAlert
                        size={15}
                        className="mt-0.5 shrink-0 text-amber-500"
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
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Coursemap has not found any sequencing or approval issues in
                  the courses currently in your plan.
                </p>
              )}
              <ButtonLink
                href="/requirements"
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
              >
                Review degree progress <ArrowRight size={14} />
              </ButtonLink>
            </div>
          </Card>
        </div>

        <section className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={16} className="text-zinc-500" />
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
                    <Icon size={17} />
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
