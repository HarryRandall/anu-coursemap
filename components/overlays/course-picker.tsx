"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCoursemap } from "@/app/providers";
import type { Course, Term } from "@/lib/coursemap/types";
import { IconButton } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { CourseToken } from "@/components/ui/course-token";
import { Modal } from "@/components/ui/overlay";

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
  term?: Term;
  intent?: "all" | "recommended";
  onClose: () => void;
}) {
  const { state, addCourse, notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<CourseSearchResponse | null>(null);
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
  const [addingCode, setAddingCode] = useState<string | null>(null);
  const [errorQuery, setErrorQuery] = useState<string | null>(null);
  const trimmedQuery = query.trim();
  const loading = trimmedQuery.length >= 2 && loadingQuery === trimmedQuery;
  const searchError = trimmedQuery.length >= 2 && errorQuery === trimmedQuery;

  useEffect(() => {
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingQuery(trimmedQuery);
      setErrorQuery(null);
      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          page: "1",
          pageSize: "20",
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
        if (!controller.signal.aborted) {
          setResponse(null);
          setErrorQuery(trimmedQuery);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingQuery((current) =>
            current === trimmedQuery ? null : current,
          );
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [trimmedQuery]);

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

  if (!term) return null;

  const choose = async (course: Course) => {
    if (addingCode) return;
    setAddingCode(course.code);
    const result = await addCourse(course.code, term.id);
    notify(
      result.ok
        ? `${course.code} added to ${term.name}${term.year < 2029 ? ` ${term.year}` : ""}`
        : result.message,
      result.ok ? "success" : "warning",
    );
    if (result.ok) onClose();
    else setAddingCode(null);
  };

  const emptyMessage = (() => {
    if (trimmedQuery.length < 2) {
      return "Type a course code or name to search the catalogue.";
    }
    if (loading) return "Searching the catalogue...";
    if (searchError) return "Course search is unavailable. Try again.";
    if ((activeResponse?.total ?? 0) > 0) {
      return "Every matching course is already in your plan.";
    }
    return "No courses match that search.";
  })();

  const resultHeading = loading
    ? "Searching"
    : `${courses.length} ${courses.length === 1 ? "course" : "courses"}`;

  return (
    <Modal
      onClose={onClose}
      labelledBy="course-picker-title"
      align="top"
      className="max-w-2xl"
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
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

      <Command shouldFilter={false} loop>
        <CommandInput
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search by course code or name"
          aria-label="Search courses"
        />
        <CommandList className="min-h-60">
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          {courses.length > 0 && (
            <CommandGroup heading={resultHeading}>
              {courses.map((course) => {
                const available =
                  course.sessions.includes(term.name) ||
                  term.id === "unscheduled";
                const isAdding = addingCode === course.code;

                return (
                  <CommandItem
                    key={course.code}
                    value={`${course.code} ${course.name} ${course.school}`}
                    disabled={Boolean(addingCode)}
                    onSelect={() => void choose(course)}
                    className="py-2.5"
                  >
                    <CourseToken code={course.code} accent={course.accent} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-zinc-900">
                        {course.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {course.code} · {course.school} · {course.units} units
                      </span>
                    </span>
                    <span
                      className={
                        available
                          ? "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset"
                          : "shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 ring-inset"
                      }
                    >
                      {available ? term.shortName : "Not offered"}
                    </span>
                    <CommandShortcut aria-hidden="true">
                      {isAdding ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>

      <div className="hidden items-center gap-4 border-t border-zinc-100 bg-zinc-50/70 px-4 py-2 text-[11px] text-zinc-400 sm:flex">
        <span>
          <kbd className="font-sans">↑↓</kbd> Navigate
        </span>
        <span>
          <kbd className="font-sans">Enter</kbd> Add course
        </span>
        <span className="ml-auto">
          <kbd className="font-sans">Esc</kbd> Close
        </span>
      </div>
    </Modal>
  );
}
