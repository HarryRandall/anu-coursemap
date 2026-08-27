"use client";

import { Command } from "cmdk";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImportFormShell } from "@/components/admin/imports/import-form-shell";
import type { ImportProgressEvent } from "@/components/admin/imports/import-run-status";
import { readImportStream } from "@/components/admin/imports/import-stream";
import {
  searchImportableCourses,
  type ImportSearchResult,
} from "@/lib/catalogue-import/search-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { CommandItem, CommandList } from "@/components/ui/command";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, inputClasses } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/ui";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/u;
const PAGE_SIZE = 10;

type QueueRow = {
  code: string;
  detail: string | null;
  runStatus: string | null;
  subject: string | null;
  title: string | null;
  year: number;
  years: number[];
};

function rowKey(code: string, year: number) {
  return `${code}:${year}`;
}

function planChip(
  years: readonly number[],
): { label: string; tone: Tone } {
  if (years.length === 0) return { label: "New", tone: "info" };
  return { label: "Update", tone: "brand" };
}

function actionLabel(action: string | undefined) {
  switch (action) {
    case "fetching":
      return "Fetching";
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    case "unchanged":
      return "Unchanged";
    case "failed":
      return "Failed";
    default:
      return action ?? null;
  }
}

function runTone(status: string | null): Tone {
  if (!status) return "neutral";
  const key = status.toLowerCase();
  if (key.includes("fail")) return "danger";
  if (key.includes("fetch") || key.includes("queued")) return "brand";
  if (
    key.includes("created") ||
    key.includes("updated") ||
    key.includes("unchanged")
  ) {
    return "success";
  }
  return "neutral";
}

function anuCourseUrl(year: number, code: string) {
  return `https://programsandcourses.anu.edu.au/${year}/course/${code}`;
}

