"use client";

import { Command } from "cmdk";
import { CheckCircle2, Loader2, Plus, Search, X } from "lucide-react";
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
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
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
  status: string | null;
  subject: string | null;
  title: string | null;
  years: number[];
};

/**
 * What importing into the selected catalogue year will do, relative to what
 * Coursemap already holds for that course.
 */
function planChip(
  years: readonly number[],
  targetYear: number,
): { label: string; tone: Tone } {
  if (years.length === 0) return { label: "New", tone: "info" };
  if (years.includes(targetYear)) return { label: "Refresh", tone: "neutral" };
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

function progressTone(status: string | null): Tone {
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

export function CourseImport({ catalogueYears }: { catalogueYears: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Prefer the newest catalogue year so "next year" is the default pull target.
  const [year, setYear] = useState(catalogueYears[0] ?? new Date().getFullYear());
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
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageCount = Math.max(1, Math.ceil(picks.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = picks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page === safePage) return;
    const params = new URLSearchParams(searchParams.toString());
    if (safePage <= 1) params.delete("page");
    else params.set("page", String(safePage));
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }, [page, pageCount, pathname, router, safePage, searchParams]);

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

  // Only mount the list once there is something to show. An empty bordered
  // shell while the first request is in flight was shifting the page.
  const showList =
    open &&
    normalisedQuery.length >= 2 &&
    (results.length > 0 || unmatchedCode !== null || (!searching && results.length === 0));

  const picked = useMemo(
    () => new Set(picks.map((pick) => pick.code)),
    [picks],
  );

  const completedCount = picks.filter((pick) => {
    const status = pick.status?.toLowerCase() ?? "";
    return (
      status.includes("created") ||
      status.includes("updated") ||
      status.includes("unchanged") ||
      status.includes("failed")
    );
  }).length;

  function add(pick: {
    code: string;
    subject: string | null;
    title: string | null;
    years: number[];
  }) {
    setError(null);
    setDone(false);
    setRunId(null);
    setPicks((currentPicks) =>
      currentPicks.some((entry) => entry.code === pick.code)
        ? currentPicks
        : [
            ...currentPicks,
            {
              ...pick,
              detail: null,
              status: null,
            },
          ],
    );
    setQuery("");
    setResults([]);
    setOpen(false);
    input.current?.focus();
  }

  function remove(code: string) {
    setPicks((currentPicks) =>
      currentPicks.filter((entry) => entry.code !== code),
    );
  }

  function patchPick(
    code: string,
    patch: Partial<Pick<QueueRow, "detail" | "status">>,
  ) {
    setPicks((currentPicks) =>
      currentPicks.map((pick) =>
        pick.code === code ? { ...pick, ...patch } : pick,
      ),
    );
  }

  function changeYear(next: number) {
    setYear(next);
    setDone(false);
    setRunId(null);
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
        status: "Queued",
      })),
    );

    try {
      const response = await fetch("/api/admin/catalogue/imports/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogueYear: year,
          courseCodes: picks.map((pick) => pick.code),
        }),
      });

      await readImportStream(response, (event) => {
        if (event.type === "progress") {
          const progress: ImportProgressEvent = {
            action: typeof event.action === "string" ? event.action : undefined,
            code: typeof event.code === "string" ? event.code : undefined,
            index: typeof event.index === "number" ? event.index : undefined,
            message:
              typeof event.message === "string" ? event.message : undefined,
            total: typeof event.total === "number" ? event.total : undefined,
          };
          setCurrent(progress);
          if (progress.code) {
            patchPick(progress.code, {
              detail: progress.message ?? null,
              status: actionLabel(progress.action),
            });
          }
          return;
        }
        if (event.type === "complete") {
          const result = event.result as { runId?: string } | undefined;
          if (typeof result?.runId === "string") setRunId(result.runId);
        }
      });

      setDone(true);
      toast.success(
        `Imported ${picks.length} ${picks.length === 1 ? "course" : "courses"} for ${year}.`,
      );
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
      setCurrent(null);
    } finally {
      setRunning(false);
    }
  }

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
              {picks.length === 1 ? "course" : "courses"} for {year}
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
            {running
              ? current?.index && current.total
                ? `Importing ${current.index} of ${current.total}`
                : "Importing"
              : picks.length === 0
                ? "Import"
                : `Import ${picks.length} ${picks.length === 1 ? "course" : "courses"}`}
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
            {/*
              Relative only on the input shell so the result list overlays the
              page instead of growing the field and shoving the table down.
            */}
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
                        disabled={picked.has(unmatchedCode)}
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
                      const chip = planChip(result.years, year);
                      return (
                        <CommandItem
                          disabled={picked.has(result.code)}
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
                          <Badge
                            tone={picked.has(result.code) ? "neutral" : chip.tone}
                          >
                            {picked.has(result.code) ? "Queued" : chip.label}
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
            onChange={changeYear}
            options={catalogueYears.map((value) => ({
              label: String(value),
              value,
            }))}
            value={year}
          />
        </Field>
      </div>

      <section aria-label="Import queue" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-900">
            {picks.length === 0
              ? "Queue"
              : `${picks.length} ${picks.length === 1 ? "course" : "courses"} · ${year}`}
          </p>
          {picks.length > 0 && !running ? (
            <Button
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
          ) : null}
        </div>

        <DataTableShell
          footer={
            picks.length > 0 ? (
              <Pagination
                itemName="courses"
                page={safePage}
                pageSize={PAGE_SIZE}
                pathname={pathname}
                searchParams={{
                  page: safePage > 1 ? String(safePage) : undefined,
                }}
                total={picks.length}
              />
            ) : undefined
          }
        >
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
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((pick) => {
                  const chip = planChip(pick.years, year);
                  const active =
                    running &&
                    current?.code === pick.code &&
                    pick.status === "Fetching";
                  return (
                    <TableRow
                      className={cn(active && "bg-brand-50/50")}
                      key={pick.code}
                    >
                      <TableCell className="font-mono text-zinc-900">
                        {pick.code}
                      </TableCell>
                      <TableCell className="max-w-[18rem] truncate">
                        {pick.title ?? (
                          <span className="text-zinc-400">Untitled</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-zinc-700">
                        {year}
                      </TableCell>
                      <TableCell>
                        <Badge tone={chip.tone}>{chip.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {pick.status ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {active ? (
                                <Loader2
                                  aria-hidden="true"
                                  className="size-3.5 animate-spin text-brand-600"
                                />
                              ) : null}
                              <Badge tone={progressTone(pick.status)}>
                                {pick.status}
                              </Badge>
                            </div>
                            {pick.detail ? (
                              <p className="text-[12px] text-zinc-500">
                                {pick.detail}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-zinc-400">Ready</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {running ? null : (
                          <IconButton
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            label={`Remove ${pick.code}`}
                            onClick={() => remove(pick.code)}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <X aria-hidden="true" size={15} />
                          </IconButton>
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
