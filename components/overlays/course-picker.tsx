"use client";

import { ArrowRight, BookMarked, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useCoursemap } from "@/app/providers";
import type { Course, Term } from "@/lib/coursemap/types";
import { Modal } from "@/components/ui/overlay";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { CourseToken } from "@/components/ui/course-token";

type CourseSearchResponse = {
  courses: Course[];
  page: number;
  pageSize: number;
  query: string;
  total: number;
};

export function CoursePicker({
  term,
  intent = "all",
  onClose,
}: {
  term: Term;
  intent?: "all" | "recommended";
  onClose: () => void;
}) {
  const { state, addCourse, notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<CourseSearchResponse | null>(null);
  const [selected, setSelected] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();

  useEffect(() => searchRef.current?.focus(), []);

  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          page: String(page),
          pageSize: "12",
        });
        const result = await fetch(`/api/courses/search?${params}`, {
          signal: controller.signal,
        });
        if (!result.ok) throw new Error("Course search is unavailable");
        const next = (await result.json()) as Omit<
          CourseSearchResponse,
          "query"
        >;
        if (!controller.signal.aborted) {
          setResponse({ ...next, query: trimmedQuery });
        }
      } catch {
        if (!controller.signal.aborted) setResponse(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [page, trimmedQuery]);

  const activeResponse =
    response?.query === trimmedQuery && trimmedQuery.length >= 2
      ? response
      : null;

  const courseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    state.attempts.forEach((attempt) => {
      counts.set(attempt.courseCode, (counts.get(attempt.courseCode) ?? 0) + 1);
    });
    return counts;
  }, [state.attempts]);
  const courses = (activeResponse?.courses ?? []).filter(
    (course) => (courseCounts.get(course.code) ?? 0) < 1,
  );

  const choose = async (course: Course) => {
    const result = await addCourse(course.code, term.id);
    notify(
      result.ok
        ? `${course.code} added to ${term.name}${term.year < 2029 ? ` ${term.year}` : ""}`
        : result.message,
      result.ok ? "success" : "warning",
    );
    if (result.ok) onClose();
  };

  const hasNextPage = Boolean(
    activeResponse &&
    activeResponse.page * activeResponse.pageSize < activeResponse.total,
  );

  return (
    <Modal
      onClose={onClose}
      labelledBy="course-picker-title"
      className="h-[min(46rem,calc(100dvh-3rem))] w-full max-w-4xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            {intent === "recommended" ? "Choose for" : "Add to"} {term.name}{" "}
            {term.year < 2029 ? term.year : ""}
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
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
            setSelected(null);
          }}
          placeholder="Search by course code or name"
          aria-label="Search courses"
          className="h-13 w-full bg-transparent text-[15px] placeholder:text-zinc-400 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-zinc-400">
          {activeResponse
            ? `${activeResponse.total} courses`
            : "Search 2+ characters"}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          className="overflow-y-auto p-2"
          role="listbox"
          aria-label="Course results"
        >
          {trimmedQuery.length < 2 ? (
            <EmptyState
              title="Search the catalogue"
              detail="Type at least two characters to find an available course without loading the full catalogue."
            />
          ) : loading && !activeResponse ? (
            <EmptyState
              title="Searching courses"
              detail="Finding matching courses..."
            />
          ) : courses.length === 0 ? (
            <EmptyState
              title="No courses match that search"
              detail="Try a course code, title, subject or convener."
            />
          ) : (
            <>
              {courses.map((course) => {
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
                    onDoubleClick={() => void choose(course)}
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
              })}
              {hasNextPage && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mx-auto my-3 flex"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "More results"}
                </Button>
              )}
            </>
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
                  ["Offered", selected.sessions.join(", ") || "Not listed"],
                  ["Level", String(selected.level / 1000)],
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
                onClick={() => void choose(selected)}
              >
                <Plus size={16} /> Add to {term.shortName}
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

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center">
      <Search size={22} className="text-zinc-300" />
      <p className="mt-2 text-sm font-medium text-zinc-700">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-zinc-400">{detail}</p>
    </div>
  );
}
