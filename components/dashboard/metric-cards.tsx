"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@reui/ui/card";
import { cn } from "@/lib/cn";
import type { DashboardTermPoint } from "@/lib/coursemap/dashboard-series";
import type { RequirementBucketProgress } from "@/lib/coursemap/requirement-progress";
import { STANDARD_TERM_UNITS, type DegreeUnitProgress } from "@/lib/planner";

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export type MetricId =
  | "load"
  | "coverage"
  | "readiness"
  | "remaining"
  | "semester-bars"
  | "completion-ring"
  | "unit-mix"
  | "progress-line"
  | "requirements"
  | "next-term"
  | "load-balance"
  | "finish";

export const METRIC_ORDER: readonly MetricId[] = [
  "load",
  "coverage",
  "readiness",
  "remaining",
  "semester-bars",
  "completion-ring",
  "unit-mix",
  "progress-line",
  "requirements",
  "next-term",
  "load-balance",
  "finish",
];

export const METRIC_OPTIONS: Record<
  MetricId,
  { title: string; blurb: string }
> = {
  load: {
    title: "Current semester",
    blurb: "Units scheduled this semester against the standard load.",
  },
  coverage: {
    title: "Planning coverage",
    blurb: "How much of the degree already has a place in the plan.",
  },
  readiness: {
    title: "Next semester readiness",
    blurb: "Which upcoming courses still need a prerequisite check.",
  },
  remaining: {
    title: "Room in your plan",
    blurb: "Units without a course yet, in standard course equivalents.",
  },
  "semester-bars": {
    title: "Upcoming semester load",
    blurb: "Units per semester across the next few semesters.",
  },
  "completion-ring": {
    title: "Degree completed",
    blurb: "Completed units as a share of the whole degree.",
  },
  "unit-mix": {
    title: "Your unit mix",
    blurb: "Completed, enrolled, planned and free units side by side.",
  },
  "progress-line": {
    title: "Planned progress",
    blurb: "Cumulative units over time, including future plans.",
  },
  requirements: {
    title: "Requirements progress",
    blurb: "Completed units in each top-level degree group.",
  },
  "next-term": {
    title: "Next semester courses",
    blurb: "The course codes coming up next semester.",
  },
  "load-balance": {
    title: "Load balance",
    blurb: "How evenly the upcoming semesters are loaded.",
  },
  finish: {
    title: "Planned finish",
    blurb: "When the current plan runs out of scheduled semesters.",
  },
};

export const DEFAULT_METRIC_IDS: readonly MetricId[] = [
  "load",
  "coverage",
  "readiness",
];

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export type MetricCourse = { code: string; units: number; ready: boolean };

export type MetricInputs = {
  unitTarget: number | null;
  progress: DegreeUnitProgress;
  enrolledUnits: number;
  cumulative: readonly DashboardTermPoint[];
  buckets: readonly RequirementBucketProgress[];
  /** The semester in focus right now (current, or the next one with courses). */
  focusTermLabel: string | null;
  focusCourses: readonly MetricCourse[];
  /** The next upcoming semester after the focus one that has courses. */
  nextTermLabel: string | null;
  nextCourses: readonly MetricCourse[];
  /** Scheduled terms from the focus semester onwards. */
  upcoming: readonly DashboardTermPoint[];
  /** e.g. "Nov 2028" — the end of the last semester containing courses. */
  finishLabel: string | null;
};

/* ------------------------------------------------------------------ */
/* Small visuals                                                       */
/* ------------------------------------------------------------------ */

