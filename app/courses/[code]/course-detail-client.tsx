"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarClock,
  CircleHelp,
  ClipboardCheck,
  GitBranch,
  LockKeyhole,
  MessageSquareText,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCoursemap } from "@/app/providers";
import { TermChooser } from "@/components/overlays";
import { PrereqGraph } from "@/components/prereq-graph";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";

const tabs = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "requisites", label: "Requisites", icon: GitBranch },
  { id: "offerings", label: "Offerings", icon: CalendarClock },
  { id: "student-review", label: "Student review", icon: MessageSquareText },
] as const;

type CourseTab = (typeof tabs)[number]["id"];

function tabFromSearch(value: string | null): CourseTab {
  return tabs.some((tab) => tab.id === value)
    ? (value as CourseTab)
    : "overview";
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Not listed";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function CourseReferenceText({
  text,
  availableCourseCodes,
}: {
  text: string;
  availableCourseCodes: ReadonlySet<string>;
}) {
  return text.split(/([A-Z]{4}\d{4})/gu).map((part, index) => {
    if (!/^[A-Z]{4}\d{4}$/u.test(part)) return <span key={index}>{part}</span>;
    if (availableCourseCodes.has(part)) {
      return (
        <Link
          key={index}
          href={`/courses/${part}`}
          prefetch={false}
          className="rounded font-mono font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
        >
          {part}
        </Link>
      );
    }
    return (
      <span
        key={index}
        title={`${part} is referenced by ANU but has not been imported yet`}
        className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1 font-mono font-semibold text-zinc-600"
      >
        <LockKeyhole size={10} aria-hidden="true" />
        {part}
        <span className="sr-only">Not imported yet</span>
      </span>
    );
  });
}

