"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, CalendarClock, GitBranch, Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/shell";
import { TermChooser } from "@/components/overlays";
import { PrereqGraph } from "@/components/prereq-graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCoursemap } from "@/app/providers";
import { cn } from "@/lib/cn";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";

const tabs = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "requisites", label: "Requisites", icon: GitBranch },
  { id: "offerings", label: "Offerings", icon: CalendarClock },
] as const;

function formatUpdatedAt(value: string | null) {
  if (!value) return "Not listed";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function CourseDetailClient({ course }: { course: CatalogueCourse }) {
  const { state } = useCoursemap();
  const searchParams = useSearchParams();
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
  const requestedTab = searchParams.get("tab") ?? "overview";
  const activeTab = tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "overview";
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
          className={cn(
            "flex-col gap-4",
            activeTab === "requisites" ? "flex" : "hidden",
          )}
        >
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Full prerequisite chain
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Structured prerequisite links extracted from the ANU source.
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
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Requisites and compatibility
              </h2>
            </div>
            <div className="space-y-5 p-5 text-[13px] leading-relaxed text-zinc-700">
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Prerequisites
                </h3>
                <p className="mt-1 whitespace-pre-line">
                  {course.prerequisiteText}
                </p>
              </div>
              {course.incompatibilityText ? (
                <div>
                  <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Incompatibilities
                  </h3>
                  <p className="mt-1 whitespace-pre-line">
                    {course.incompatibilityText}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        <section
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
      </div>

      {planOpen ? (
        <TermChooser course={course} onClose={() => setPlanOpen(false)} />
      ) : null}
    </AppShell>
  );
}
