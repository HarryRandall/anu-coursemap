"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  GitBranch,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { TermChooser } from "@/components/overlays";
import { PrereqGraph } from "@/components/prereq-graph";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Course,
  CourseDetail,
  courseByCode,
  courseDetail,
  prerequisiteChainCodes,
} from "@/lib/catalogue";
import { StudentExperienceTrend } from "@/components/charts/student-experience-trend";

const tabs = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "requisites", label: "Requisites", icon: GitBranch },
  { id: "assessment", label: "Assessment", icon: ClipboardList },
  { id: "classes", label: "Classes and fees", icon: CalendarClock },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
] as const;

export default function CoursePage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const { state } = useCoursemap();
  const [planCourse, setPlanCourse] = useState<Course | null>(null);
  const course = courseByCode(String(params.code).toUpperCase());
  const fallbackDetail = course ? courseDetail(course) : null;
  const [officialDetail, setOfficialDetail] = useState<{
    code: string;
    detail: CourseDetail;
  } | null>(null);
  const courseCode = course?.code;

  useEffect(() => {
    if (!courseCode) return;

    const controller = new AbortController();
    void fetch(`/api/courses/${courseCode}/details`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { detail?: CourseDetail };
      })
      .then((payload) => {
        if (payload?.detail)
          setOfficialDetail({ code: courseCode, detail: payload.detail });
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [courseCode]);
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

  const detail =
    officialDetail?.code === course.code
      ? officialDetail.detail
      : fallbackDetail!;
  const prerequisiteChain = prerequisiteChainCodes(course.code);
  const prerequisitesMet = prerequisiteChain.every((code) =>
    completedCodes.has(code),
  );
  const latestSelt = detail.selt[detail.selt.length - 1];
  const requestedTab = searchParams.get("tab") ?? "overview";
  const activeTab = tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "overview";

  const essentials: [string, string][] = [
    ["Code", course.code],
    ["Unit value", `${course.units} units`],
    ["Course subject", course.subject],
    ["Level", `Level ${course.level / 1000}`],
    ["Mode of delivery", course.delivery],
    ["Areas of interest", detail.areasOfInterest.join(", ")],
  ];
  const teachingDetails: [string, string][] = [
    ["Offered by", course.school],
    ["ANU College", detail.college],
    ["Academic career", detail.career],
    ["Course convener", course.convener],
    ["Offered in", course.sessions.join(", ")],
    ["Co-taught course", detail.coTaught.join(", ") || "None"],
    ["Workload", `${detail.workloadHours} hours`],
    ["Fee band", `Band ${detail.feeBand}`],
    ["Last changed", course.lastChanged],
  ];

  const tabLinks = tabs.map(({ id, label, icon: Icon }) => {
    const active = activeTab === id;
    return (
      <Link
        key={id}
        href={
          id === "overview"
            ? `/courses/${course.code}`
            : `/courses/${course.code}?tab=${id}`
        }
        replace
        scroll={false}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400 motion-reduce:transition-none",
          active
            ? "text-zinc-950 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-500 after:content-['']"
            : "text-zinc-500 hover:text-zinc-900",
        )}
      >
        <Icon size={15} aria-hidden="true" className="hidden sm:block" />
        {label}
      </Link>
    );
  });

  return (
    <AppShell
      title={course.code}
      subtitle={`${course.year} course version`}
      tabs={tabLinks}
    >
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              {course.code} · {course.subject} · Level {course.level / 1000}
            </p>
            <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {course.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{course.units} units</Badge>
              <Badge tone="neutral">{course.sessions.join(" · ")}</Badge>
              <Badge tone="neutral">{course.delivery}</Badge>
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => setPlanCourse(course)}
          >
            <Plus size={16} /> Add to plan
          </Button>
        </header>

        <div className="min-w-0">
          {/* Overview: the essential course information only */}
          {/* Reviews: student experience and question-level results */}
          <section
            className={cn(
              "flex-col gap-4",
              activeTab === "overview" ? "flex" : "hidden",
            )}
          >
            <Card>
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  About this course
                </h2>
              </div>
              <div className="p-5">
                <p className="max-w-4xl text-[13px] leading-relaxed text-zinc-600">
                  {detail.about}
                </p>
              </div>
            </Card>

            <div className="grid items-start gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Card>
                  <div className="border-b border-zinc-100 px-5 py-4">
                    <h2 className="text-[15px] font-semibold text-zinc-900">
                      Course essentials
                    </h2>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5">
                    {essentials.map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                          {label}
                        </dt>
                        <dd className="mt-0.5 text-[12px] leading-relaxed font-medium break-words text-zinc-700">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                {detail.learningOutcomes.length > 0 && (
                  <Card>
                    <div className="border-b border-zinc-100 px-5 py-4">
                      <h2 className="text-[15px] font-semibold text-zinc-900">
                        What you will learn
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Learning outcomes on successful completion.
                      </p>
                    </div>
                    <ol className="space-y-2.5 p-5">
                      {detail.learningOutcomes.map((outcome, index) => (
                        <li key={outcome} className="flex items-start gap-3">
                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-50 font-mono text-[11px] font-semibold text-brand-700">
                            {index + 1}
                          </span>
                          <p className="pt-0.5 text-[13px] leading-relaxed text-zinc-700">
                            {outcome}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </div>

              <Card>
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="text-[15px] font-semibold text-zinc-900">
                    Teaching and enrolment
                  </h2>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5">
                  {teachingDetails.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                        {label}
                      </dt>
                      <dd className="mt-0.5 text-[12px] leading-relaxed font-medium break-words text-zinc-700">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t border-zinc-100 px-5 py-4">
                  <a
                    href={course.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    View the ANU course source
                  </a>
                </div>
              </Card>
            </div>
          </section>

          {/* Requisites: graph plus rules */}
          <section
            className={cn(
              "flex-col gap-4",
              activeTab === "requisites" ? "flex" : "hidden",
            )}
          >
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

            <Card>
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Requisites and compatibility
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Rules for the {course.year} course version.
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

                {detail.coTaught.length > 0 && (
                  <div className="flex items-start gap-3 rounded-xl p-3.5 ring-1 ring-zinc-200 ring-inset">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                      <Users size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-900">
                        Co-taught with
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
                        {detail.coTaught.length === 1
                          ? "Shares classes with the postgraduate version "
                          : "Shares classes with the postgraduate versions "}
                        <span className="font-mono">
                          {detail.coTaught.join(", ")}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {course.countsTowards.length > 0 && (
              <Card>
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="text-[15px] font-semibold text-zinc-900">
                    Counts towards
                  </h2>
                </div>
                <ul className="divide-y divide-zinc-100 px-5">
                  {course.countsTowards.map((item, index) => (
                    <li
                      key={item}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <span className="text-[13px] font-medium text-zinc-700">
                        {item}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {index === 0 ? "Primary" : "Eligible"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          {/* Assessment and workload */}
          <section
            className={cn(
              "flex-col gap-4",
              activeTab === "assessment" ? "flex" : "hidden",
            )}
          >
            {detail.assessment.length > 0 && (
              <Card>
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="text-[15px] font-semibold text-zinc-900">
                    Indicative assessment
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {detail.assessmentNote}
                  </p>
                </div>
                <div className="space-y-4 p-5">
                  {detail.assessment.map((item) => (
                    <div key={item.title}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 text-[13px] font-medium text-zinc-800">
                          {item.title}
                        </p>
                        <p className="shrink-0 text-[13px] font-semibold text-zinc-900 tabular-nums">
                          {item.weight}%
                        </p>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"
                        role="presentation"
                      >
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${item.weight}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {item.outcomes.length === 1
                          ? `Assesses outcome ${item.outcomes[0]}`
                          : `Assesses outcomes ${item.outcomes.join(", ")}`}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Workload and materials
                </h2>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                    <Clock3 size={17} />
                  </span>
                  <p className="pt-1 text-[13px] leading-relaxed text-zinc-600">
                    Students are expected to commit about{" "}
                    <span className="font-semibold text-zinc-900">
                      {detail.workloadHours} hours
                    </span>{" "}
                    to this course, including scheduled classes and
                    self-directed study.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600">
                    <BookOpen size={17} />
                  </span>
                  <p className="pt-1 text-[13px] leading-relaxed text-zinc-600">
                    Information about prescribed texts is confirmed in the class
                    summary at the start of each offering.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Classes, dates and fees */}
          <section
            className={cn(
              "flex-col gap-4",
              activeTab === "classes" ? "flex" : "hidden",
            )}
          >
            <Card>
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Offerings and key dates
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {course.year} classes, enrolment deadlines and census dates.
                </p>
              </div>
              <div className="space-y-3 p-4">
                {detail.offerings.map((offering) => (
                  <div
                    key={offering.session}
                    className="rounded-xl p-3.5 ring-1 ring-zinc-200 ring-inset"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
                        <CalendarClock size={15} className="text-zinc-400" />
                        {offering.session}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Class {offering.classNumber} · {offering.mode}
                      </p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(
                        [
                          ["Starts", offering.startDate],
                          ["Last day to enrol", offering.lastEnrolDate],
                          ["Census", offering.censusDate],
                          ["Ends", offering.endDate],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                            {label}
                          </dt>
                          <dd className="mt-0.5 text-[12px] font-medium text-zinc-700">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Indicative fees
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Tuition amounts for the {course.year} academic year. Fees are
                  indexed annually.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
                <StatTile
                  label="Contribution band"
                  value={`Band ${detail.feeBand}`}
                />
                <StatTile
                  label="Domestic"
                  value={`$${detail.domesticFee.toLocaleString("en-AU")}`}
                />
                <StatTile
                  label="International"
                  value={`$${detail.internationalFee.toLocaleString("en-AU")}`}
                />
              </div>
              <p className="px-4 pb-4 text-[11px] leading-relaxed text-zinc-400">
                Commonwealth supported contribution amounts are set by the
                Australian Government. One EFTSL is 48 units, normally eight
                6-unit courses.
              </p>
            </Card>
          </section>

          <section
            className={cn(
              "flex-col gap-4",
              activeTab === "reviews" ? "flex" : "hidden",
            )}
          >
            {detail.selt.length > 0 && (
              <StudentExperienceTrend code={course.code} data={detail.selt} />
            )}

            {latestSelt && (
              <Card>
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="text-[15px] font-semibold text-zinc-900">
                    Experience by question theme
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Agreement in the latest surveyed term ({latestSelt.term}).
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                  {detail.seltThemes.map((item) => (
                    <div
                      key={item.theme}
                      className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3.5 py-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 text-[12px] text-zinc-600">
                          {item.theme}
                        </p>
                        <p className="shrink-0 text-[12px] font-semibold text-zinc-800 tabular-nums">
                          {item.agreement}%
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-brand-400"
                          style={{ width: `${item.agreement}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </section>
        </div>
      </div>

      {planCourse && (
        <TermChooser course={planCourse} onClose={() => setPlanCourse(null)} />
      )}
    </AppShell>
  );
}
