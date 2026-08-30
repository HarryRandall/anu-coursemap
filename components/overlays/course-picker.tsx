"use client";

import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useCoursemap } from "@/app/providers";
import type { Course, Term } from "@/lib/coursemap/types";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

type CourseSearchResponse = {
  academicYear: number;
  courses: Course[];
  page: number;
  pageSize: number;
  query: string;
  total: number;
};

function requestKey(query: string, page: number, academicYear: number) {
  return `${academicYear}:${query}:${page}`;
}

export function CoursePicker({
  term,
  intent = "all",
  academicYears = [],
  onClose,
}: {
  term?: Term;
  intent?: "all" | "recommended";
  academicYears?: number[];
  onClose: () => void;
}) {
  const { state, addCourse, notify } = useCoursemap();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<CourseSearchResponse | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [addingCode, setAddingCode] = useState<string | null>(null);
  const selectableAcademicYears = useMemo(
    () =>
      [
        ...new Set(
          academicYears.length > 0
            ? academicYears
            : [state.profile.catalogueYear],
        ),
      ].sort((left, right) => left - right),
    [academicYears, state.profile.catalogueYear],
  );
  const [unscheduledAcademicYear, setUnscheduledAcademicYear] = useState(() =>
    selectableAcademicYears.includes(state.profile.catalogueYear)
      ? state.profile.catalogueYear
      : (selectableAcademicYears[0] ?? state.profile.catalogueYear),
  );
  const openerRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const trimmedQuery = query.trim();
  const academicYear =
    term?.id === "unscheduled"
      ? unscheduledAcademicYear
      : (term?.year ?? state.profile.catalogueYear);
  const currentRequestKey = requestKey(trimmedQuery, page, academicYear);
  const loading = loadingKey === currentRequestKey;
  const failed = failedKey === currentRequestKey;

  useEffect(() => {
    if (!term || trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingKey(currentRequestKey);
      setFailedKey(null);
      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          page: String(page),
          pageSize: "10",
          year: String(academicYear),
        });
        const result = await fetch(`/api/courses/search?${params}`, {
          signal: controller.signal,
        });
        if (!result.ok) throw new Error("Course search is unavailable");

        const next = (await result.json()) as Omit<
          CourseSearchResponse,
          "academicYear" | "query"
        >;
        if (controller.signal.aborted) return;

        setResponse((current) => {
          const previous =
            page > 1 &&
            current?.query === trimmedQuery &&
            current.academicYear === academicYear
              ? current.courses
              : [];
          const courses = [...previous, ...next.courses].filter(
            (course, index, all) =>
              all.findIndex((candidate) => candidate.code === course.code) ===
              index,
          );
          return {
            ...next,
            academicYear,
            courses,
            query: trimmedQuery,
          };
        });
      } catch {
        if (!controller.signal.aborted) setFailedKey(currentRequestKey);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingKey((current) =>
            current === currentRequestKey ? null : current,
          );
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [academicYear, currentRequestKey, page, retryCount, term, trimmedQuery]);

  const activeResponse =
    response?.query === trimmedQuery &&
    response.academicYear === academicYear &&
    trimmedQuery.length >= 2
      ? response
      : null;
  const courses = activeResponse?.courses ?? [];
  const selected =
    courses.find((course) => course.code === selectedCode) ??
    courses[0] ??
    null;

  const courseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    state.attempts.forEach((attempt) => {
      counts.set(attempt.courseCode, (counts.get(attempt.courseCode) ?? 0) + 1);
    });
    return counts;
  }, [state.attempts]);

  if (!term) return null;

  const closePicker = () => {
    onClose();
    window.requestAnimationFrame(() => openerRef.current?.focus());
  };

  const choose = async (course: Course) => {
    if (addingCode || (courseCounts.get(course.code) ?? 0) > 0) return;
    setAddingCode(course.code);
    const result = await addCourse(course.code, term.id, course.year);
    notify(
      result.ok
        ? `${course.code} added to ${term.name}${term.year < 2029 ? ` ${term.year}` : ""}`
        : result.message,
      result.ok ? "success" : "warning",
    );
    if (result.ok) closePicker();
    else setAddingCode(null);
  };

  const hasNextPage = Boolean(
    activeResponse &&
    activeResponse.page * activeResponse.pageSize < activeResponse.total,
  );
  const firstPageLoading = page === 1 && !activeResponse && !failed;
  const firstPageFailed = failed && page === 1 && !activeResponse;
  const destination = `${term.name}${term.year < 2029 ? ` ${term.year}` : ""}`;

  const previewCourse = (courseCode: string) => {
    setSelectedCode(courseCode);
    setMobilePreviewOpen(true);
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.requestAnimationFrame(() => backButtonRef.current?.focus());
    }
  };

  const showResults = () => {
    setMobilePreviewOpen(false);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const retrySearch = () => {
    setFailedKey(null);
    setLoadingKey(currentRequestKey);
    setRetryCount((count) => count + 1);
  };

  const loadNextPage = () => {
    if (loading || failed || !hasNextPage) return;
    const nextPage = page + 1;
    setLoadingKey(requestKey(trimmedQuery, nextPage, academicYear));
    setPage(nextPage);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) closePicker();
      }}
    >
      <DialogContent
        className="max-w-[56rem]"
        showCloseButton
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b border-zinc-100 px-5 pt-5 pr-16 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Find a course</DialogTitle>
            <Badge tone="brand" className="py-0.5">
              {intent === "recommended" ? "Recommended for" : "Add to"}{" "}
              {destination}
            </Badge>
          </div>
          <DialogDescription>
            Search the catalogue, select a result, then review it before adding
            it to your plan.
          </DialogDescription>
          {term.id === "unscheduled" ? (
            <div className="flex max-w-xs items-center gap-3 pt-1">
              <span className="shrink-0 text-xs font-medium text-zinc-600">
                Course year
              </span>
              <Select
                aria-label="Course year for unscheduled course"
                value={academicYear}
                options={selectableAcademicYears.map((year) => ({
                  value: year,
                  label: String(year),
                }))}
                onChange={(year) => {
                  setUnscheduledAcademicYear(year);
                  setPage(1);
                  setResponse(null);
                  setSelectedCode(null);
                  setMobilePreviewOpen(false);
                  setFailedKey(null);
                }}
              />
            </div>
          ) : null}
        </DialogHeader>

        <div
          className={cn(
            "min-h-0",
            trimmedQuery.length >= 2 &&
              "grid min-w-0 grid-cols-1 md:grid-cols-[22rem_minmax(0,1fr)]",
          )}
        >
          <Command
            shouldFilter={false}
            loop
            label="Course catalogue"
            className="!contents"
          >
            <CommandInput
              ref={searchRef}
              autoFocus
              value={query}
              onValueChange={(value) => {
                const nextQuery = value.trim();
                const queryChanged = nextQuery !== trimmedQuery;
                setQuery(value);
                if (queryChanged) {
                  setPage(1);
                  setSelectedCode(null);
                  setMobilePreviewOpen(false);
                  setFailedKey(null);
                }
              }}
              wrapperClassName={cn(
                "col-span-full",
                mobilePreviewOpen && "hidden md:flex",
              )}
              placeholder="Search by course code or name"
              aria-label="Search courses"
            />

            {trimmedQuery.length < 2 ? (
              <CommandList
                label="Course results"
                className="col-span-full max-h-none overflow-hidden !p-0"
              >
                <Empty className="min-h-36 !flex-none !rounded-none !py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search />
                    </EmptyMedia>
                    <EmptyTitle>Search the catalogue</EmptyTitle>
                    <EmptyDescription>
                      Enter at least two characters to find a course.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CommandList>
            ) : (
              <section
                aria-label="Course results"
                className={cn(
                  "h-[clamp(12rem,calc(100dvh-12rem),28rem)] min-h-0 border-zinc-100 md:border-r",
                  mobilePreviewOpen
                    ? "hidden md:flex md:flex-col"
                    : "flex flex-col",
                )}
              >
                <CommandList label="Course results" className="min-h-0 flex-1">
                  {firstPageLoading ? (
                    <CourseResultSkeleton />
                  ) : firstPageFailed ? (
                    <SearchFailure />
                  ) : (
                    <>
                      <CommandEmpty>
                        {`No courses match '${trimmedQuery}'.`}
                      </CommandEmpty>
                      {courses.length > 0 ? (
                        <CommandGroup
                          heading={`${activeResponse?.total ?? courses.length} results`}
                        >
                          {courses.map((course) => {
                            const inPlan =
                              (courseCounts.get(course.code) ?? 0) > 0;
                            const available =
                              course.sessions.includes(term.name) ||
                              term.id === "unscheduled";

                            return (
                              <CommandItem
                                key={course.code}
                                value={`${course.code} ${course.name} ${course.school}`}
                                data-previewed={selectedCode === course.code}
                                onSelect={() => previewCourse(course.code)}
                                className="data-[previewed=true]:bg-brand-50 data-[previewed=true]:ring-1 data-[previewed=true]:ring-brand-100 data-[previewed=true]:ring-inset"
                              >
                                <CourseToken
                                  code={course.code}
                                  accent={course.accent}
                                  size="sm"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] font-medium text-zinc-900">
                                    {course.name}
                                  </span>
                                  <span className="block truncate text-[11px] text-zinc-500">
                                    {course.code} · {course.school}
                                  </span>
                                </span>
                                {inPlan ? (
                                  <Badge tone="brand" className="px-2 py-0.5">
                                    In plan
                                  </Badge>
                                ) : (
                                  <Badge
                                    tone={available ? "success" : "warning"}
                                    className="px-2 py-0.5"
                                  >
                                    {available ? term.shortName : "Not offered"}
                                  </Badge>
                                )}
                                <CommandShortcut aria-hidden="true">
                                  <ChevronRight size={15} />
                                </CommandShortcut>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      ) : null}
                    </>
                  )}
                </CommandList>

                {hasNextPage && !failed ? (
                  <div
                    className="shrink-0 border-t border-zinc-100 p-2"
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      disabled={loading}
                      onClick={loadNextPage}
                    >
                      {loading ? (
                        <LoaderCircle
                          size={14}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}
                      {loading ? "Loading courses" : "Load more courses"}
                    </Button>
                  </div>
                ) : null}

                {firstPageFailed || (failed && page > 1) ? (
                  <div
                    className="shrink-0 border-t border-zinc-100 p-2"
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={retrySearch}
                    >
                      {page > 1 ? "Retry loading results" : "Retry search"}
                    </Button>
                  </div>
                ) : null}
              </section>
            )}
          </Command>

          {trimmedQuery.length >= 2 ? (
            <CoursePreview
              course={selected}
              term={term}
              inPlan={
                selected ? (courseCounts.get(selected.code) ?? 0) > 0 : false
              }
              adding={addingCode === selected?.code}
              mobileOpen={mobilePreviewOpen}
              backButtonRef={backButtonRef}
              onBack={showResults}
              onAdd={() => {
                if (selected) void choose(selected);
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CoursePreview({
  course,
  term,
  inPlan,
  adding,
  mobileOpen,
  backButtonRef,
  onBack,
  onAdd,
}: {
  course: Course | null;
  term: Term;
  inPlan: boolean;
  adding: boolean;
  mobileOpen: boolean;
  backButtonRef: RefObject<HTMLButtonElement | null>;
  onBack: () => void;
  onAdd: () => void;
}) {
  return (
    <aside
      aria-label="Selected course details"
      className={cn(
        "h-[clamp(12rem,calc(100dvh-12rem),28rem)] min-h-0 bg-zinc-50/50",
        course && mobileOpen ? "flex flex-col" : "hidden md:flex md:flex-col",
      )}
    >
      {course ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <button
              ref={backButtonRef}
              type="button"
              onClick={onBack}
              className="mb-2 -ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 md:hidden"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Back to results
            </button>
            <div className="flex items-start gap-3">
              <CourseToken
                code={course.code}
                accent={course.accent}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] font-semibold text-zinc-500">
                  {course.code}
                </p>
                <h3 className="mt-0.5 text-lg leading-tight font-bold tracking-tight text-zinc-950">
                  {course.name}
                </h3>
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-5 text-zinc-600">
              {course.description || "No course description is available yet."}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-zinc-200 py-4 text-[12px]">
              <div>
                <dt className="text-zinc-400">Units</dt>
                <dd className="mt-0.5 font-medium text-zinc-800">
                  {course.units}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Level</dt>
                <dd className="mt-0.5 font-medium text-zinc-800">
                  {course.level / 1000}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Offered</dt>
                <dd className="mt-0.5 font-medium text-zinc-800">
                  {course.sessions.join(", ") || "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Convener</dt>
                <dd className="mt-0.5 truncate font-medium text-zinc-800">
                  {course.convener || "Not listed"}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                Prerequisites
              </p>
              <p className="mt-1.5 text-[12px] leading-5 text-zinc-600">
                {course.prerequisiteText || "No prerequisite listed."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-end">
            <ButtonLink
              href={`/courses/${course.code}?year=${course.year}`}
              variant="secondary"
              size="sm"
              className="min-h-11 sm:min-h-8"
            >
              View course <ExternalLink size={14} aria-hidden="true" />
            </ButtonLink>
            <Button
              variant="primary"
              size="sm"
              className="min-h-11 sm:min-h-8"
              disabled={inPlan || adding}
              onClick={onAdd}
            >
              {adding ? (
                <LoaderCircle
                  size={14}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Plus size={14} aria-hidden="true" />
              )}
              {inPlan
                ? "Already in plan"
                : adding
                  ? "Adding course"
                  : `Add to ${term.shortName}`}
            </Button>
          </div>
        </>
      ) : (
        <Empty className="!rounded-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ChevronRight />
            </EmptyMedia>
            <EmptyTitle>Select a course</EmptyTitle>
            <EmptyDescription>
              Review its description, offering and prerequisites before adding
              it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </aside>
  );
}

function CourseResultSkeleton() {
  return (
    <div className="space-y-1 p-2" aria-label="Searching courses" role="status">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Searching courses...</span>
    </div>
  );
}

function SearchFailure() {
  return (
    <Empty className="min-h-full !rounded-none">
      <EmptyHeader>
        <EmptyMedia variant="error">
          <AlertCircle />
        </EmptyMedia>
        <EmptyTitle>Course search is unavailable</EmptyTitle>
        <EmptyDescription>Try the search again in a moment.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