export function CourseImport({ catalogueYears }: { catalogueYears: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultYear = catalogueYears[0] ?? new Date().getFullYear();
  const [yearScope, setYearScope] = useState<string>(String(defaultYear));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImportSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<QueueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [current, setCurrent] = useState<ImportProgressEvent | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalisedQuery = query.trim().toUpperCase();
  const addYears =
    yearScope === "all"
      ? catalogueYears
      : [Number(yearScope)].filter((year) => Number.isFinite(year));
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageCount = Math.max(1, Math.ceil(picks.length / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const pageRows = picks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    if (page === safePage) return;
    const params = new URLSearchParams(searchParams.toString());
    if (safePage <= 1) params.delete("page");
    else params.set("page", String(safePage));
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }, [page, pathname, router, safePage, searchParams]);

  function updateQuery(next: string) {
    setQuery(next);
    const term = next.trim().toUpperCase();
    if (timer.current) clearTimeout(timer.current);
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      setOpen(false);
      return;
    }
    setSearching(true);
    setOpen(true);
    const id = ++requestId.current;
    timer.current = setTimeout(() => {
      void searchImportableCourses(term).then((rows) => {
        if (id !== requestId.current) return;
        setResults(rows);
        setSearching(false);
      });
    }, 250);
  }

  const unmatchedCode = useMemo(() => {
    if (!COURSE_CODE_PATTERN.test(normalisedQuery)) return null;
    if (results.some((result) => result.code === normalisedQuery)) return null;
    return normalisedQuery;
  }, [normalisedQuery, results]);

  const showList =
    open &&
    normalisedQuery.length >= 2 &&
    (results.length > 0 ||
      unmatchedCode !== null ||
      (!searching && results.length === 0));

  const picked = useMemo(
    () => new Set(picks.map((pick) => rowKey(pick.code, pick.year))),
    [picks],
  );

  const completedCount = picks.filter((pick) => {
    const status = pick.runStatus?.toLowerCase() ?? "";
    return (
      status.includes("created") ||
      status.includes("updated") ||
      status.includes("unchanged") ||
      status.includes("failed")
    );
  }).length;

  function add(
    pick: {
      code: string;
      subject: string | null;
      title: string | null;
      years: number[];
    },
    targetYears: number[] = addYears,
  ) {
    setError(null);
    setDone(false);
    setRunId(null);
    setPicks((currentPicks) => {
      const next = [...currentPicks];
      for (const targetYear of targetYears) {
        if (
          next.some(
            (entry) => entry.code === pick.code && entry.year === targetYear,
          )
        ) {
          continue;
        }
        next.push({
          ...pick,
          detail: null,
          runStatus: null,
          year: targetYear,
        });
      }
      return next;
    });
    setQuery("");
    setResults([]);
    setOpen(false);
    input.current?.focus();
  }

  function remove(code: string, targetYear: number) {
    setPicks((currentPicks) =>
      currentPicks.filter(
        (entry) => !(entry.code === code && entry.year === targetYear),
      ),
    );
  }

  function queueForYear(pick: QueueRow, targetYear: number) {
    add(
      {
        code: pick.code,
        subject: pick.subject,
        title: pick.title,
        years: pick.years,
      },
      [targetYear],
    );
  }

  function patchPick(
    code: string,
    targetYear: number,
    patch: Partial<Pick<QueueRow, "detail" | "runStatus">>,
  ) {
    setPicks((currentPicks) =>
      currentPicks.map((row) =>
        row.code === code && row.year === targetYear
          ? { ...row, ...patch }
          : row,
      ),
    );
  }

  async function importYearBatch(
    catalogueYear: number,
    codes: string[],
    onProgress: (event: ImportProgressEvent) => void,
  ) {
    const response = await fetch("/api/admin/catalogue/imports/courses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        catalogueYear,
        courseCodes: codes,
      }),
    });

    let lastRunId: string | null = null;
    await readImportStream(response, (event) => {
      if (event.type === "progress") {
        onProgress({
          action: typeof event.action === "string" ? event.action : undefined,
          code: typeof event.code === "string" ? event.code : undefined,
          index: typeof event.index === "number" ? event.index : undefined,
          message:
            typeof event.message === "string" ? event.message : undefined,
          total: typeof event.total === "number" ? event.total : undefined,
        });
        return;
      }
      if (event.type === "complete") {
        const result = event.result as { runId?: string } | undefined;
        if (typeof result?.runId === "string") lastRunId = result.runId;
      }
    });
    return lastRunId;
  }

  async function runImport() {
    if (running || picks.length === 0) return;
    setError(null);
    setDone(false);
    setRunId(null);
    setCurrent({
      index: 0,
      message: "Starting import",
      total: picks.length,
    });
    setRunning(true);
    setPicks((currentPicks) =>
      currentPicks.map((pick) => ({
        ...pick,
        detail: null,
        runStatus: "Queued",
      })),
    );

    try {
      const byYear = new Map<number, QueueRow[]>();
      for (const pick of picks) {
        const group = byYear.get(pick.year) ?? [];
        group.push(pick);
        byYear.set(pick.year, group);
      }

      let finished = 0;
      let lastRunId: string | null = null;
      for (const [catalogueYear, rows] of byYear) {
        const runIdForYear = await importYearBatch(
          catalogueYear,
          rows.map((row) => row.code),
          (progress) => {
            const absoluteIndex =
              progress.index != null ? finished + progress.index : finished;
            setCurrent({
              ...progress,
              index: absoluteIndex,
              total: picks.length,
            });
            if (progress.code) {
              patchPick(progress.code, catalogueYear, {
                detail: progress.message ?? null,
                runStatus: actionLabel(progress.action),
              });
            }
          },
        );
        finished += rows.length;
        if (runIdForYear) lastRunId = runIdForYear;
      }

      if (lastRunId) setRunId(lastRunId);
      setDone(true);
      toast.success(
        `Imported ${picks.length} ${picks.length === 1 ? "course" : "courses"}.`,
      );
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
      setCurrent(null);
    } finally {
      setRunning(false);
    }
  }

  const pagination = (
    <Pagination
      alwaysShowControls
      itemName="courses"
      page={safePage}
      pageSize={PAGE_SIZE}
      pathname={pathname}
      searchParams={{
        page: safePage > 1 ? String(safePage) : undefined,
      }}
      total={picks.length}
    />
  );

  return (
    <ImportFormShell
      title="Import courses"
      footer={
        <>
          {done ? (
            <span className="mr-auto flex items-center gap-2 text-[13px] text-zinc-600">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 text-emerald-600"
              />
              Imported {picks.length}{" "}
              {picks.length === 1 ? "course" : "courses"}
              {runId ? (
                <>
                  {" · "}
                  <Link
                    className="font-medium text-brand-700 hover:text-brand-800"
                    href={`/admin/imports/sync/${runId}`}
                  >
                    View run
                  </Link>
                </>
              ) : null}
            </span>
          ) : running && current?.total ? (
            <span
              aria-live="polite"
              className="mr-auto text-[13px] text-zinc-500 tabular-nums"
            >
              {completedCount} of {current.total} finished
            </span>
          ) : null}
          <ButtonLink href="/admin/imports/sync" variant="secondary">
            {done ? "Back to sync" : "Cancel"}
          </ButtonLink>
          <Button
            aria-busy={running}
            disabled={running || picks.length === 0}
            onClick={() => void runImport()}
            variant="primary"
          >
            {running ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : null}
            {running ? "Importing" : "Import"}
          </Button>
        </>
      }
    >
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-end">
        <Field label="Find a course">
          <Command
            shouldFilter={false}
            onBlur={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) {
                return;
              }
              setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          >
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-zinc-400"
              />
              <Command.Input
                aria-label="Find a course"
                autoComplete="off"
                className={inputClasses("pl-9")}
                disabled={running}
                onFocus={() => {
                  if (normalisedQuery.length >= 2) setOpen(true);
                }}
                onValueChange={updateQuery}
                placeholder="Code or title, e.g. COMP1100"
                ref={input}
                value={query}
              />
              {searching ? (
                <Loader2
                  aria-hidden="true"
                  className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-zinc-400"
                />
              ) : null}

              {showList ? (
                <div className="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                  <CommandList className="max-h-72">
                    {!searching &&
                    results.length === 0 &&
                    !unmatchedCode ? (
                      <p className="px-2.5 py-4 text-center text-[13px] text-zinc-500">
                        No match. Type a full code like COMP1100 to pull one
                        Coursemap has never seen.
                      </p>
                    ) : null}

                    {unmatchedCode ? (
                      <CommandItem
                        disabled={addYears.every((year) =>
                          picked.has(rowKey(unmatchedCode, year)),
                        )}
                        onSelect={() =>
                          add({
                            code: unmatchedCode,
                            subject: unmatchedCode.slice(0, 4),
                            title: null,
                            years: [],
                          })
                        }
                        value={unmatchedCode}
                      >
                        <Plus
                          aria-hidden="true"
                          className="size-4 shrink-0 text-brand-600"
                        />
                        <span className="font-mono text-zinc-900">
                          {unmatchedCode}
                        </span>
                        <Badge className="ml-auto" tone="info">
                          New
                        </Badge>
                      </CommandItem>
                    ) : null}

                    {results.map((result) => {
                      const chip = planChip(result.years);
                      const queued = addYears.every((year) =>
                        picked.has(rowKey(result.code, year)),
                      );
                      return (
                        <CommandItem
                          disabled={queued}
                          key={result.code}
                          onSelect={() =>
                            add({
                              code: result.code,
                              subject: result.subject,
                              title: result.title,
                              years: result.years,
                            })
                          }
                          value={result.code}
                        >
                          <span className="w-[76px] shrink-0 font-mono text-zinc-900">
                            {result.code}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-zinc-700">
                            {result.title ?? "Untitled"}
                          </span>
                          <Badge tone={queued ? "neutral" : chip.tone}>
                            {queued ? "Queued" : chip.label}
                          </Badge>
                        </CommandItem>
                      );
                    })}
                  </CommandList>
                </div>
              ) : null}
            </div>
          </Command>
        </Field>

        <Field label="Catalogue year">
          <Select
            aria-label="Catalogue year"
            disabled={running}
            onChange={setYearScope}
            options={[
              { label: "All years", value: "all" },
              ...catalogueYears.map((year) => ({
                label: String(year),
                value: String(year),
              })),
            ]}
            value={yearScope}
          />
        </Field>
      </div>

      <section aria-label="Import queue" className="space-y-3">
        {picks.length > 0 && !running ? (
          <div className="flex justify-end">
            <Button
              className="text-zinc-500 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                setPicks([]);
                setDone(false);
                setRunId(null);
                router.replace(pathname);
              }}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
        ) : null}

        <DataTableShell footer={pagination}>
          {picks.length === 0 ? (
            <DataTableEmpty
              description="Search by code or title, then add rows to the queue."
              title="No courses queued"
            />
          ) : (
            <Table>
              <TableCaption>Courses queued for catalogue import</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((pick) => {
                  const chip = planChip(pick.years);
                  const active =
                    running &&
                    current?.code === pick.code &&
                    pick.runStatus === "Fetching";
                  const otherYears = catalogueYears.filter(
                    (value) =>
                      value !== pick.year &&
                      !picked.has(rowKey(pick.code, value)),
                  );
                  return (
                    <TableRow
                      className={cn(active && "bg-brand-50/50")}
                      key={rowKey(pick.code, pick.year)}
                    >
                      <TableCell className="font-mono text-zinc-900">
                        {pick.code}
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate">
                        {pick.title ?? (
                          <span className="text-zinc-400">Untitled</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-zinc-700">
                        {pick.year}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {pick.runStatus ? (
                            <>
                              {active ? (
                                <Loader2
                                  aria-hidden="true"
                                  className="size-3.5 animate-spin text-brand-600"
                                />
                              ) : null}
                              <Badge tone={runTone(pick.runStatus)}>
                                {pick.runStatus}
                              </Badge>
                            </>
                          ) : (
                            <Badge tone={chip.tone}>{chip.label}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {running ? null : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="ml-auto grid size-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900"
                                type="button"
                              >
                                <MoreHorizontal
                                  aria-hidden="true"
                                  size={16}
                                />
                                <span className="sr-only">
                                  Actions for {pick.code}
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a
                                  href={anuCourseUrl(pick.year, pick.code)}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  <ExternalLink aria-hidden="true" />
                                  View ANU page
                                  <span className="sr-only">
                                    {" "}
                                    (opens in a new tab)
                                  </span>
                                </a>
                              </DropdownMenuItem>
                              {otherYears.map((year) => (
                                <DropdownMenuItem
                                  key={year}
                                  onSelect={() => queueForYear(pick, year)}
                                >
                                  <Plus aria-hidden="true" />
                                  Also queue for {year}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-rose-600 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-700 [&>svg]:text-rose-500"
                                onSelect={() => remove(pick.code, pick.year)}
                              >
                                <Trash2 aria-hidden="true" />
                                Remove from list
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DataTableShell>
      </section>
    </ImportFormShell>
  );
}
