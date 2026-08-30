"use client";

import { Award, BookCheck, FileClock, GraduationCap } from "lucide-react";
import { useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { CourseDrawer } from "@/components/overlays";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatTile } from "@/components/ui/stat-tile";
import type { PlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import {
  planTimelineTerms,
  planTimelineYears,
} from "@/lib/coursemap/plan-timeline";
import { planningCourseForAttempt, unitsForAttempt } from "@/lib/planner";

function weightedAverage(entries: Array<{ mark?: number; units: number }>) {
  const marked = entries.filter((entry) => entry.mark !== undefined);
  const units = marked.reduce((total, entry) => total + entry.units, 0);
  if (units === 0) return null;
  return Math.round(
    marked.reduce(
      (total, entry) => total + (entry.mark ?? 0) * entry.units,
      0,
    ) / units,
  );
}

export function AcademicRecord({ catalogue }: { catalogue: PlanCatalogue }) {
  const { state } = useCoursemap();
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
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
  const entries = useMemo(() => {
    const termOrder = new Map(
      timelineTerms.map((term, index) => [term.id, index]),
    );
    return state.attempts
      .map((attempt) => ({
        attempt,
        course: planningCourseForAttempt(attempt, planningCatalogue),
        term: timelineTerms.find((term) => term.id === attempt.termId),
      }))
      .filter(
        (
          entry,
        ): entry is {
          attempt: (typeof state.attempts)[number];
          course: NonNullable<ReturnType<typeof planningCourseForAttempt>>;
          term: (typeof timelineTerms)[number] | undefined;
        } => Boolean(entry.course),
      )
      .sort(
        (left, right) =>
          (termOrder.get(left.attempt.termId) ?? Number.MAX_SAFE_INTEGER) -
          (termOrder.get(right.attempt.termId) ?? Number.MAX_SAFE_INTEGER),
      );
  }, [planningCatalogue, state, timelineTerms]);
  const completed = entries.filter(
    (entry) => entry.attempt.status === "completed",
  );
  const average = weightedAverage(
    entries.map((entry) => ({
      mark: entry.attempt.mark,
      units: unitsForAttempt(entry.attempt, entry.course),
    })),
  );
  const earned = completed.reduce(
    (total, entry) => total + unitsForAttempt(entry.attempt, entry.course),
    0,
  );
  const failed = entries.filter(
    (entry) => entry.attempt.status === "failed",
  ).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <h1 className="sr-only">Academic overview</h1>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              icon: BookCheck,
              label: "Completed courses",
              value: completed.length,
            },
            {
              icon: Award,
              label: "Recorded mark average",
              value: average ?? "Not set",
            },
            { icon: GraduationCap, label: "Units earned", value: earned },
            { icon: FileClock, label: "Failed attempts", value: failed },
          ].map(({ icon: Icon, label, value }) => (
            <StatTile
              key={label}
              icon={<Icon aria-hidden="true" />}
              label={label}
              value={value}
            />
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardHeader
            action={<Badge tone="neutral">{entries.length} records</Badge>}
            description="Only courses saved in your Coursemap plan are shown."
            title="Course history"
          />
          {entries.length === 0 ? (
            <Empty className="rounded-none px-5 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookCheck aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No course attempts recorded yet</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y divide-zinc-100">
              {entries.map(({ attempt, course, term }) => (
                <button
                  key={attempt.id}
                  className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors outline-none hover:bg-zinc-50 focus-visible:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset motion-reduce:transition-none"
                  onClick={() => setSelectedAttempt(attempt.id)}
                  type="button"
                >
                  <CourseToken
                    accent={course.accent}
                    code={course.code}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-900">
                      {course.code} · {course.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {term ? `${term.name} ${term.year}` : "Later"}
                    </span>
                  </span>
                  <Badge
                    tone={
                      attempt.status === "completed"
                        ? "success"
                        : attempt.status === "failed"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {attempt.status}
                  </Badge>
                  {attempt.mark !== undefined && (
                    <span className="text-xs font-medium text-zinc-600">
                      {attempt.mark}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
      {selectedAttempt && (
        <CourseDrawer
          attemptId={selectedAttempt}
          catalogue={planningCatalogue}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </AppShell>
  );
}
