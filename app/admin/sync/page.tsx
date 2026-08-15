"use client";

import { Check, ExternalLink, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/shell";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const years = Array.from({ length: 13 }, (_, index) => 2026 - index);

type ImportTarget = "selected" | "all";

type ProgrammeSearchResult = {
  code: string;
  name: string;
  year: number;
  career: string | null;
  duration: number | null;
};

type SearchState = "idle" | "loading" | "ready" | "error";

function programmeSourceUrl(year: number, code: string) {
  return `https://programsandcourses.anu.edu.au/${year}/program/${code}`;
}

export default function AdminSyncPage() {
  const [target, setTarget] = useState<ImportTarget>("selected");
  const [year, setYear] = useState(2026);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProgrammeSearchResult[]>([]);
  const [selectedProgrammes, setSelectedProgrammes] = useState<
    ProgrammeSearchResult[]
  >([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const searchRequest = useRef(0);
  const router = useRouter();

  const selectedCodes = useMemo(
    () => new Set(selectedProgrammes.map((programme) => programme.code)),
    [selectedProgrammes],
  );
  const canPreview = target === "all" || selectedProgrammes.length > 0;

  function setCatalogueYear(value: number) {
    setYear(value);
    setSelectedProgrammes([]);
    setQuery("");
    setResults([]);
    setSearchState("idle");
    setSearchMessage("");
    searchRequest.current += 1;
  }

  function searchProgrammes(value: string) {
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
          `/api/admin/catalogue/programmes?q=${encodeURIComponent(trimmedQuery)}&year=${year}`,
        );
        const payload = (await response.json()) as {
          results?: ProgrammeSearchResult[];
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

  function addProgramme(programme: ProgrammeSearchResult) {
    if (selectedCodes.has(programme.code)) return;
    setSelectedProgrammes((current) => [...current, programme]);
    searchRequest.current += 1;
    setQuery("");
    setResults([]);
    setSearchState("idle");
  }

  function removeProgramme(code: string) {
    setSelectedProgrammes((current) =>
      current.filter((programme) => programme.code !== code),
    );
  }

  function openPreview() {
    const params = new URLSearchParams({ year: String(year), target });
    if (target === "selected") {
      params.set(
        "programmes",
        selectedProgrammes.map((programme) => programme.code).join(","),
      );
    }
    router.push(`/admin/sync/preview?${params}`);
  }

  return (
    <AppShell admin>
      <div className="w-full">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          Sync programmes
        </h1>

        <section className="mt-8 border-t border-zinc-200 pt-8">
          <div className="space-y-7">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={target === "selected"}
                onClick={() => {
                  setTarget("selected");
                }}
                className={cn(
                  "min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                  target === "selected"
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                )}
              >
                <span className="block text-sm font-semibold text-zinc-900">
                  Select programmes
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Add one or more programmes from ANU.
                </span>
              </button>
              <button
                type="button"
                aria-pressed={target === "all"}
                onClick={() => {
                  setTarget("all");
                }}
                className={cn(
                  "min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                  target === "all"
                    ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                )}
              >
                <span className="block text-sm font-semibold text-zinc-900">
                  All programmes
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Everything published for this year.
                </span>
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
              {target === "selected" ? (
                <div className="relative">
                  <Field label="Find programmes">
                    <div className="relative">
                      <Search
                        aria-hidden="true"
                        size={17}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                      />
                      <Input
                        aria-label="Find programmes"
                        className="pl-9"
                        placeholder="Search ANU programmes"
                        value={query}
                        onChange={(event) =>
                          searchProgrammes(event.target.value)
                        }
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
                          No programmes found.
                        </p>
                      )}
                      {searchState === "ready" && results.length > 0 && (
                        <ul
                          aria-label="ANU programme search results"
                          className="p-1"
                        >
                          {results.map((programme) => {
                            const isSelected = selectedCodes.has(
                              programme.code,
                            );
                            return (
                              <li key={programme.code}>
                                <button
                                  type="button"
                                  disabled={isSelected}
                                  onClick={() => addProgramme(programme)}
                                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none disabled:cursor-default disabled:opacity-55"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-zinc-900">
                                      {programme.name}
                                    </span>
                                    <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                                      {programme.code}
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
                  Every ANU programme published in {year}
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

            {target === "selected" && selectedProgrammes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  Selected programmes ({selectedProgrammes.length})
                </p>
                <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
                  {selectedProgrammes.map((programme) => (
                    <li
                      key={programme.code}
                      className="flex min-h-12 items-center gap-3 px-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900">
                          {programme.name}
                        </span>
                        <span className="font-mono text-xs text-zinc-500">
                          {programme.code}
                        </span>
                      </span>
                      <a
                        href={programmeSourceUrl(year, programme.code)}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden items-center gap-1 text-xs font-medium text-brand-700 hover:underline sm:inline-flex"
                      >
                        Source <ExternalLink size={13} />
                      </a>
                      <IconButton
                        label={`Remove ${programme.code}`}
                        onClick={() => removeProgramme(programme.code)}
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
                  Programmes
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Requirements, study options and elective rules.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Courses</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Compulsory, elective and prerequisite course pages.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                disabled={!canPreview}
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
