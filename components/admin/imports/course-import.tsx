"use client";

import { Command } from "cmdk";
import { Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ImportFormShell,
  ImportQueue,
  ImportQueueItem,
} from "@/components/admin/imports/import-form-shell";
import {
  ImportRunStatus,
  type ImportProgressEvent,
} from "@/components/admin/imports/import-run-status";
import { readImportStream } from "@/components/admin/imports/import-stream";
import {
  searchImportableCourses,
  type ImportSearchResult,
} from "@/lib/catalogue-import/search-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { CommandItem, CommandList } from "@/components/ui/command";
import { Field, inputClasses } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/u;

type Pick = {
  code: string;
  title: string | null;
  status: string | null;
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
  const [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [current, setCurrent] = useState<ImportProgressEvent | null>(null);
  const [log, setLog] = useState<ImportProgressEvent[]>([]);
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

  function add(pick: { code: string; title: string | null }) {
    setError(null);
    setDone(false);
    setRunId(null);
    setPicks((currentPicks) =>
      currentPicks.some((entry) => entry.code === pick.code)
        ? currentPicks
        : [...currentPicks, { ...pick, status: null }],
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

  function setPickStatus(code: string, status: string | null) {
    setPicks((currentPicks) =>
      currentPicks.map((pick) =>
        pick.code === code ? { ...pick, status } : pick,
      ),
    );
  }

  async function runImport() {
    if (running || picks.length === 0) return;
    setError(null);
    setDone(false);
    setRunId(null);
    setLog([]);
    setCurrent({
      index: 0,
      message: "Starting import",
      total: picks.length,
    });
    setRunning(true);
    setPicks((currentPicks) =>
      currentPicks.map((pick) => ({ ...pick, status: "Queued" })),
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
          setLog((entries) => [...entries, progress].slice(-12));
          if (progress.code) {
            setPickStatus(progress.code, actionLabel(progress.action));
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

  const headline = current?.code
    ? `${current.code}`
    : running
      ? "Importing courses"
      : "Importing";

  return (
    <ImportFormShell
      title="Import courses"
      progress={
        running || done ? (
          <ImportRunStatus
            current={current}
            done={done}
            headline={headline}
            log={log}
            runHref={runId ? `/admin/imports/sync/${runId}` : "/admin/imports/sync"}
            successLabel={`Imported ${picks.length} ${picks.length === 1 ? "course" : "courses"}`}
          />
        ) : null
      }
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
              ? "Importing"
              : picks.length === 0
                ? "Import"
                : `Import ${picks.length} ${picks.length === 1 ? "course" : "courses"}`}
          </Button>
          <ButtonLink href="/admin/imports/sync" variant="ghost">
            {done ? "Back to sync" : "Cancel"}
          </ButtonLink>
        </>
      }
    >
      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {picks.length > 0 ? (
        <ImportQueue
          count={picks.length}
          label="Courses to import"
          onClear={
            running
              ? undefined
              : () => {
                  setPicks([]);
                  setDone(false);
                  setRunId(null);
                }
          }
        >
          {picks.map((pick) => (
            <ImportQueueItem
              code={pick.code}
              key={pick.code}
              onRemove={running ? undefined : () => remove(pick.code)}
              status={pick.status}
              title={pick.title}
            />
          ))}
        </ImportQueue>
      ) : null}

      <Command
        className="relative"
        shouldFilter={false}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
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
                  onSelect={() => add({ code: unmatchedCode, title: null })}
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
                    add({ code: result.code, title: result.title })
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
    </ImportFormShell>
  );
}
