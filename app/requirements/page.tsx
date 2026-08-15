"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Info,
  ListChecks,
} from "lucide-react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import { cn } from "@/lib/cn";
import { degreeByCode, majorByCode, requirementGroups } from "@/lib/catalogue";
import { earnedUnits, mappedUnits } from "@/lib/planner";
import { planIssues, requirementProgress } from "@/lib/student-progress";

export default function RequirementsPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const completed = earnedUnits(state.attempts);
  const mapped = mappedUnits(state.attempts);
  const planned = Math.max(0, mapped - completed);
  const stillToPlan = Math.max(0, degree.units - mapped);
  const completePercent = Math.round((completed / degree.units) * 100);
  const progressByGroup = requirementProgress(
    state.attempts,
    major.courseCodes,
  );
  const issues = planIssues(state.attempts);
  const reviewDataCourses = new Set(
    state.attempts
      .filter((attempt) => {
        const candidates = Object.values(progressByGroup).flatMap((progress) =>
          [...progress.completed, ...progress.planned].filter(
            (course) => course.parseState === "Review",
          ),
        );
        return candidates.some((course) => course.code === attempt.courseCode);
      })
      .map((attempt) => attempt.courseCode),
  );

  const metrics = [
    {
      key: "complete",
      label: "Completed",
      value: completed,
      dot: "bg-brand-500",
    },
    {
      key: "planned",
      label: "In your plan",
      value: planned,
      dot: "bg-brand-300",
    },
    {
      key: "remaining",
      label: "Still to plan",
      value: stillToPlan,
      dot: "bg-zinc-300",
    },
  ];

  return (
    <AppShell
      title="Requirements"
      subtitle={`${degree.code} · ${state.profile.catalogueYear} rules`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600">
              {degree.code} · {state.profile.catalogueYear} rules
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Degree requirements
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              See possible matches, planned coverage and items that need review.
            </p>
          </div>
          <ButtonLink href="/courses" variant="secondary" size="sm">
            Find matching courses
          </ButtonLink>
        </div>

        <Card className="mt-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Degree progress
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {degree.units}-unit programme
              </p>
            </div>
            <span className="text-sm font-semibold text-zinc-900">
              {completePercent}% complete
            </span>
          </div>

          <div
            className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-zinc-100"
            aria-label={`${completed} completed, ${planned} planned, ${stillToPlan} still to plan`}
          >
            <span
              className="bg-brand-500"
              style={{ width: `${(completed / degree.units) * 100}%` }}
            />
            <span
              className="bg-brand-300"
              style={{ width: `${(planned / degree.units) * 100}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {metrics.map((metric) => (
              <div
                key={metric.key}
                className="flex items-center gap-2.5 px-4 py-3"
              >
                <span className={cn("size-2 rounded-full", metric.dot)} />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {metric.value} units
                  </p>
                  <p className="text-[11px] text-zinc-500">{metric.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {(issues.length > 0 || reviewDataCourses.size > 0) && (
          <Card className="mt-4 overflow-hidden border-amber-200 bg-amber-50/30 ring-amber-200">
            <CardHeader
              title="Needs review"
              description="These items may affect how confidently Coursemap can assess the plan."
              icon={
                <span className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-700">
                  <AlertTriangle size={17} />
                </span>
              }
              action={
                <Badge tone="warning">
                  {issues.length + reviewDataCourses.size} items
                </Badge>
              }
            />
            <ul className="divide-y divide-amber-100 border-t border-amber-100">
              {issues.map(({ attempt, status }) => (
                <li
                  key={attempt.id}
                  className="flex items-start gap-3 px-5 py-3 text-xs"
                >
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <p className="font-semibold text-zinc-800">
                      {attempt.courseCode}
                    </p>
                    <p className="mt-0.5 text-zinc-600">
                      {status === "blocked"
                        ? "A prerequisite is missing or scheduled too late."
                        : "Coursemap has not recorded the required convener approval."}
                    </p>
                  </div>
                </li>
              ))}
              {[...reviewDataCourses].map((code) => (
                <li
                  key={code}
                  className="flex items-start gap-3 px-5 py-3 text-xs"
                >
                  <Info size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-zinc-800">{code}</p>
                    <p className="mt-0.5 text-zinc-600">
                      Its imported catalogue information is marked for review.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="mt-4 overflow-hidden">
          <CardHeader
            title="Rule group coverage"
            description="Open a group to see the courses that may contribute."
            icon={
              <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <ListChecks size={17} />
              </span>
            }
          />

          <div className="divide-y divide-zinc-100 border-t border-zinc-100">
            {requirementGroups.map((group) => {
              const progress = progressByGroup[group.id];
              const completedPercent = Math.min(
                100,
                (progress.completedUnits / group.total) * 100,
              );
              const plannedPercent = Math.min(
                100 - completedPercent,
                (progress.plannedUnits / group.total) * 100,
              );
              const done = progress.stillNeeded === 0;
              const matchedCourses = [
                ...progress.completed.map((course) => ({
                  course,
                  status: "Completed",
                  statusClass: "text-emerald-700",
                })),
                ...progress.planned.map((course) => ({
                  course,
                  status: "Planned",
                  statusClass: "text-sky-700",
                })),
              ];

              return (
                <details key={group.id} className="group">
                  <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full ring-1",
                        done
                          ? "bg-emerald-500 text-white ring-emerald-500"
                          : "text-zinc-300 ring-zinc-300",
                      )}
                    >
                      {done ? (
                        <Check size={15} />
                      ) : (
                        <span className="size-2 rounded-full bg-current" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-zinc-900">
                        {group.name}
                      </span>
                      <span className="block text-[11px] text-zinc-500">
                        {group.description}
                      </span>
                      <span
                        className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-zinc-100"
                        aria-hidden="true"
                      >
                        <span
                          style={{
                            width: `${completedPercent}%`,
                            background: group.colour,
                          }}
                        />
                        <span
                          className="opacity-40"
                          style={{
                            width: `${plannedPercent}%`,
                            background: group.colour,
                          }}
                        />
                      </span>
                      <span className="mt-2 block text-[11px] text-zinc-500">
                        {progress.completedUnits} completed ·{" "}
                        {progress.plannedUnits} planned · {progress.stillNeeded}{" "}
                        still needed
                      </span>
                    </span>

                    <span className="hidden w-28 text-right sm:block">
                      <span className="block text-sm font-semibold text-zinc-900">
                        {progress.completedUnits + progress.plannedUnits}
                      </span>
                      <span className="block text-[11px] text-zinc-500">
                        of {group.total} units
                      </span>
                    </span>

                    <ChevronRight
                      size={17}
                      className="shrink-0 text-zinc-400 transition group-open:rotate-90"
                    />
                  </summary>

                  <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 sm:pl-16">
                    {matchedCourses.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {matchedCourses.map((item) => (
                          <Link
                            key={`${group.id}-${item.course.code}-${item.status}`}
                            href={`/courses/${item.course.code}`}
                            className="flex min-h-14 items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200 transition hover:ring-zinc-300"
                          >
                            <CourseToken
                              code={item.course.code}
                              accent={item.course.accent}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-zinc-800">
                                {item.course.code}
                              </span>
                              <span
                                className={cn(
                                  "block text-[10px] font-medium",
                                  item.statusClass,
                                )}
                              >
                                {item.status} · {item.course.units} units
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        No courses in the current plan are matched to this group
                        yet.
                      </p>
                    )}
                    {progress.stillNeeded > 0 && (
                      <ButtonLink
                        href={`/courses?requirement=${group.id}`}
                        variant="ghost"
                        size="sm"
                        className="mt-3 -ml-2"
                      >
                        Find courses for {group.name} <ArrowRight size={14} />
                      </ButtonLink>
                    )}
                  </div>
                </details>
              );
            })}
          </div>

          <div className="flex items-start gap-2.5 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3 text-[11px] leading-relaxed text-zinc-500">
            <Info size={14} className="mt-0.5 shrink-0" />
            <p>
              A course can appear in more than one group. These are possible
              matches, not a final allocation or official graduation check.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
