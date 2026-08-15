"use client";

import {
  ArrowRight,
  Award,
  BookCheck,
  Clock3,
  FileClock,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { CourseDrawer } from "@/components/overlays";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CourseToken } from "@/components/ui/course-token";
import { cn } from "@/lib/cn";
import {
  courseByCode,
  degreeByCode,
  majorByCode,
  terms,
} from "@/lib/catalogue";
import { earnedUnits, statusLabel } from "@/lib/planner";
import { recordedAverage, sortAttemptsByTerm } from "@/lib/student-progress";
import { statusTone, toneClasses } from "@/lib/ui";

export default function AcademicPage() {
  const { state } = useCoursemap();
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const degree = degreeByCode(state.profile.degreeCode);
  const major = majorByCode(state.profile.majorCode);
  const attempts = sortAttemptsByTerm(state.attempts);
  const completedCount = attempts.filter(
    (attempt) => attempt.status === "completed",
  ).length;
  const average = recordedAverage(attempts);
  const failedCount = attempts.filter(
    (attempt) => attempt.status === "failed",
  ).length;

  const summary = [
    {
      icon: BookCheck,
      value: completedCount,
      label: "completed courses",
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Award,
      value: average ?? "Not set",
      label: "recorded mark average",
      tone: "bg-brand-50 text-brand-600",
    },
    {
      icon: GraduationCap,
      value: earnedUnits(attempts),
      label: "units earned",
      tone: "bg-sky-50 text-sky-600",
    },
    {
      icon: FileClock,
      value: failedCount,
      label: "failed attempts",
      tone: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <AppShell title="Academic" subtitle="Your study record and degree details">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-600">
              {state.profile.catalogueYear} academic record
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
              Your academic overview
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {degree.name} · {major.name}
            </p>
          </div>
          <ButtonLink href="/profile" variant="secondary" size="sm">
            Edit academic settings
          </ButtonLink>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="flex items-center gap-3 p-4">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    item.tone,
                  )}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold tracking-tight text-zinc-900">
                    {item.value}
                  </p>
                  <p className="text-[11px] text-zinc-500">{item.label}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] text-zinc-400">
          The recorded mark average uses only marks entered in Coursemap. It is
          not an official ANU WAM or transcript.
        </p>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <Card className="overflow-hidden">
            <CardHeader
              title="Course history"
              description="Every recorded attempt remains visible."
              action={<Badge tone="neutral">{attempts.length} records</Badge>}
              icon={
                <span className="grid size-9 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                  <Clock3 size={17} />
                </span>
              }
            />

            {attempts.length > 0 ? (
              <>
                <div className="hidden grid-cols-[minmax(0,1.5fr)_1fr_0.8fr_0.5fr_0.8fr_auto] gap-4 border-y border-zinc-100 bg-zinc-50/70 px-5 py-2.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase md:grid">
                  <span>Course</span>
                  <span>Study period</span>
                  <span>Status</span>
                  <span>Mark</span>
                  <span>Units earned</span>
                  <span />
                </div>

                <div className="divide-y divide-zinc-100 border-t border-zinc-100 md:border-t-0">
                  {attempts.map((attempt) => {
                    const course = courseByCode(attempt.courseCode);
                    const term = terms.find(
                      (item) => item.id === attempt.termId,
                    );
                    if (!course || !term) return null;
                    return (
                      <button
                        key={attempt.id}
                        type="button"
                        onClick={() => setSelectedAttempt(attempt.id)}
                        className="grid min-h-16 w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 text-left transition hover:bg-zinc-50/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400 md:grid-cols-[minmax(0,1.5fr)_1fr_0.8fr_0.5fr_0.8fr_auto]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <CourseToken
                            code={course.code}
                            accent={course.accent}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold text-zinc-900">
                              {course.code}
                            </span>
                            <span className="block truncate text-[11px] text-zinc-500">
                              {course.name}
                            </span>
                          </span>
                        </span>
                        <span className="hidden text-xs text-zinc-600 md:block">
                          {term.name} {term.year < 2029 ? term.year : ""}
                        </span>
                        <span className="hidden md:block">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                              toneClasses[statusTone[attempt.status]],
                            )}
                          >
                            {statusLabel(attempt.status)}
                          </span>
                        </span>
                        <span className="hidden text-xs text-zinc-600 md:block">
                          {attempt.mark ?? "Not recorded"}
                        </span>
                        <span className="hidden text-xs text-zinc-600 md:block">
                          {attempt.status === "completed"
                            ? `${course.units} units`
                            : "0 units"}
                        </span>
                        <ArrowRight
                          size={16}
                          className="justify-self-end text-zinc-300"
                        />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="border-t border-zinc-100 px-5 py-12 text-center">
                <BookCheck className="mx-auto text-zinc-300" size={26} />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  No course attempts recorded
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Add completed or planned courses from your degree plan.
                </p>
                <ButtonLink href="/plan" size="sm" className="mt-4">
                  Open plan
                </ButtonLink>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <Badge tone="brand">Degree details</Badge>
              <h2 className="mt-3 text-base font-semibold text-zinc-900">
                {degree.name}
              </h2>
              <dl className="mt-4 divide-y divide-zinc-100 border-y border-zinc-100 text-xs">
                {[
                  ["Programme", degree.code],
                  ["Major", major.name],
                  ["Rules year", state.profile.catalogueYear],
                  ["Study load", state.profile.studyLoad],
                  ["Started", state.profile.commencementYear],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[5.5rem_1fr] gap-2 py-2.5"
                  >
                    <dt className="text-zinc-400">{label}</dt>
                    <dd className="font-medium text-zinc-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-5">
              <Badge tone="neutral">Coming soon</Badge>
              <h2 className="mt-3 text-sm font-semibold text-zinc-900">
                Credit and exemptions
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Record recognised prior learning and see how it may contribute
                to your plan. Official credit decisions will still come from
                ANU.
              </p>
              <ButtonLink
                href="/roadmap"
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
              >
                Follow progress <ArrowRight size={14} />
              </ButtonLink>
            </Card>
          </div>
        </div>
      </div>

      {selectedAttempt && (
        <CourseDrawer
          attemptId={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </AppShell>
  );
}
