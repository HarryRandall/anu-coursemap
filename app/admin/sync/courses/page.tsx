"use client";

import Link from "next/link";
import { Check, ExternalLink, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/shell";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const years = Array.from({ length: 13 }, (_, index) => 2026 - index);
const MAX_WEB_COURSE_IMPORTS = 100;

type CourseSearchResult = {
  code: string;
  name: string;
  year: number;
  units: number | null;
};

type SearchState = "idle" | "loading" | "ready" | "error";

function courseSourceUrl(year: number, code: string) {
  return `https://programsandcourses.anu.edu.au/${year}/course/${code}`;
}

export default function AdminCourseSyncPage() {
  const [target, setTarget] = useState<"selected" | "all">("selected");
  const [year, setYear] = useState(2026);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<CourseSearchResult[]>(
    [],
  );
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const searchRequest = useRef(0);
  const router = useRouter();

  const selectedCodes = useMemo(
    () => new Set(selectedCourses.map((course) => course.code)),
    [selectedCourses],
  );

  function setCatalogueYear(value: number) {
    setYear(value);
    setSelectedCourses([]);
    setQuery("");
    setResults([]);
    setSearchState("idle");
    setSearchMessage("");
    searchRequest.current += 1;
  }

  function searchCourses(value: string) {
    setQuery(value);
    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    const trimmedQuery = value.trim();

    if (!trimmedQuery) {
      setResults([]);
      setSearchState("idle");
      setSearchMessage("");
      return;
    }

    setSearchState("loading");
    setSearchMessage("");
    window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/catalogue/courses?q=${encodeURIComponent(trimmedQuery)}&year=${year}`,
        );
        const payload = (await response.json()) as {
          results?: CourseSearchResult[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Search unavailable.");
        if (searchRequest.current !== requestId) return;

        setResults(payload.results ?? []);
        setSearchState("ready");
      } catch (error) {
        if (searchRequest.current !== requestId) return;
        setResults([]);
        setSearchState("error");
        setSearchMessage(
          error instanceof Error ? error.message : "Search unavailable.",
        );
      }
    }, 220);
  }

  function addCourse(course: CourseSearchResult) {
    if (
      selectedCodes.has(course.code) ||
      selectedCourses.length >= MAX_WEB_COURSE_IMPORTS
    )
      return;
    setSelectedCourses((current) => [...current, course]);
    searchRequest.current += 1;
    setQuery("");
    setResults([]);
    setSearchState("idle");
  }

  function openPreview() {
    const params = new URLSearchParams({
      year: String(year),
      target: target === "all" ? "all-courses" : "courses",
    });
    if (target === "selected") {
      params.set(
        "courses",
        selectedCourses.map((course) => course.code).join(","),
      );
    }
    router.push(`/admin/sync/preview?${params}`);
  }

  return (
    <AppShell admin>
      <div className="w-full">
        <nav
          aria-label="Sync type"
          className="flex gap-5 border-b border-zinc-200 text-sm font-medium"
        >
          <Link
            href="/admin/sync"
            className="-mb-px border-b-2 border-transparent pb-3 text-zinc-500 hover:text-zinc-900"
          >
            Programmes
          </Link>
          <span className="-mb-px border-b-2 border-zinc-950 pb-3 text-zinc-950">
            Course pages
          </span>
        </nav>
        <h1 className="mt-7 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          Sync course pages
        </h1>

        <section className="mt-8 border-t border-zinc-200 pt-8">
          <div className="space-y-7">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={target === "selected"}
                onClick={() => setTarget("selected")}
                className={cn(
                  "min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                  target === "selected"
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                )}
              >
                <span className="block text-sm font-semibold text-zinc-900">
                  Select course pages
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Add up to 100 ANU course pages.
                </span>
              </button>
              <button
                type="button"
                aria-pressed={target === "all"}
                onClick={() => setTarget("all")}
                className={cn(
                  "min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                  target === "all"
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                )}
              >
                <span className="block text-sm font-semibold text-zinc-900">
                  All course pages
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Every course published for this year.
                </span>
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
              {target === "selected" ? (
                <div className="relative">
                  <Field label="Find course pages">
                    <div className="relative">
                      <Search
                        aria-hidden="true"
                        size={17}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                      />
                      <Input
                        aria-label="Find course pages"
                        className="pl-9"
                        placeholder="Search ANU course pages"
                        value={query}
                        onChange={(event) => searchCourses(event.target.value)}
                      />
                    </div>
                  </Field>

                  {query && (
                    <div className="absolute z-10 mt-1 max-h-96 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
                      {searchState === "loading" && (
                        <p className="px-3 py-3 text-sm text-zinc-500">
                          Searching ANU...
                        </p>
                      )}
                      {searchState === "error" && (
                        <p className="px-3 py-3 text-sm text-rose-600">
                          {searchMessage}
                        </p>
                      )}
                      {searchState === "ready" && results.length === 0 && (
                        <p className="px-3 py-3 text-sm text-zinc-500">
                          No course pages found.
                        </p>
                      )}
                      {searchState === "ready" && results.length > 0 && (
                        <ul
                          aria-label="ANU course search results"
                          className="p-1"
                        >
                          {results.map((course) => {
                            const isSelected = selectedCodes.has(course.code);
                            const selectionLimitReached =
                              selectedCourses.length >= MAX_WEB_COURSE_IMPORTS;
                            return (
                              <li key={course.code}>
                                <button
                                  type="button"
                                  disabled={isSelected || selectionLimitReached}
                                  onClick={() => addCourse(course)}
                                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none disabled:cursor-default disabled:opacity-55"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-zinc-900">
                                      {course.name}
                                    </span>
                                    <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                                      {course.code}
                                    </span>
                                  </span>
                                  {isSelected ? (
                                    <Check
                                      size={16}
                                      className="shrink-0 text-emerald-600"
                                    />
                                  ) : (
                                    <Plus
                                      size={16}
                                      className="shrink-0 text-brand-700"
                                    />
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-10 items-center rounded-lg bg-zinc-50 px-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
                  Every ANU course page published in {year}
                </div>
              )}

              <Field label="Catalogue year">
                <Select
                  aria-label="Catalogue year"
                  value={year}
                  onChange={(value) => setCatalogueYear(Number(value))}
                  options={years.map((item) => ({
                    value: item,
                    label: String(item),
                  }))}
                />
              </Field>
            </div>

            {target === "selected" && selectedCourses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  Selected course pages ({selectedCourses.length})
                </p>
                <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
                  {selectedCourses.map((course) => (
                    <li
                      key={course.code}
                      className="flex min-h-12 items-center gap-3 px-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900">
                          {course.name}
                        </span>
                        <span className="font-mono text-xs text-zinc-500">
                          {course.code}
                        </span>
                      </span>
                      <a
                        href={courseSourceUrl(year, course.code)}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden items-center gap-1 text-xs font-medium text-brand-700 hover:underline sm:inline-flex"
                      >
                        Source <ExternalLink size={13} />
                      </a>
                      <IconButton
                        label={`Remove ${course.code}`}
                        onClick={() =>
                          setSelectedCourses((current) =>
                            current.filter((item) => item.code !== course.code),
                          )
                        }
                      >
                        <X size={15} />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 border-y border-zinc-200 py-5 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Course pages
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Course details, offerings and prerequisite rules.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Programme context
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Use programme sync for requirements and study options.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                disabled={target === "selected" && selectedCourses.length === 0}
                onClick={openPreview}
              >
                Preview sync
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
