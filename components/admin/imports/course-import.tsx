"use client";

import { Command } from "cmdk";
import { Loader2, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  searchImportableCourses,
  type ImportSearchResult,
} from "@/lib/catalogue-import/search-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { CommandItem, CommandList } from "@/components/ui/command";
import { Field, inputClasses } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/u;

/** What the picker keeps: a code is not enough to show a useful list back. */
type Pick = { code: string; title: string | null };

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
  const [progress, setProgress] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalisedQuery = query.trim().toUpperCase();

  /**
   * Debounced in the change handler rather than an effect: searching is a
   * reaction to the user typing, not synchronisation with an external system,
   * and setting state synchronously inside an effect cascades renders.
   */
  function updateQuery(next: string) {
    setQuery(next);
    setOpen(next.trim().length > 0);
    const term = next.trim().toUpperCase();
    if (timer.current) clearTimeout(timer.current);
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++requestId.current;
    timer.current = setTimeout(() => {
      void searchImportableCourses(term).then((rows) => {
        // A slow earlier request must not overwrite a newer one.
        if (id !== requestId.current) return;
        setResults(rows);
        setSearching(false);
      });
    }, 250);
  }

  /**
   * A course that has never been imported cannot appear in the search, and that
   * is exactly the first-import case. So a well-formed code the search did not
   * return is offered as its own option.
   */
  const unmatchedCode = useMemo(() => {
    if (!COURSE_CODE_PATTERN.test(normalisedQuery)) return null;
    if (results.some((result) => result.code === normalisedQuery)) return null;
    return normalisedQuery;
  }, [normalisedQuery, results]);

  const picked = useMemo(
    () => new Set(picks.map((pick) => pick.code)),
    [picks],
  );

  /**
   * Adding clears the query and keeps focus, because the task is almost always
   * "add several codes" rather than one.
   */
  function add(pick: Pick) {
    setError(null);
    setPicks((current) =>
      current.some((entry) => entry.code === pick.code)
        ? current
        : [...current, pick],
    );
    setQuery("");
    setResults([]);
    setOpen(false);
    input.current?.focus();
  }

  function remove(code: string) {
    setPicks((current) => current.filter((entry) => entry.code !== code));
  }

  async function runImport() {
    if (running || picks.length === 0) return;
    setError(null);
    setRunning(true);
    setProgress(
      `Reading ${picks.length} ${picks.length === 1 ? "page" : "pages"}`,
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
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Import failed.");

      toast.success(
        `Imported ${picks.length} ${picks.length === 1 ? "course" : "courses"}.`,
      );
      router.push("/admin/imports/sync");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-10">
      <h1 className="sr-only">Import courses</h1>

      {error ? (
        <Alert tone="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/*
        One Command wraps the input and the list so arrow keys and Enter move
        through the options without any key handling here. The list is a popover
        rather than a table: nothing is being filtered down, so an empty frame
        before the first keystroke would be describing a list that does not
        exist.
      */}
      <Command
        className="relative"
        // The server already narrowed by code; filtering again client-side
        // would hide rows matched on title.
        shouldFilter={false}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <Field label="Find a course">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            />
            <Command.Input
              // cmdk points aria-labelledby at its own Command.Label, which
              // this combobox does not use, so the name is stated here.
              aria-label="Find a course"
              autoComplete="off"
              className={inputClasses("pl-9")}
              onFocus={() => setOpen(query.trim().length > 0)}
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

        {open ? (
          <div className="absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
            <CommandList className="max-h-72">
              {/*
                Owned here rather than by Command.Empty, whose visibility is
                derived from cmdk's own filter count -- which this combobox
                deliberately switches off.
              */}
              {!searching && results.length === 0 && !unmatchedCode ? (
                <p className="px-2.5 py-6 text-center text-[13px] text-zinc-500">
                  {normalisedQuery.length < 2
                    ? "Keep typing to search."
                    : "No match. Type a full code like COMP1100 to pull one Coursemap has never seen."}
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
                    Not in Coursemap yet — fetch from ANU
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

      {/*
        The selection is a list, not a row of code-only chips. Once a code was
        picked the title vanished, so there was no way to tell COMP1100 from
        COMP1130 without importing and checking.
      */}
      {picks.length > 0 ? (
        <section aria-label="Courses to import" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-700">
              Selected {picks.length}
            </span>
            <Button onClick={() => setPicks([])} size="sm" variant="ghost">
              Clear
            </Button>
          </div>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
            {picks.map((pick) => (
              <li className="flex items-center gap-3 px-3 py-2" key={pick.code}>
                <span className="w-[76px] shrink-0 font-mono text-sm text-zinc-900">
                  {pick.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
                  {pick.title ?? "Not imported yet"}
                </span>
                <IconButton
                  label={`Remove ${pick.code}`}
                  onClick={() => remove(pick.code)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <X aria-hidden="true" size={15} />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Field className="max-w-[200px]" label="Catalogue year">
        <Select
          aria-label="Catalogue year"
          onChange={setYear}
          options={catalogueYears.map((value) => ({
            label: String(value),
            value,
          }))}
          value={year}
        />
      </Field>

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-4">
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
          Cancel
        </ButtonLink>
        {progress ? (
          <span
            aria-live="polite"
            className="text-[13px] text-zinc-500 tabular-nums"
          >
            {progress}
          </span>
        ) : null}
      </div>
    </div>
  );
}