function CourseReferenceChips({
  course,
  availableCourseCodes,
}: {
  course: CatalogueCourse;
  availableCourseCodes: ReadonlySet<string>;
}) {
  if (course.prerequisiteCodes.length === 0) return null;
  return (
    <div className="mt-5 border-t border-zinc-100 pt-4">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        Detected course references
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {course.prerequisiteCodes.map((reference) =>
          availableCourseCodes.has(reference) ? (
            <Link
              key={reference}
              href={`/courses/${reference}`}
              prefetch={false}
              className="rounded-md bg-brand-50 px-2 py-1 font-mono text-xs font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100"
            >
              {reference}
            </Link>
          ) : (
            <span
              key={reference}
              title={`${reference} has not been imported yet`}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200"
            >
              <LockKeyhole size={11} aria-hidden="true" />
              {reference}
              <span className="sr-only">Not imported yet</span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}

export function CourseDetailClient({ course }: { course: CatalogueCourse }) {
  const { state } = useCoursemap();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CourseTab>(() =>
    tabFromSearch(searchParams.get("tab")),
  );
  const [planOpen, setPlanOpen] = useState(false);
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
  const availableCourseCodes = new Set(course.availableCourseCodes);

  useEffect(() => {
    const syncTabFromHistory = () => {
      setActiveTab(
        tabFromSearch(new URL(window.location.href).searchParams.get("tab")),
      );
    };
    window.addEventListener("popstate", syncTabFromHistory);
    return () => window.removeEventListener("popstate", syncTabFromHistory);
  }, []);

  const selectTab = (tab: CourseTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const tabLinks = tabs.map(({ id, label, icon: Icon }) => {
    const active = activeTab === id;
    return (
      <button
        key={id}
        id={`course-tab-${id}`}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls={`course-panel-${id}`}
        onClick={() => selectTab(id)}
        className={cn(
          "relative flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400 motion-reduce:transition-none",
          active
            ? "text-zinc-950 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-500 after:content-['']"
            : "text-zinc-500 hover:text-zinc-900",
        )}
      >
        <Icon size={15} aria-hidden="true" className="hidden sm:block" />
        {label}
      </button>
    );
  });

  const ruleStatus =
    course.prerequisiteCodes.length === 0
      ? "No prerequisite course codes were detected in the imported source."
      : course.reviewState === "verified"
        ? "The source record is verified. Read the ANU wording below for the exact requirement."
        : "The source wording is shown exactly as imported. Its AND, OR, mark and permission logic is not verified yet.";

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
              <Badge tone="neutral">
                {course.sessions.length
                  ? course.sessions.join(" · ")
                  : "Offering not listed"}
              </Badge>
              <Badge tone="neutral">{course.delivery}</Badge>
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => setPlanOpen(true)}
          >
            <Plus size={16} /> Add to plan
          </Button>
        </header>

        <section
          id="course-panel-overview"
          role="tabpanel"
          aria-labelledby="course-tab-overview"
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
                {course.description}
              </p>
            </div>
          </Card>
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Course essentials
              </h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
              {[
                ["Course subject", course.subject],
                ["School", course.school],
                ["Convener", course.convener],
                ["Delivery", course.delivery],
                ["Last source update", formatUpdatedAt(course.sourceUpdatedAt)],
              ].map(([label, value]) => (
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
        </section>

        <section
          id="course-panel-requisites"
          role="tabpanel"
          aria-labelledby="course-tab-requisites"
          className={cn(
            "flex-col gap-4",
            activeTab === "requisites" ? "flex" : "hidden",
          )}
        >
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Prerequisite chain and unlocks
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Detected course references stay visible even before their course
                records are imported.
              </p>
            </div>
            <div className="pt-5">
              <PrereqGraph
                code={course.code}
                prerequisiteEdges={course.prerequisiteEdges}
                completedCodes={completedCodes}
                plannedCodes={plannedCodes}
              />
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Requisites and compatibility
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Official wording is kept separate from rule logic that still
                  needs review.
                </p>
              </div>
              <Badge
                tone={course.reviewState === "verified" ? "success" : "warning"}
              >
                {course.reviewState === "verified"
                  ? "Source reviewed"
                  : "Rule logic unknown"}
              </Badge>
            </div>
            <div className="space-y-5 p-5 text-[13px] leading-relaxed text-zinc-700">
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex gap-2">
                  <CircleHelp
                    size={16}
                    className="mt-0.5 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <p className="text-[12px] text-amber-900">{ruleStatus}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Prerequisites
                </h3>
                <p className="mt-2 whitespace-pre-line">
                  <CourseReferenceText
                    text={course.prerequisiteText}
                    availableCourseCodes={availableCourseCodes}
                  />
                </p>
                <CourseReferenceChips
                  course={course}
                  availableCourseCodes={availableCourseCodes}
                />
              </div>
              {course.incompatibilityText ? (
                <div className="border-t border-zinc-100 pt-5">
                  <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Incompatibilities
                  </h3>
                  <p className="mt-2 whitespace-pre-line">
                    <CourseReferenceText
                      text={course.incompatibilityText}
                      availableCourseCodes={availableCourseCodes}
                    />
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        <section
          id="course-panel-offerings"
          role="tabpanel"
          aria-labelledby="course-tab-offerings"
          className={cn(
            "flex-col gap-4",
            activeTab === "offerings" ? "flex" : "hidden",
          )}
        >
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Available study periods
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Imported from ANU class information. Confirm enrolment dates in
                the official source.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 p-5">
              {course.sessions.length ? (
                course.sessions.map((session) => (
                  <Badge key={session} tone="neutral">
                    {session}
                  </Badge>
                ))
              ) : (
                <p className="text-[13px] text-zinc-500">
                  No course offering is listed in the imported catalogue yet.
                </p>
              )}
            </div>
          </Card>
        </section>

        <section
          id="course-panel-student-review"
          role="tabpanel"
          aria-labelledby="course-tab-student-review"
          className={cn(
            "flex-col gap-4",
            activeTab === "student-review" ? "flex" : "hidden",
          )}
        >
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Student experience and self-review
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Shared placeholder while course-specific SELT and student
                feedback are imported.
              </p>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-[13px] font-semibold text-zinc-800">
                  No course-specific ratings are shown yet
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
                  This is deliberately not a made-up score. Once authorised
                  source data is imported, it will appear here with its year and
                  provenance.
                </p>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-zinc-900">
                  A useful self-review after taking the course
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    [
                      "Workload",
                      "Were the weekly study hours manageable for the unit value?",
                    ],
                    [
                      "Assessment",
                      "Did the assessment types build the skills the course promised?",
                    ],
                    [
                      "Teaching",
                      "Were lectures, tutorials and feedback helpful when you needed them?",
                    ],
                  ].map(([title, description]) => (
                    <div
                      key={title}
                      className="rounded-xl border border-zinc-200 p-4"
                    >
                      <ClipboardCheck
                        size={17}
                        className="text-brand-600"
                        aria-hidden="true"
                      />
                      <h4 className="mt-2 text-[13px] font-semibold text-zinc-800">
                        {title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                        {description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {planOpen ? (
        <TermChooser course={course} onClose={() => setPlanOpen(false)} />
      ) : null}
    </AppShell>
  );
}