function Ring({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-14 shrink-0"
      role="img"
      aria-label={label}
    >
      <circle
        cx="32"
        cy="32"
        r="25"
        fill="none"
        className="stroke-border"
        strokeWidth="7"
      />
      <circle
        cx="32"
        cy="32"
        r="25"
        fill="none"
        className="stroke-primary"
        strokeWidth="7"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${clamped} 100`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function Sparkline({
  values,
  max,
  label,
}: {
  values: readonly number[];
  max: number;
  label: string;
}) {
  if (values.length < 2) return null;
  const top = Math.max(max, ...values, 1);
  const step = 280 / (values.length - 1);
  return (
    <svg
      viewBox="0 0 280 46"
      preserveAspectRatio="none"
      className="h-11 w-full"
      role="img"
      aria-label={label}
    >
      <polyline
        points={values
          .map((value, index) => `${index * step},${44 - (value / top) * 42}`)
          .join(" ")}
        fill="none"
        className="stroke-primary"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function SegmentRow({
  segments,
  label,
}: {
  segments: readonly { className: string; flex: number; title?: string }[];
  label: string;
}) {
  return (
    <div
      className="flex h-2 w-full gap-1 overflow-hidden"
      role="img"
      aria-label={label}
    >
      {segments.map((segment, index) => (
        <span
          key={index}
          title={segment.title}
          style={{ flex: Math.max(segment.flex, 0.0001) }}
          className={cn("h-full rounded-full", segment.className)}
        />
      ))}
    </div>
  );
}

function MiniBars({
  points,
  label,
}: {
  points: readonly { label: string; units: number }[];
  label: string;
}) {
  const max = Math.max(STANDARD_TERM_UNITS, ...points.map((p) => p.units), 1);
  return (
    <div className="flex items-end gap-3" role="img" aria-label={label}>
      {points.map((point) => (
        <div
          key={point.label}
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
        >
          <span
            className="w-full rounded-md bg-primary/70"
            style={{ height: `${Math.max((point.units / max) * 44, 3)}px` }}
            title={`${point.label}: ${point.units} units`}
          />
          <small className="truncate text-[10px] text-muted-foreground">
            {point.label}
          </small>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View model                                                          */
/* ------------------------------------------------------------------ */

export type MetricView = {
  id: MetricId;
  title: string;
  value: string;
  unit: string;
  note: string;
  /** Rendered beside the big value (rings). */
  aside?: ReactNode;
  /** Rendered between the value and the note. */
  body?: ReactNode;
};

function courseWord(count: number) {
  return count === 1 ? "course" : "courses";
}

function semesterWord(count: number) {
  return count === 1 ? "semester" : "semesters";
}

export function buildMetricViews(
  inputs: MetricInputs,
): Record<MetricId, MetricView> {
  const {
    unitTarget,
    progress,
    enrolledUnits,
    cumulative,
    buckets,
    focusTermLabel,
    focusCourses,
    nextTermLabel,
    nextCourses,
    upcoming,
    finishLabel,
  } = inputs;

  const focusUnits = focusCourses.reduce((total, c) => total + c.units, 0);
  const nextUnits = nextCourses.reduce((total, c) => total + c.units, 0);
  const readyCount = nextCourses.filter((c) => c.ready).length;
  const needsCheck = nextCourses.length - readyCount;
  const freeCourses = Math.floor(progress.remaining / 6);
  const nearTerms = upcoming.slice(0, 4);
  const fullTerms = nearTerms.filter(
    (term) => term.units === STANDARD_TERM_UNITS,
  ).length;
  const lightest = nearTerms.reduce(
    (lowest, term) => (term.units < lowest.units ? term : lowest),
    nearTerms[0] ?? { label: "", units: 0 },
  );
  const lastCumulative = cumulative.at(-1);
  const plannedOnly = Math.max(0, progress.planned - enrolledUnits);

  return {
    load: {
      id: "load",
      title: METRIC_OPTIONS.load.title,
      value: String(focusUnits),
      unit: `/ ${STANDARD_TERM_UNITS} units`,
      note:
        focusCourses.length === 0
          ? "No courses scheduled yet"
          : `${focusCourses.length} ${courseWord(focusCourses.length)} · ${
              focusUnits > STANDARD_TERM_UNITS
                ? "overloaded"
                : focusUnits === STANDARD_TERM_UNITS
                  ? "standard load"
                  : "below standard load"
            }${focusTermLabel ? ` · ${focusTermLabel}` : ""}`,
      body: focusCourses.length > 0 && (
        <SegmentRow
          label={`Units per course: ${focusCourses
            .map((c) => `${c.code} ${c.units}`)
            .join(", ")}`}
          segments={focusCourses.map((c) => ({
            className: "bg-primary",
            flex: c.units,
            title: `${c.code} · ${c.units} units`,
          }))}
        />
      ),
    },
    coverage: {
      id: "coverage",
      title: METRIC_OPTIONS.coverage.title,
      value:
        unitTarget && unitTarget > 0
          ? `${Math.round((progress.mapped / unitTarget) * 100)}%`
          : `${progress.mapped}`,
      unit: unitTarget && unitTarget > 0 ? "allocated" : "units allocated",
      note:
        unitTarget && unitTarget > 0
          ? `${progress.mapped} of ${unitTarget} units have a place`
          : "No unit target recorded for this programme",
      aside:
        unitTarget && unitTarget > 0 ? (
          <Ring
            percent={(progress.mapped / unitTarget) * 100}
            label={`${progress.mapped} of ${unitTarget} units allocated`}
          />
        ) : undefined,
    },
    readiness: {
      id: "readiness",
      title: METRIC_OPTIONS.readiness.title,
      value: String(readyCount),
      unit: `/ ${nextCourses.length} ready`,
      note:
        nextCourses.length === 0
          ? "Nothing scheduled next semester yet"
          : needsCheck > 0
            ? `${needsCheck} ${courseWord(needsCheck)} need${needsCheck === 1 ? "s" : ""} a prerequisite check`
            : "Everything is ready to enrol",
      body: nextCourses.length > 0 && (
        <div className="flex gap-1.5">
          {nextCourses.slice(0, 6).map((course) => (
            <span
              key={course.code}
              title={`${course.code} ${course.ready ? "ready" : "needs a check"}`}
              className={cn(
                "flex h-6 flex-1 items-center justify-center rounded-md text-[11px] font-bold",
                course.ready
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              )}
            >
              {course.ready ? "✓" : "!"}
            </span>
          ))}
        </div>
      ),
    },
    remaining: {
      id: "remaining",
      title: METRIC_OPTIONS.remaining.title,
      value: String(progress.remaining),
      unit: "units free",
      note:
        progress.remaining === 0
          ? "Every unit of the degree has a course"
          : `Equivalent to ${freeCourses} standard 6-unit ${courseWord(freeCourses)}`,
      body: freeCourses > 0 && (
        <div className="flex gap-1.5">
          {Array.from({ length: Math.min(freeCourses, 6) }).map((_, index) => (
            <span
              key={index}
              className="flex h-6 flex-1 items-center justify-center rounded-md border border-dashed border-border text-[11px] font-semibold text-muted-foreground"
            >
              +6
            </span>
          ))}
        </div>
      ),
    },
    "semester-bars": {
      id: "semester-bars",
      title: METRIC_OPTIONS["semester-bars"].title,
      value: String(nearTerms[0]?.units ?? 0),
      unit: "units next semester",
      note:
        nearTerms.length > 0
          ? `Units per semester · last shown ${nearTerms.at(-1)?.units ?? 0}`
          : "No upcoming semesters in the plan",
      body: nearTerms.length > 0 && (
        <MiniBars
          points={nearTerms.map((term) => ({
            label: term.label,
            units: term.units,
          }))}
          label={nearTerms
            .map((term) => `${term.label}: ${term.units} units`)
            .join(", ")}
        />
      ),
    },
    "completion-ring": {
      id: "completion-ring",
      title: METRIC_OPTIONS["completion-ring"].title,
      value: unitTarget ? `${progress.percent}%` : `${progress.completed}`,
      unit: unitTarget ? "complete" : "units completed",
      note: unitTarget
        ? `${progress.completed} of ${unitTarget} units completed`
        : "No unit target recorded for this programme",
      aside: unitTarget ? (
        <Ring
          percent={progress.percent}
          label={`${progress.completed} of ${unitTarget} units completed`}
        />
      ) : undefined,
    },
    "unit-mix": {
      id: "unit-mix",
      title: METRIC_OPTIONS["unit-mix"].title,
      value: String(unitTarget ?? progress.mapped),
      unit: "degree units",
      note: `${progress.completed} completed · ${enrolledUnits} enrolled · ${plannedOnly} planned · ${progress.remaining} free`,
      body: (
        <SegmentRow
          label={`${progress.completed} completed, ${enrolledUnits} enrolled, ${plannedOnly} planned, ${progress.remaining} free`}
          segments={[
            {
              className: "bg-emerald-500",
              flex: progress.completed,
              title: `Completed · ${progress.completed}`,
            },
            {
              className: "bg-primary",
              flex: enrolledUnits,
              title: `Enrolled · ${enrolledUnits}`,
            },
            {
              className: "bg-primary/35",
              flex: plannedOnly,
              title: `Planned · ${plannedOnly}`,
            },
            {
              className: "bg-muted-foreground/25",
              flex: progress.remaining,
              title: `Free · ${progress.remaining}`,
            },
          ].filter((segment) => segment.flex > 0)}
        />
      ),
    },
    "progress-line": {
      id: "progress-line",
      title: METRIC_OPTIONS["progress-line"].title,
      value: String(lastCumulative?.units ?? 0),
      unit: lastCumulative ? `units by end of ${lastCumulative.year}` : "units",
      note: "Cumulative units · includes future plans",
      body: (
        <Sparkline
          values={cumulative.map((point) => point.units)}
          max={unitTarget ?? 0}
          label="Cumulative planned units over time"
        />
      ),
    },
    requirements: {
      id: "requirements",
      title: METRIC_OPTIONS.requirements.title,
      value: String(buckets.length),
      unit: buckets.length === 1 ? "degree group" : "degree groups",
      note:
        buckets.length === 0
          ? "Programme rules have not been imported yet"
          : "Completed units in each applicable group",
      body: buckets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {buckets.slice(0, 3).map((bucket) => {
            const percent = bucket.targetUnits
              ? Math.min(
                  100,
                  (bucket.completedUnits / bucket.targetUnits) * 100,
                )
              : 0;
            return (
              <div key={bucket.key} className="flex items-center gap-2">
                <small className="w-24 truncate text-[10px] text-muted-foreground">
                  {bucket.title}
                </small>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    "next-term": {
      id: "next-term",
      title: METRIC_OPTIONS["next-term"].title,
      value: String(nextCourses.length),
      unit: `${courseWord(nextCourses.length)} · ${nextUnits} units`,
      note: nextTermLabel ?? "No upcoming semester scheduled",
      body: nextCourses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {nextCourses.slice(0, 6).map((course) => (
            <span
              key={course.code}
              className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] font-semibold"
            >
              {course.code}
            </span>
          ))}
        </div>
      ),
    },
    "load-balance": {
      id: "load-balance",
      title: METRIC_OPTIONS["load-balance"].title,
      value: String(fullTerms),
      unit: `/ ${nearTerms.length} ${semesterWord(nearTerms.length)} at ${STANDARD_TERM_UNITS} units`,
      note:
        nearTerms.length === 0
          ? "No upcoming semesters in the plan"
          : lightest.units < STANDARD_TERM_UNITS
            ? `${STANDARD_TERM_UNITS - lightest.units} units below standard in ${lightest.label}`
            : "Every upcoming semester carries a standard load",
      body: nearTerms.length > 0 && (
        <div className="flex gap-1.5">
          {nearTerms.map((term) => (
            <span
              key={term.id}
              title={`${term.label}: ${term.units} units`}
              className={cn(
                "flex h-7 flex-1 items-center justify-center rounded-md text-[11px] font-bold tabular-nums",
                term.units >= STANDARD_TERM_UNITS
                  ? "bg-primary/12 text-primary"
                  : "border border-dashed border-border text-muted-foreground",
              )}
            >
              {term.units}
            </span>
          ))}
        </div>
      ),
    },
    finish: {
      id: "finish",
      title: METRIC_OPTIONS.finish.title,
      value: finishLabel ?? "—",
      unit: "",
      note:
        nearTerms.length > 0
          ? `${nearTerms.length} upcoming ${semesterWord(nearTerms.length)} · ${progress.remaining} units still to allocate`
          : "Add courses to project a finish date",
      body: nearTerms.length > 0 && (
        <MiniBars
          points={nearTerms.map((term) => ({
            label: term.label,
            units: term.units,
          }))}
          label={nearTerms
            .map((term) => `${term.label}: ${term.units} units`)
            .join(", ")}
        />
      ),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function MetricCardView({ view }: { view: MetricView }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <p className="text-[13px] font-medium text-muted-foreground">
          {view.title}
        </p>
        <div className="flex flex-1 items-center justify-between gap-4">
          <p className="text-2xl font-semibold tracking-tight">
            {view.value}{" "}
            {view.unit && (
              <span className="text-sm font-normal text-muted-foreground">
                {view.unit}
              </span>
            )}
          </p>
          {view.aside}
        </div>
        {view.body}
        <p className="text-xs text-muted-foreground">{view.note}</p>
      </CardContent>
    </Card>
  );
}
