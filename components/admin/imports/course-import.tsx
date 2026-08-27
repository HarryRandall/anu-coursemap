"use client";

import { Command } from "cmdk";
import { CheckCircle2, Loader2, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/ui";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/u;

type QueueRow = {
  code: string;
  detail: string | null;
  holdingYear: number | null;
  status: string | null;
  subject: string | null;
  title: string | null;
};

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
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(
    catalogueYears.includes(currentYear)
      ? currentYear
      : (catalogueYears[0] ?? currentYear),
  );
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
    (searching || results.length > 0 || unmatchedCode !== null) &&
    normalisedQuery.length >= 2;

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
    holdingYear: number | null;
    subject: string | null;
    title: string | null;
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

  return (
    <ImportFormShell
      title="Import courses"
      wide
      footer={
        <>
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
          <ButtonLink href="/admin/imports/sync" variant="ghost">
            {done ? "Back to sync" : "Cancel"}
          </ButtonLink>
          {done ? (
            <span className="ml-auto flex items-center gap-2 text-[13px] text-zinc-600">
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
              className="ml-auto text-[13px] text-zinc-500 tabular-nums"
            >
              {completedCount} of {current.total} finished
            </span>
          ) : null}
        </>
      }
    >
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-end">
        <Command
          className="relative min-w-0"
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
          <Field
            hint={
              normalisedQuery.length > 0 && normalisedQuery.length < 2
                ? "Keep typing to search."
                : undefined
            }
            label="Find a course"
          >
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
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
            </div>
          </Field>

          {showList ? (
            <div className="absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
              <CommandList className="max-h-72">
                {!searching && results.length === 0 && !unmatchedCode ? (
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
                        holdingYear: null,
                        subject: unmatchedCode.slice(0, 4),
                        title: null,
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
                    <span className="min-w-0 truncate text-zinc-500">
                      Not in Coursemap yet - fetch from ANU
                    </span>
                  </CommandItem>
                ) : null}

                {results.map((result) => (
                  <CommandItem
                    disabled={picked.has(result.code)}
                    key={result.code}
                    onSelect={() =>
                      add({
                        code: result.code,
                        holdingYear: result.year,
                        subject: result.subject,
                        title: result.title,
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
                    <span className="shrink-0 text-[13px] text-zinc-400 tabular-nums">
                      {picked.has(result.code)
                        ? "Added"
                        : result.imported && result.year
                          ? `Holding ${result.year}`
                          : "New"}
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </div>
          ) : null}
        </Command>

        <Field label="Catalogue year">
          <Select
            aria-label="Catalogue year"
            disabled={running}
            onChange={setYear}
            options={catalogueYears.map((value) => ({
              label: String(value),
              value,
            }))}
            value={year}
          />
        </Field>
      </div>

      <section aria-label="Import queue" className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900">
              {picks.length === 0
                ? "Queue"
                : `${picks.length} ${picks.length === 1 ? "course" : "courses"} for ${year}`}
            </p>
            <p className="text-[13px] text-zinc-500">
              {running
                ? "Progress updates in the table as each page is pulled."
                : "Each row is imported into the catalogue year selected above."}
            </p>
          </div>
          {picks.length > 0 && !running ? (
            <Button
              onClick={() => {
                setPicks([]);
                setDone(false);
                setRunId(null);
              }}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          ) : null}
        </div>

        <DataTableShell>
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
                  <TableHead>In Coursemap</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Remove</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {picks.map((pick) => {
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
                          <span className="text-zinc-400">Not imported yet</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-zinc-700">
                        {year}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {pick.holdingYear ? (
                          <span className="tabular-nums">
                            Holding {pick.holdingYear}
                          </span>
                        ) : (
                          <span className="text-zinc-400">New</span>
                        )}
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
