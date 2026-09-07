"use client";

import { Badge } from "@coursemap/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coursemap/ui/primitives/empty";
import { Tabs, TabsList, TabsTrigger } from "@coursemap/ui/primitives/tabs";
import { Award, BookCheck, FileClock, GraduationCap } from "lucide-react";
import { useMemo, useState } from "react";

import { useCoursemap } from "@/app/providers";
import { CourseDrawer } from "@/ui/overlays";
import { AppShell } from "@/ui/shell";
import { CourseToken } from "@/ui/ui/course-token";
import { StatTile } from "@/ui/ui/stat-tile";
import { cn } from "@/lib/cn";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  planTimelineTerms,
  planTimelineYears,
} from "@/lib/coursemap/plan-timeline";
import type {
  Attempt,
  AttemptStatus,
  Course,
  Term,
} from "@/lib/coursemap/types";
import { planningCourseForAttempt, unitsForAttempt } from "@/lib/planner";
import { badgeVariantForTone } from "@/lib/ui";

type Entry = {
  attempt: Attempt;
  course: Course;
  term: Term | undefined;
  units: number;
};

type Filter = "all" | AttemptStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "enrolled", label: "Enrolled" },
  { value: "planned", label: "Planned" },
  { value: "failed", label: "Failed" },
];

const STATUS_LABEL: Record<AttemptStatus, string> = {
  completed: "Completed",
  enrolled: "Enrolled",
  planned: "Planned",
  failed: "Failed",
};

const STATUS_TONE: Record<AttemptStatus, keyof typeof badgeVariantForTone> = {
  completed: "success",
  enrolled: "info",
  planned: "brand",
  failed: "danger",
};

/** ANU grade bands for a numeric mark. */
const GRADE_BANDS = [
  { grade: "HD", label: "High distinction", min: 80 },
  { grade: "D", label: "Distinction", min: 70 },
  { grade: "CR", label: "Credit", min: 60 },
  { grade: "P", label: "Pass", min: 50 },
  { grade: "N", label: "Fail", min: 0 },
] as const;

function gradeFor(mark: number) {
  return GRADE_BANDS.find((band) => mark >= band.min) ?? GRADE_BANDS[4];
}

function weightedAverage(entries: Entry[]) {
  const marked = entries.filter((entry) => entry.attempt.mark !== undefined);
  const units = marked.reduce((total, entry) => total + entry.units, 0);
  if (units === 0) return null;
  return Math.round(
    marked.reduce(
      (total, entry) => total + (entry.attempt.mark ?? 0) * entry.units,
      0,
    ) / units,
  );
}

/**
 * Transcript-style view of every course attempt saved in the plan, grouped by
 * study period, with a summary rail. Marks are self-recorded and indicative.
 */
