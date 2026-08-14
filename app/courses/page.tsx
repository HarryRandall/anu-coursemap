"use client";

import Link from "next/link";
import {
  ArrowRight,
  FilterX,
  Grid2X2,
  List,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { AppShell } from "@/components/shell";
import { TermChooser } from "@/components/overlays";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { CourseToken } from "@/components/ui/course-token";
import { Course, courses } from "@/lib/catalogue";

export default function CoursesPage() {
  const { state } = useCoursemap();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [level, setLevel] = useState("All levels");
  const [session, setSession] = useState("All sessions");
  const [convener, setConvener] = useState("All conveners");
  const [view, setView] = useState<"list" | "grid">("list");
  const [planCourse, setPlanCourse] = useState<Course | null>(null);

  const subjects = [...new Set(courses.map((course) => course.subject))].sort();
  const conveners = [
    ...new Set(courses.map((course) => course.convener)),
  ].sort();
  const filtered = useMemo(
    () =>
      courses.filter((course) => {
        const text =
          `${course.code} ${course.name} ${course.school} ${course.convener}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (subject === "All subjects" || course.subject === subject) &&
          (level === "All levels" || String(course.level / 1000) === level) &&
          (session === "All sessions" || course.sessions.includes(session)) &&
          (convener === "All conveners" || course.convener === convener)
        );
      }),
    [query, subject, level, session, convener],
  );

  const clear = () => {
    setQuery("");
    setSubject("All subjects");
    setLevel("All levels");
    setSession("All sessions");
    setConvener("All conveners");
  };

  return (
    <AppShell
      title="Courses"
      subtitle={`${state.profile.catalogueYear} catalogue`}
    >
      <h1 className="sr-only">Courses</h1>
      <Card className="overflow-hidden">
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-zinc-100 px-5">
          <Search size={18} className="shrink-0 text-zinc-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code, course name, school or convener"
            aria-label="Search course catalogue"
            className="h-14 w-full bg-transparent text-[15px] placeholder:text-zinc-400 focus:outline-none"
          />
          <span className="shrink-0 text-xs text-zinc-400">
            {filtered.length} results
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-end">
            <Field label="Subject" className="min-w-36">
              <Select
                aria-label="Subject"
                value={subject}
                onChange={setSubject}
                options={[
                  { value: "All subjects", label: "All subjects" },
                  ...subjects.map((item) => ({ value: item, label: item })),
                ]}
              />
            </Field>
            <Field label="Level" className="min-w-32">
              <Select
                aria-label="Level"
                value={level}
                onChange={setLevel}
                options={[
                  { value: "All levels", label: "All levels" },
                  { value: "1", label: "Level 1" },
                  { value: "2", label: "Level 2" },
                  { value: "3", label: "Level 3" },
                ]}
              />
            </Field>
            <Field label="Session" className="min-w-36">
              <Select
                aria-label="Session"
                value={session}
                onChange={setSession}
                options={[
                  { value: "All sessions", label: "All sessions" },
                  { value: "Semester 1", label: "Semester 1" },
                  { value: "Semester 2", label: "Semester 2" },
                ]}
              />
            </Field>
            <Field label="Convener" className="min-w-40">
              <Select
                aria-label="Convener"
                value={convener}
                onChange={setConvener}
                options={[
                  { value: "All conveners", label: "All conveners" },
                  ...conveners.map((item) => ({ value: item, label: item })),
                ]}
              />
            </Field>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 self-end"
              onClick={clear}
            >
              <FilterX size={15} /> Clear
            </Button>
          </div>

          <div className="flex self-end rounded-lg bg-white p-0.5 ring-1 ring-zinc-200 ring-inset">
            {(
              [
                ["list", List],
                ["grid", Grid2X2],
              ] as const
            ).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-label={`${key} view`}
                aria-pressed={view === key}
                className={cn(
                  "grid size-8 place-items-center rounded-md transition",
                  view === key
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-600",
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-5 py-16 text-center">
            <Search size={26} className="text-zinc-300" />
            <p className="mt-2 text-sm font-medium text-zinc-700">
              No courses found
            </p>
            <p className="text-xs text-zinc-400">
              Try removing one of your filters.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={clear}
            >
              Clear all filters
            </Button>
          </div>
        ) : view === "list" ? (
          <div className="divide-y divide-zinc-100">
            {filtered.map((course) => (
              <article
                key={course.code}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-zinc-50/70 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto]"
              >
                <Link
                  href={`/courses/${course.code}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <CourseToken code={course.code} accent={course.accent} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-zinc-900">
                      {course.name}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-400">
                      {course.code} · {course.subject}
                    </span>
                  </span>
                </Link>

                <div className="hidden min-w-0 md:block">
                  <p className="text-[12px] font-medium text-zinc-700">
                    {course.units} units · Level {course.level / 1000}
                  </p>
                  <p className="truncate text-[11px] text-zinc-400">
                    {course.sessions.join(" · ")} · {course.delivery}
                  </p>
                </div>

                <div className="hidden min-w-0 items-center gap-2 md:flex">
                  <UserRound size={15} className="shrink-0 text-zinc-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium text-zinc-700">
                      {course.convener}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-400">
                      {course.school}
                    </span>
                  </span>
                </div>

                <div className="hidden md:block">
                  <Badge
                    tone={
                      course.prerequisiteCodes.length ? "warning" : "success"
                    }
                  >
                    {course.prerequisiteCodes.length
                      ? `${course.prerequisiteCodes.length} prerequisite${course.prerequisiteCodes.length > 1 ? "s" : ""}`
                      : "Open entry"}
                  </Badge>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <IconButton
                    label={`Add ${course.code} to plan`}
                    onClick={() => setPlanCourse(course)}
                  >
                    <Plus size={16} />
                  </IconButton>
                  <Link
                    href={`/courses/${course.code}`}
                    aria-label={`View ${course.code}`}
                    className="grid size-9 place-items-center rounded-lg bg-white text-zinc-500 shadow-xs ring-1 ring-zinc-200 transition ring-inset hover:text-zinc-800 hover:ring-zinc-300"
                  >
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 bg-zinc-50/60 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => (
              <article
                key={course.code}
                className="flex flex-col rounded-xl bg-white p-4 shadow-xs ring-1 ring-zinc-200"
              >
                <div className="flex items-center justify-between">
                  <CourseToken code={course.code} accent={course.accent} />
                  <Badge tone="neutral">{course.units} units</Badge>
                </div>
                <p className="mt-4 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  {course.code} · Level {course.level / 1000}
                </p>
                <h3 className="mt-1 text-base leading-tight font-bold tracking-tight text-zinc-900">
                  {course.name}
                </h3>
                <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-zinc-500">
                  {course.description}
                </p>
                <dl className="mt-4 space-y-0 divide-y divide-zinc-100 border-t border-zinc-100 text-[12px]">
                  <div className="grid grid-cols-[4.5rem_1fr] py-2">
                    <dt className="text-zinc-400">Offered</dt>
                    <dd className="text-zinc-700">
                      {course.sessions.join(", ")}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[4.5rem_1fr] py-2">
                    <dt className="text-zinc-400">Convener</dt>
                    <dd className="text-zinc-700">{course.convener}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex gap-2 pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPlanCourse(course)}
                  >
                    <Plus size={15} /> Add
                  </Button>
                  <ButtonLink
                    variant="ghost"
                    size="sm"
                    href={`/courses/${course.code}`}
                  >
                    Details <ArrowRight size={15} />
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {planCourse && (
        <TermChooser course={planCourse} onClose={() => setPlanCourse(null)} />
      )}
    </AppShell>
  );
}
