"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  CircleAlert,
  ExternalLink,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DataList,
  DataListActions,
  DataListContent,
  DataListDescription,
  DataListItem,
  DataListTitle,
} from "@/components/ui/data-list";
import { Field, FieldLabel, Select } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_WEB_COURSE_IMPORTS = 100;

type CourseSearchResult = {
  code: string;
  name: string;
  year: number;
  units: number | null;
};

type SearchState = "idle" | "loading" | "ready" | "error";
type YearState = "loading" | "ready" | "error";

function courseSourceUrl(year: number, code: string) {
  return `https://programsandcourses.anu.edu.au/${year}/course/${code}`;
}

export default function AdminCourseSyncPage() {
  const [target, setTarget] = useState<"selected" | "all">("selected");
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<CourseSearchResult[]>(
    [],
  );
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [yearState, setYearState] = useState<YearState>("loading");
  const searchRequest = useRef(0);
  const router = useRouter();

  const selectedCodes = useMemo(
    () => new Set(selectedCourses.map((course) => course.code)),
    [selectedCourses],
  );

  useEffect(() => {
    let active = true;
    async function loadYears() {
      try {
        const response = await fetch("/api/admin/catalogue/years");
        const payload = (await response.json()) as {
          years?: number[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Catalogue years unavailable.");
        if (!active) return;
        const availableYears = payload.years ?? [];
        setYears(availableYears);
        setYear((current) => current ?? availableYears[0] ?? null);
        setYearState("ready");
      } catch {
        if (active) {
          setYears([]);
          setYear(null);
          setYearState("error");
        }
      }
    }
    void loadYears();
    return () => {
      active = false;
    };
  }, []);

  function setCatalogueYear(value: number) {
    setYear(value);
    setSearchOpen(false);
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

    if (!trimmedQuery || year === null) {
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
    setSearchOpen(false);
    searchRequest.current += 1;
    setQuery("");
    setResults([]);
    setSearchState("idle");
  }

  function openPreview() {
    if (year === null) return;
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

  function setCourseSearchOpen(open: boolean) {
    setSearchOpen(open);
    if (open) return;
    searchRequest.current += 1;
    setQuery("");
    setResults([]);
    setSearchState("idle");
    setSearchMessage("");
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
            <RadioGroup
              aria-label="Course sync target"
              className="sm:grid-cols-2"
              value={target}
              onValueChange={(value) => {
                if (value === "selected" || value === "all") setTarget(value);
              }}
            >
              <RadioCard
                value="selected"
                title="Select course pages"
                description="Add up to 100 ANU course pages."
              />
              <RadioCard
                value="all"
                title="All course pages"
                description="Every course published for this year."
              />
            </RadioGroup>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
              {target === "selected" ? (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <FieldLabel>Find course pages</FieldLabel>
                  <Popover open={searchOpen} onOpenChange={setCourseSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        className="justify-between"
                        disabled={year === null}
                        fullWidth
                      >
                        <span className="inline-flex min-w-0 items-center gap-2 truncate">
                          <Search aria-hidden="true" size={16} />
                          {selectedCourses.length > 0
                            ? "Add another course page"
                            : "Find course pages"}
                        </span>
                        <Plus aria-hidden="true" size={16} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                    >
                      <Command
                        label="ANU course page search"
                        loop
                        shouldFilter={false}
                      >
                        <CommandInput
                          autoFocus
                          aria-label="Find course pages"
                          onValueChange={searchCourses}
                          placeholder="Search ANU course pages"
                          value={query}
                        />
                        <CommandList
                          className="max-h-96"
                          label="Course page search results"
                        >
                          {searchState === "idle" ? (
                            <CommandEmpty>
                              Start typing to search ANU course pages.
                            </CommandEmpty>
                          ) : null}
                          {searchState === "loading" ? (
                            <div
                              aria-label="Searching ANU course pages"
                              className="space-y-1.5 p-1"
                              role="status"
                            >
                              <span className="sr-only">Searching ANU...</span>
                              {Array.from({ length: 3 }, (_, index) => (
                                <div
                                  key={index}
                                  className="flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2.5"
                                >
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <Skeleton className="h-3 w-2/3" />
                                    <Skeleton className="h-2.5 w-20" />
                                  </div>
                                  <Skeleton className="size-5 rounded-full" />
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {searchState === "error" ? (
                            <Alert
                              className="m-1 w-auto"
                              role="alert"
                              tone="danger"
                            >
                              <CircleAlert aria-hidden="true" />
                              <AlertTitle>Course search unavailable</AlertTitle>
                              <AlertDescription>
                                {searchMessage}
                              </AlertDescription>
                            </Alert>
                          ) : null}

                          {searchState === "ready" && results.length === 0 ? (
                            <CommandEmpty>No course pages found.</CommandEmpty>
                          ) : null}

                          {searchState === "ready" && results.length > 0 ? (
                            <CommandGroup heading="ANU course pages">
                              {results.map((course) => {
                                const isSelected = selectedCodes.has(
                                  course.code,
                                );
                                const selectionLimitReached =
                                  selectedCourses.length >=
                                  MAX_WEB_COURSE_IMPORTS;
                                return (
                                  <CommandItem
                                    key={course.code}
                                    disabled={
                                      isSelected || selectionLimitReached
                                    }
                                    onSelect={() => addCourse(course)}
                                    value={`${course.code} ${course.name}`}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-medium text-zinc-900">
                                        {course.name}
                                      </span>
                                      <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                                        {course.code}
                                      </span>
                                    </span>
                                    {isSelected ? (
                                      <Check
                                        aria-hidden="true"
                                        className="shrink-0 text-emerald-600"
                                        size={16}
                                      />
                                    ) : (
                                      <Plus
                                        aria-hidden="true"
                                        className="shrink-0 text-brand-700"
                                        size={16}
                                      />
                                    )}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          ) : null}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <Alert tone="neutral">
                  <BookOpen aria-hidden="true" />
                  <AlertTitle>All course pages</AlertTitle>
                  <AlertDescription>
                    Every ANU course page published in {year}
                  </AlertDescription>
                </Alert>
              )}

              <Field label="Catalogue year">
                {yearState === "loading" ? (
                  <span aria-label="Loading catalogue years" role="status">
                    <Skeleton className="h-9 w-full" />
                  </span>
                ) : (
                  <Select
                    aria-label="Catalogue year"
                    onChange={(value) => setCatalogueYear(Number(value))}
                    options={years.map((item) => ({
                      value: item,
                      label: String(item),
                    }))}
                    disabled={year === null}
                    placeholder={
                      yearState === "error"
                        ? "Catalogue unavailable"
                        : "No catalogue years"
                    }
                    value={year ?? 0}
                  />
                )}
              </Field>
            </div>

            {yearState === "error" ? (
              <Alert role="alert" tone="danger">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Catalogue years unavailable</AlertTitle>
                <AlertDescription>
                  Catalogue years could not be loaded. Refresh the page to try
                  again.
                </AlertDescription>
              </Alert>
            ) : null}

            {target === "selected" && selectedCourses.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-zinc-800">
                  Selected course pages ({selectedCourses.length})
                </h2>
                <DataList className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  {selectedCourses.map((course) => (
                    <DataListItem key={course.code} className="flex-row">
                      <DataListContent>
                        <DataListTitle className="mt-0">
                          {course.name}
                        </DataListTitle>
                        <DataListDescription className="font-mono">
                          {course.code}
                        </DataListDescription>
                      </DataListContent>
                      <DataListActions className="flex-nowrap">
                        <a
                          href={courseSourceUrl(year ?? 0, course.code)}
                          target="_blank"
                          rel="noreferrer"
                          className="hidden items-center gap-1 text-xs font-medium text-brand-700 hover:underline sm:inline-flex"
                        >
                          Source
                          <ExternalLink size={13} aria-hidden="true" />
                        </a>
                        <IconButton
                          label={`Remove ${course.code}`}
                          onClick={() =>
                            setSelectedCourses((current) =>
                              current.filter(
                                (item) => item.code !== course.code,
                              ),
                            )
                          }
                        >
                          <X size={15} aria-hidden="true" />
                        </IconButton>
                      </DataListActions>
                    </DataListItem>
                  ))}
                </DataList>
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
                disabled={
                  year === null ||
                  (target === "selected" && selectedCourses.length === 0)
                }
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