export function AcademicRecord({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const degree = catalogue.degrees.find(
    (item) => item.code === state.profile.degreeCode,
  );
  const timelineYears = useMemo(
    () =>
      planTimelineYears({
        degree,
        commencementYear: state.profile.commencementYear,
        extensionYears: state.profile.extensionYears,
      }),
    [degree, state.profile.commencementYear, state.profile.extensionYears],
  );
  const timelineTerms = useMemo(
    () => planTimelineTerms({ terms: catalogue.terms, years: timelineYears }),
    [catalogue.terms, timelineYears],
  );
  const planningCatalogue = useMemo(
    () => ({ ...catalogue, terms: timelineTerms }),
    [catalogue, timelineTerms],
  );

  const entries = useMemo<Entry[]>(() => {
    const termOrder = new Map(
      timelineTerms.map((term, index) => [term.id, index]),
    );
    return state.attempts
      .flatMap((attempt) => {
        const course = planningCourseForAttempt(attempt, planningCatalogue);
        if (!course) return [];
        return [
          {
            attempt,
            course,
            term: timelineTerms.find((term) => term.id === attempt.termId),
            units: unitsForAttempt(attempt, course),
          },
        ];
      })
      .sort(
        (left, right) =>
          (termOrder.get(left.attempt.termId) ?? Number.MAX_SAFE_INTEGER) -
          (termOrder.get(right.attempt.termId) ?? Number.MAX_SAFE_INTEGER),
      );
  }, [planningCatalogue, state.attempts, timelineTerms]);

  const completed = entries.filter((e) => e.attempt.status === "completed");
  const failed = entries.filter((e) => e.attempt.status === "failed");
  const average = weightedAverage(entries);
  const earned = completed.reduce((total, entry) => total + entry.units, 0);
  const counts = FILTERS.map((item) => ({
    ...item,
    count:
      item.value === "all"
        ? entries.length
        : entries.filter((e) => e.attempt.status === item.value).length,
  }));

  const visible =
    filter === "all"
      ? entries
      : entries.filter((entry) => entry.attempt.status === filter);

  /** Entries grouped by study period in timeline order; unscheduled last. */
  const groups = useMemo(() => {
    const map = new Map<string, { term: Term | undefined; items: Entry[] }>();
    visible.forEach((entry) => {
      const key = entry.term?.id ?? "later";
      const group = map.get(key) ?? { term: entry.term, items: [] };
      group.items.push(entry);
      map.set(key, group);
    });
    return [...map.values()];
  }, [visible]);

  const gradeCounts = GRADE_BANDS.map((band) => ({
    ...band,
    count: entries.filter(
      (entry) =>
        entry.attempt.mark !== undefined &&
        gradeFor(entry.attempt.mark).grade === band.grade,
    ).length,
  }));
  const markedCount = gradeCounts.reduce(
    (total, band) => total + band.count,
    0,
  );

  const unitsByYear = timelineYears.map((year) => {
    const inYear = entries.filter((entry) => entry.term?.year === year.year);
    return {
      label: `Year ${year.studyYear} · ${year.year}`,
      completed: inYear
        .filter((e) => e.attempt.status === "completed")
        .reduce((total, e) => total + e.units, 0),
      planned: inYear
        .filter((e) => e.attempt.status !== "completed")
        .reduce((total, e) => total + e.units, 0),
    };
  });
  const yearPeak = Math.max(
    24,
    ...unitsByYear.map((year) => year.completed + year.planned),
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <h1 className="sr-only">Academic overview</h1>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatTile
            icon={<BookCheck aria-hidden="true" />}
            label="Completed courses"
            value={completed.length}
            description={
              entries.length > 0
                ? `of ${entries.length} in your plan`
                : "Nothing recorded yet"
            }
          />
          <StatTile
            icon={<Award aria-hidden="true" />}
            label="Weighted average mark"
            value={average ?? "Not set"}
            description={
              average !== null
                ? `${gradeFor(average).label} band`
                : "Record marks to see an average"
            }
          />
          <StatTile
            icon={<GraduationCap aria-hidden="true" />}
            label="Units earned"
            value={earned}
            unit={degree?.units ? `/ ${degree.units}` : undefined}
            description="Completed attempts only"
          />
          <StatTile
            icon={<FileClock aria-hidden="true" />}
            label="Failed attempts"
            value={failed.length}
            description={
              failed.length > 0
                ? "Check repeat and progression rules"
                : "No failed attempts"
            }
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <Card className="overflow-hidden">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    <h2>Course history</h2>
                  </CardTitle>
                  <CardDescription>
                    Every course saved in your Coursemap plan, by study period.
                  </CardDescription>
                </div>
                <Tabs
                  onValueChange={(value) => setFilter(value as Filter)}
                  value={filter}
                >
                  <TabsList aria-label="Filter course history">
                    {counts.map((item) => (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        disabled={item.value !== "all" && item.count === 0}
                      >
                        {item.label}
                        <span className="ml-1 text-muted-foreground tabular-nums">
                          {item.count}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            {groups.length === 0 ? (
              <Empty className="rounded-none border-t px-5 py-14">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookCheck aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {entries.length === 0
                      ? "No course attempts recorded yet"
                      : "Nothing matches this filter"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {entries.length === 0
                      ? "Add courses to your plan and mark them completed as you go."
                      : "Choose another status to see those courses."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="divide-y border-t">
                {groups.map(({ term, items }) => (
                  <section key={term?.id ?? "later"} className="py-1">
                    <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-1">
                      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {term ? `${term.name} ${term.year}` : "Later"}
                      </h3>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {items.reduce((total, e) => total + e.units, 0)} units
                      </span>
                    </header>
                    <ul className="px-2 pb-2">
                      {items.map((entry) => (
                        <li key={entry.attempt.id}>
                          <button
                            className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                            onClick={() => setSelectedAttempt(entry.attempt.id)}
                            type="button"
                          >
                            <CourseToken
                              accent={entry.course.accent}
                              code={entry.course.code}
                              size="sm"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {entry.course.name}
                              </span>
                              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                {entry.course.code} · {entry.units} units
                              </span>
                            </span>
                            <span className="flex items-center gap-3">
                              {entry.attempt.mark !== undefined ? (
                                <span className="text-right leading-tight">
                                  <span className="block text-sm font-semibold tabular-nums">
                                    {entry.attempt.mark}
                                  </span>
                                  <span className="block text-[11px] text-muted-foreground">
                                    {gradeFor(entry.attempt.mark).grade}
                                  </span>
                                </span>
                              ) : null}
                              <Badge
                                className="w-20 justify-center"
                                variant={
                                  badgeVariantForTone[
                                    STATUS_TONE[entry.attempt.status]
                                  ]
                                }
                              >
                                {STATUS_LABEL[entry.attempt.status]}
                              </Badge>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Grade distribution</CardTitle>
                <CardDescription>
                  {markedCount > 0
                    ? `${markedCount} recorded ${markedCount === 1 ? "mark" : "marks"}`
                    : "Record marks in a course to see your grade mix."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {gradeCounts.map((band) => (
                    <li
                      key={band.grade}
                      className="grid grid-cols-[2.25rem_minmax(0,1fr)_1.5rem] items-center gap-3 text-xs"
                    >
                      <span className="font-semibold">{band.grade}</span>
                      <span
                        aria-hidden="true"
                        className="h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            band.grade === "N"
                              ? "bg-destructive"
                              : "bg-primary",
                          )}
                          style={{
                            width: `${markedCount ? (band.count / markedCount) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      <span className="text-right text-muted-foreground tabular-nums">
                        {band.count}
                      </span>
                      <span className="sr-only">{band.label}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Units by year</CardTitle>
                <CardDescription>
                  Completed against planned load.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {unitsByYear.map((year) => (
                    <li key={year.label} className="text-xs">
                      <div className="mb-1 flex justify-between">
                        <span className="font-medium">{year.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {year.completed + year.planned} units
                        </span>
                      </div>
                      <div
                        aria-hidden="true"
                        className="flex h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(year.completed / yearPeak) * 100}%`,
                          }}
                        />
                        <span
                          className="h-full bg-primary/50"
                          style={{
                            width: `${(year.planned / yearPeak) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary/50" />
                    Planned or enrolled
                  </span>
                </p>
              </CardContent>
            </Card>

            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
              Marks here are the ones you record in Coursemap. Your official
              transcript from ANU remains the authoritative record.
            </p>
          </div>
        </div>
      </div>

      {selectedAttempt ? (
        <CourseDrawer
          attemptId={selectedAttempt}
          catalogue={planningCatalogue}
          onClose={() => setSelectedAttempt(null)}
        />
      ) : null}
    </AppShell>
  );
}
