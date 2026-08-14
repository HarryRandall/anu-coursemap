"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { TermChooser } from "@/components/overlays";
import { PrereqGraph } from "@/components/prereq-graph";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseToken } from "@/components/ui/course-token";
import { parseTone } from "@/lib/ui";
import { Course, courseByCode, prerequisiteChainCodes } from "@/lib/catalogue";

export default function CoursePage() {
  const params = useParams<{ code: string }>();
  const { state } = useCoursemap();
  const [year, setYear] = useState(state.profile.catalogueYear);
  const [planCourse, setPlanCourse] = useState<Course | null>(null);
  const course = courseByCode(String(params.code).toUpperCase());
  const completedCodes = new Set(
    state.attempts
      .filter((attempt) => attempt.status === "completed")
      .map((attempt) => attempt.courseCode),
  );
  const plannedCodes = new Set(
    state.attempts
      .filter(
        (attempt) =>
          attempt.status === "planned" || attempt.status === "enrolled",
      )
      .map((attempt) => attempt.courseCode),
  );

  if (!course) {
    return (
      <AppShell title="Course not found">
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <BookOpen size={28} className="text-zinc-300" />
          <p className="text-sm font-medium text-zinc-700">
            We could not find that course
          </p>
          <ButtonLink variant="secondary" href="/courses">
            View course catalogue
          </ButtonLink>
        </div>
      </AppShell>
    );
  }

  const prerequisiteChain = prerequisiteChainCodes(course.code);
  const prerequisitesMet = prerequisiteChain.every((code) =>
    completedCodes.has(code),
  );

  return (
    <AppShell title={course.code} subtitle={`${year} course version`}>
      {/* Hero card — compact, facts inline */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <CourseToken code={course.code} accent={course.accent} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                {course.code} · {course.subject} · Level {course.level / 1000}
              </p>
              <h1 className="mt-0.5 text-xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-2xl">
                {course.name}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-zinc-600">
                {course.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{course.units} units</Badge>
                <Badge tone="neutral">{course.sessions.join(" · ")}</Badge>
                <Badge tone="neutral">{course.delivery}</Badge>
                <Badge tone={parseTone(course.parseState)}>
                  {course.parseState}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            className="shrink-0"
            onClick={() => setPlanCourse(course)}
          >
            <Plus size={16} /> Add to plan
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex flex-col gap-4">
          {/* Prerequisite chain graph */}
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Prerequisite chain
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Everything this course needs, and what it unlocks.
              </p>
            </div>
            <div className="pt-5">
              <PrereqGraph
                code={course.code}
                completedCodes={completedCodes}
                plannedCodes={plannedCodes}
              />
            </div>
          </Card>

          {/* Requisites */}
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Requisites and compatibility
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Rules for the {year} course version.
              </p>
            </div>
            <div className="space-y-2 p-4">
              <div
                className={cn(
                  "flex items-start gap-3 rounded-xl bg-white p-3.5 ring-1 ring-inset",
                  prerequisitesMet ? "ring-emerald-200" : "ring-rose-200",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    prerequisitesMet
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600",
                  )}
                >
                  {prerequisitesMet ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <GitBranch size={17} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-zinc-900">
                      Prerequisite
                    </p>
                    <Badge tone={prerequisitesMet ? "success" : "danger"}>
                      {course.prerequisiteCodes.length === 0
                        ? "None"
                        : prerequisitesMet
                          ? "Completed"
                          : "Not completed"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
                    {course.prerequisiteText}
                  </p>
                  {prerequisiteChain.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                        Full prerequisite chain
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {prerequisiteChain.map((code) => {
                          const completed = completedCodes.has(code);
                          const planned = plannedCodes.has(code);
                          return (
                            <Link
                              key={code}
                              href={`/courses/${code}`}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] font-medium ring-1 transition ring-inset",
                                completed
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : planned
                                    ? "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50 hover:ring-zinc-300"
                                    : "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100 hover:ring-rose-300",
                              )}
                            >
                              {code}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {course.corequisiteText && (
                <div className="flex items-start gap-3 rounded-xl p-3.5 ring-1 ring-zinc-200 ring-inset">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600">
                    <GitBranch size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-900">
                      Corequisite
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
                      {course.corequisiteText}
                    </p>
                  </div>
                </div>
              )}

              {course.permissionText && (
                <div className="flex items-start gap-3 rounded-xl p-3.5 ring-1 ring-zinc-200 ring-inset">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <ShieldCheck size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-900">
                      Permission
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
                      {course.permissionText}
                    </p>
                  </div>
                </div>
              )}

              {course.incompatibilities.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl p-3.5 ring-1 ring-zinc-200 ring-inset">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                    <X size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-900">
                      Incompatible with
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {course.incompatibilities.map((code) => (
                        <Link
                          key={code}
                          href={`/courses/${code}`}
                          className="rounded-md bg-rose-50 px-2 py-1 font-mono text-[10px] font-medium text-rose-700 ring-1 ring-rose-200 transition ring-inset hover:bg-rose-100"
                        >
                          {code}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Versions */}
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Versions
              </h2>
            </div>
            <div className="flex gap-2 p-3">
              {[2026, 2025, 2024].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setYear(item)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2.5 text-center ring-1 transition",
                    year === item
                      ? "bg-zinc-900 text-white ring-zinc-900"
                      : "text-zinc-600 ring-zinc-200 hover:ring-zinc-300",
                  )}
                >
                  <span className="block text-[13px] font-semibold">
                    {item}
                  </span>
                  <span
                    className={cn(
                      "block text-[10px]",
                      year === item ? "text-zinc-300" : "text-zinc-400",
                    )}
                  >
                    {item === 2026
                      ? `Current · ${course.lastChanged}`
                      : "Archived"}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Facts sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold text-zinc-900">Details</h2>
            <dl className="mt-2 divide-y divide-zinc-100 text-[13px]">
              {[
                [
                  <CalendarDays key="i" size={14} />,
                  "Offered",
                  course.sessions.join(", "),
                ],
                [<UserRound key="i" size={14} />, "Convener", course.convener],
                [<BookOpen key="i" size={14} />, "School", course.school],
                [
                  <ShieldAlert key="i" size={14} />,
                  "Parse state",
                  course.parseState,
                ],
              ].map(([icon, label, value], index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <dt className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    {icon} {label}
                  </dt>
                  <dd className="text-right text-[12px] font-medium text-zinc-700">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <a
              href={course.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block"
            >
              <Button variant="secondary" fullWidth>
                Open ANU source <ExternalLink size={15} />
              </Button>
            </a>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold text-zinc-900">
              Counts towards
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {course.countsTowards.map((item, index) => (
                <div key={item} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      index === 0 ? "bg-brand-500" : "bg-zinc-300",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-700">
                    {item}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {index === 0 ? "Primary" : "Eligible"}
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-zinc-300" />
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      {planCourse && (
        <TermChooser course={planCourse} onClose={() => setPlanCourse(null)} />
      )}
    </AppShell>
  );
}
