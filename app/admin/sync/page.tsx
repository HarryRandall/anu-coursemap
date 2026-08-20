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

type ImportTarget = "selected" | "all";

type ProgrammeSearchResult = {
  code: string;
  name: string;
  year: number;
  career: string | null;
  duration: number | null;
};

type SearchState = "idle" | "loading" | "ready" | "error";
type YearState = "loading" | "ready" | "error";

function programmeSourceUrl(year: number, code: string) {
  return `https://programsandcourses.anu.edu.au/${year}/program/${code}`;
}

export default function AdminSyncPage() {
  const [target, setTarget] = useState<ImportTarget>("selected");
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProgrammeSearchResult[]>([]);
  const [selectedProgrammes, setSelectedProgrammes] = useState<
    ProgrammeSearchResult[]
  >([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [yearState, setYearState] = useState<YearState>("loading");
  const searchRequest = useRef(0);
  const router = useRouter();

  const selectedCodes = useMemo(
    () => new Set(selectedProgrammes.map((programme) => programme.code)),
    [selectedProgrammes],
  );
  const canPreview =
    year !== null && (target === "all" || selectedProgrammes.length > 0);

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
    setSearchOpen(false);
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

  function setProgrammeSearchOpen(open: boolean) {
    setSearchOpen(open);
    if (open) return;
    searchRequest.current += 1;
    setQuery("");
    setResults([]);
    setSearchState("idle");
    setSearchMessage("");
  }

  function openPreview() {
    if (year === null) return;
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
        <nav
          aria-label="Sync type"
          className="flex gap-5 border-b border-zinc-200 text-sm font-medium"
        >
          <span className="-mb-px border-b-2 border-zinc-950 pb-3 text-zinc-950">
            Programmes
          </span>
          <Link
            href="/admin/sync/courses"
            className="-mb-px border-b-2 border-transparent pb-3 text-zinc-500 hover:text-zinc-900"
          >
            Course pages
          </Link>
        </nav>
        <h1 className="mt-7 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          Sync programmes
        </h1>

        <section className="mt-8 border-t border-zinc-200 pt-8">
          <div className="space-y-7">
            <RadioGroup
              aria-label="Programmes to sync"
              className="sm:grid-cols-2"
              onValueChange={(value) => {
                if (value === "selected" || value === "all") setTarget(value);
              }}
              value={target}
            >
              <RadioCard
                description="Add one or more programmes from ANU."
                title="Select programmes"
                value="selected"
              />
              <RadioCard
                description="Everything published for this year."
                title="All programmes"
                value="all"
              />
            </RadioGroup>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
              {target === "selected" ? (
                <div className="flex min-w-0 flex-col gap-1.5">
                  <FieldLabel>Find programmes</FieldLabel>
                  <Popover
                    open={searchOpen}
                    onOpenChange={setProgrammeSearchOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        className="justify-between"
                        disabled={year === null}
                        fullWidth
                      >
                        <span className="inline-flex min-w-0 items-center gap-2 truncate">
                          <Search aria-hidden="true" size={16} />
                          {selectedProgrammes.length > 0
                            ? "Add another programme"
                            : "Find programmes"}
                        </span>
                        <Plus aria-hidden="true" size={16} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                    >
                      <Command
                        label="ANU programme search"
                        loop
                        shouldFilter={false}
                      >
                        <CommandInput
                          autoFocus
                          aria-label="Find programmes"
                          onValueChange={searchProgrammes}
                          placeholder="Search ANU programmes"
                          value={query}
                        />
                        <CommandList
                          className="max-h-80"
                          label="Programme search results"
                        >
                          {searchState === "idle" ? (
                            <CommandEmpty>
                              Start typing to search ANU programmes.
                            </CommandEmpty>
                          ) : null}
                          {searchState === "loading" ? (
                            <div
                              aria-label="Searching ANU programmes"
                              className="space-y-2 p-2"
                              role="status"
                            >
                              <span className="sr-only">Searching ANU...</span>
                              <Skeleton className="h-11 w-full" />
                              <Skeleton className="h-11 w-full" />
                              <Skeleton className="h-11 w-4/5" />
                            </div>
                          ) : null}
                          {searchState === "error" ? (
                            <Alert
                              className="m-1 w-auto"
                              role="alert"
                              tone="danger"
                            >
                              <CircleAlert aria-hidden="true" />
                              <AlertTitle>
                                Programme search unavailable
                              </AlertTitle>
                              <AlertDescription>
                                {searchMessage}
                              </AlertDescription>
                            </Alert>
                          ) : null}
                          {searchState === "ready" && results.length === 0 ? (
                            <CommandEmpty>No programmes found.</CommandEmpty>
                          ) : null}
                          {searchState === "ready" && results.length > 0 ? (
                            <CommandGroup heading="Programmes">
                              {results.map((programme) => {
                                const isSelected = selectedCodes.has(
                                  programme.code,
                                );
                                return (
                                  <CommandItem
                                    key={programme.code}
                                    disabled={isSelected}
                                    onSelect={() => addProgramme(programme)}
                                    value={`${programme.code} ${programme.name}`}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-medium text-zinc-950">
                                        {programme.name}
                                      </span>
                                      <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                                        {programme.code}
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
                  <AlertTitle>All programmes</AlertTitle>
                  <AlertDescription>
                    Every ANU programme published in {year}
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

            {target === "selected" && selectedProgrammes.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-zinc-800">
                  Selected programmes ({selectedProgrammes.length})
                </h2>
                <DataList className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
                  {selectedProgrammes.map((programme) => (
                    <DataListItem
                      key={programme.code}
                      className="min-h-12 flex-row items-center gap-3 px-3 py-2.5"
                    >
                      <DataListContent>
                        <DataListTitle className="mt-0">
                          {programme.name}
                        </DataListTitle>
                        <DataListDescription className="font-mono">
                          {programme.code}
                        </DataListDescription>
                      </DataListContent>
                      <DataListActions>
                        <a
                          href={programmeSourceUrl(year ?? 0, programme.code)}
                          target="_blank"
                          rel="noreferrer"
                          className="hidden items-center gap-1 text-xs font-medium text-brand-700 hover:underline sm:inline-flex"
                        >
                          Source <ExternalLink aria-hidden="true" size={13} />
                        </a>
                        <IconButton
                          label={`Remove ${programme.code}`}
                          onClick={() => removeProgramme(programme.code)}
                        >
                          <X aria-hidden="true" size={15} />
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
