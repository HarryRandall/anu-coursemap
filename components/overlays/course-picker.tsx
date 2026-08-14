"use client";

import { ArrowRight, BookMarked, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import { Course, courseOccurrenceLimit, courses, terms } from "@/lib/catalogue";
import { Modal } from "@/components/ui/overlay";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { CourseToken } from "@/components/ui/course-token";

export function CoursePicker({
  termId,
  onClose,
}: {
  termId: string;
  onClose: () => void;
}) {
  const { state, addCourse, notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [level, setLevel] = useState("All levels");
  const [convener, setConvener] = useState("All conveners");
  const [selected, setSelected] = useState<Course | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const term = terms.find((item) => item.id === termId) ?? terms[0];

  useEffect(() => searchRef.current?.focus(), []);

  const subjects = [...new Set(courses.map((course) => course.subject))].sort();
  const conveners = [
    ...new Set(courses.map((course) => course.convener)),
  ].sort();
  const courseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    state.attempts.forEach((attempt) => {
      counts.set(attempt.courseCode, (counts.get(attempt.courseCode) ?? 0) + 1);
    });
    return counts;
  }, [state.attempts]);
  const filtered = useMemo(
    () =>
      courses.filter((course) => {
        if (
          (courseCounts.get(course.code) ?? 0) >=
          courseOccurrenceLimit(course.code)
        ) {
          return false;
        }
        const matchesQuery = `${course.code} ${course.name}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesSubject =
          subject === "All subjects" || course.subject === subject;
        const matchesLevel =
          level === "All levels" || String(course.level / 1000) === level;
        const matchesConvener =
          convener === "All conveners" || course.convener === convener;
        return (
          matchesQuery && matchesSubject && matchesLevel && matchesConvener
        );
      }),
    [query, subject, level, convener, courseCounts],
  );

  const choose = (course: Course) => {
    const result = addCourse(course.code, termId);
    notify(
      result.ok
        ? `${course.code} added to ${term.name}${term.year < 2029 ? ` ${term.year}` : ""}`
        : result.message,
      result.ok ? "success" : "warning",
    );
    if (result.ok) onClose();
  };

  const resetFilters = () => {
    setQuery("");
    setSubject("All subjects");
    setLevel("All levels");
    setConvener("All conveners");
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy="course-picker-title"
      className="h-[min(46rem,calc(100dvh-3rem))] w-full max-w-4xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Add to {term.name} {term.year < 2029 ? term.year : ""}
          </p>
          <h2
            id="course-picker-title"
            className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900"
          >
            Find a course
          </h2>
        </div>
        <IconButton label="Close" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-100 px-5">
        <Search size={18} className="shrink-0 text-zinc-400" />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by course code or name"
          aria-label="Search courses"
          className="h-13 w-full bg-transparent text-[15px] placeholder:text-zinc-400 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-zinc-400">
          {filtered.length} courses
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3">
        <Field label="Subject">
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
        <Field label="Level">
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
        <Field label="Convener">
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
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          className="overflow-y-auto p-2"
          role="listbox"
          aria-label="Course results"
        >
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center">
              <Search size={22} className="text-zinc-300" />
              <p className="mt-2 text-sm font-medium text-zinc-700">
                No courses match those filters
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={resetFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            filtered.map((course) => {
              const available =
                course.sessions.includes(term.name) ||
                term.id === "unscheduled";
              return (
                <button
                  key={course.code}
                  type="button"
                  role="option"
                  aria-selected={selected?.code === course.code}
                  onClick={() => setSelected(course)}
                  onDoubleClick={() => choose(course)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition",
                    selected?.code === course.code
                      ? "bg-zinc-100 ring-1 ring-zinc-200 ring-inset"
                      : "hover:bg-zinc-50",
                  )}
                >
                  <CourseToken code={course.code} accent={course.accent} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {course.name}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {course.code} · {course.school}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                      available
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200",
                    )}
                  >
                    {available ? term.shortName : "Not offered"}
                  </span>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-zinc-300"
                    aria-hidden="true"
                  />
                </button>
              );
            })
          )}
        </div>

        <aside className="hidden overflow-y-auto border-l border-zinc-100 bg-zinc-50/70 p-5 sm:block">
          {selected ? (
            <>
              <CourseToken
                code={selected.code}
                accent={selected.accent}
                size="lg"
              />
              <p className="mt-4 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                {selected.code}
              </p>
              <h3 className="mt-1 text-lg leading-tight font-bold tracking-tight text-zinc-900">
                {selected.name}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
                {selected.description}
              </p>
              <dl className="my-5 divide-y divide-zinc-200 border-y border-zinc-200 text-[13px]">
                {[
                  ["Convener", selected.convener],
                  ["Offered", selected.sessions.join(", ")],
                  ["Level", String(selected.level)],
                  ["Requisite", selected.prerequisiteText],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[5rem_1fr] gap-2 py-2.5"
                  >
                    <dt className="text-xs text-zinc-400">{label}</dt>
                    <dd className="text-zinc-700">{value}</dd>
                  </div>
                ))}
              </dl>
              <Button
                variant="primary"
                fullWidth
                onClick={() => choose(selected)}
              >
                <Plus size={16} /> Add to {selected ? term.shortName : ""}
              </Button>
              <ButtonLink
                variant="subtle"
                fullWidth
                href={`/courses/${selected.code}`}
                className="mt-2"
              >
                View full course <ArrowRight size={15} />
              </ButtonLink>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <BookMarked size={24} className="text-zinc-300" />
              <p className="text-sm font-medium text-zinc-700">
                Select a course
              </p>
              <p className="max-w-[15rem] text-xs text-zinc-400">
                See its convener, offering and prerequisites before adding it.
              </p>
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
}
