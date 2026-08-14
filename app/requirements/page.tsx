"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import {
  courseByCode,
  degreeByCode,
  majorByCode,
  requirementGroups,
  type Course,
} from "@/lib/catalogue";
import { earnedUnits, mappedUnits } from "@/lib/planner";

type RequirementValues = Record<string, number>;

function countRequirementUnits(
  courses: Course[],
  majorCodes: string[],
): RequirementValues {
  return {
    core: courses
      .filter((course) => course.countsTowards.includes("Computing core"))
      .reduce((sum, course) => sum + course.units, 0),
    math: courses
      .filter((course) =>
        course.countsTowards.some((item) => item.includes("Mathematics")),
      )
      .reduce((sum, course) => sum + course.units, 0),
    major: courses
      .filter((course) => majorCodes.includes(course.code))
      .reduce((sum, course) => sum + course.units, 0),
    advanced: courses
      .filter((course) => course.level >= 3000)
      .reduce((sum, course) => sum + course.units, 0),
    electives: 0,
  };
}

export default function RequirementsPage() {
  const { state } = useCoursemap();
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const completed = earnedUnits(state.attempts);
  const mapped = mappedUnits(state.attempts);
  const planned = Math.max(0, mapped - completed);
  const stillToPlan = Math.max(0, degree.units - mapped);
  const completePercent = Math.round((completed / degree.units) * 100);

  const progressByGroup = useMemo(() => {
    const completedCodes = new Set(
      state.attempts
        .filter((attempt) => attempt.status === "completed")
        .map((attempt) => attempt.courseCode),
    );
    const completedCourses = [...completedCodes]
      .map(courseByCode)
      .filter((course): course is Course => Boolean(course));

    const plannedCodes = new Set(
      state.attempts
        .filter(
          (attempt) =>
            attempt.status !== "failed" &&
            !completedCodes.has(attempt.courseCode),
        )
        .map((attempt) => attempt.courseCode),
    );
    const plannedCourses = [...plannedCodes]
      .map(courseByCode)
      .filter((course): course is Course => Boolean(course));

    const completedValues = countRequirementUnits(
      completedCourses,
      major.courseCodes,
    );
    const plannedValues = countRequirementUnits(
      plannedCourses,
      major.courseCodes,
    );

    return Object.fromEntries(
      requirementGroups.map((group) => {
        const completedUnits = Math.min(
          group.total,
          completedValues[group.id] ?? 0,
        );
        const plannedUnits = Math.min(
          group.total - completedUnits,
          plannedValues[group.id] ?? 0,
        );
        return [
          group.id,
          {
            completed: completedUnits,
            planned: plannedUnits,
            stillNeeded: Math.max(
              0,
              group.total - completedUnits - plannedUnits,
            ),
          },
        ];
      }),
    );
  }, [major.courseCodes, state.attempts]);

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
      <h1 className="sr-only">{degree.name} requirements</h1>

      {/* Progress overview */}
      <Card className="p-5">
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
                <p className="text-[11px] text-zinc-400">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Requirement groups */}
      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Degree requirements
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            See how completed and planned courses match each rule group.
          </p>
        </div>

        <div className="divide-y divide-zinc-100">
          {requirementGroups.map((group) => {
            const progress = progressByGroup[group.id] ?? {
              completed: 0,
              planned: 0,
              stillNeeded: group.total,
            };
            const completedPercent = Math.min(
              100,
              (progress.completed / group.total) * 100,
            );
            const plannedPercent = Math.min(
              100 - completedPercent,
              (progress.planned / group.total) * 100,
            );
            const done = progress.stillNeeded === 0;
            return (
              <div key={group.id} className="flex items-center gap-4 px-5 py-4">
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

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-zinc-900">
                    {group.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {group.description}
                  </p>
                  <div
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
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    {progress.completed} completed · {progress.planned} planned
                    · {progress.stillNeeded} still needed
                  </p>
                </div>

                <div className="hidden w-28 text-right sm:block">
                  <p className="text-sm font-semibold text-zinc-900">
                    {progress.completed + progress.planned}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    of {group.total} units
                  </p>
                </div>

                <Link
                  href={`/courses?requirement=${group.id}`}
                  aria-label={`Explore courses for ${group.name}`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="border-t border-zinc-100 bg-zinc-50/70 px-5 py-3 text-[11px] text-zinc-400">
          Courses may match more than one group. Final allocation follows the
          programme rules.
        </p>
      </Card>
    </AppShell>
  );
}
