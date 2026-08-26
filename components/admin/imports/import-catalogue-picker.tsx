"use client";

import {
  Check,
  CircleAlert,
  ExternalLink,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

export type CatalogueEntry = {
  code: string;
  name: string;
};

export type CataloguePickerKind = "courses" | "programmes";

type SearchState = "idle" | "loading" | "ready" | "error";

type RemoteSearch = {
  message: string;
  results: CatalogueEntry[];
  state: Exclude<SearchState, "loading">;
  term: string;
};

const copy = {
  courses: {
    endpoint: "/api/admin/catalogue/courses",
    empty: "No course pages match that search.",
    first: "Search for a course",
    more: "Add another course",
    placeholder: "Course code or title, such as FINM2001",
    heading: "ANU course pages",
    prompt: "Type a course code or title to search the ANU catalogue.",
    selected: "Selected courses",
    unavailable: "Course search unavailable",
    sourcePath: "course",
  },
  programmes: {
    endpoint: "/api/admin/catalogue/programmes",
    empty: "No programmes match that search.",
    first: "Search for a programme",
    more: "Add another programme",
    placeholder: "Programme code or name, such as BFINM",
    heading: "ANU programmes",
    prompt: "Type a programme code or name to search the ANU catalogue.",
    selected: "Selected programmes",
    unavailable: "Programme search unavailable",
    sourcePath: "program",
  },
} as const satisfies Record<CataloguePickerKind, Record<string, string>>;

export function ImportCataloguePicker({
  kind,
  limit,
  onChange,
  selected,
  year,
}: {
  kind: CataloguePickerKind;
  limit: number;
  onChange: (next: CatalogueEntry[]) => void;
  selected: CatalogueEntry[];
  year: number | null;
}) {
  const labels = copy[kind];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<RemoteSearch>({
    message: "",
    results: [],
    state: "idle",
    term: "",
  });
  const request = useRef(0);
  const selectedCodes = useMemo(
    () => new Set(selected.map((entry) => entry.code)),
    [selected],
  );
  const atLimit = selected.length >= limit;
  const term = query.trim();
  const idle = term === "" || year === null;
  // Derived so a keystroke never needs a synchronous setState in the effect.
  const state: SearchState = idle
    ? "idle"
    : remote.term === term
      ? remote.state
      : "loading";
  const results = !idle && remote.term === term ? remote.results : [];
  const message = remote.term === term ? remote.message : "";

  useEffect(() => {
    if (idle) return;
    request.current += 1;
    const id = request.current;

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${labels.endpoint}?q=${encodeURIComponent(term)}&year=${year}`,
        );
        const payload = (await response.json()) as {
          results?: CatalogueEntry[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Search failed.");
        if (request.current !== id) return;
        setRemote({
          message: "",
          results: payload.results ?? [],
          state: "ready",
          term,
        });
      } catch (error) {
        if (request.current !== id) return;
        setRemote({
          message:
            error instanceof Error ? error.message : "Search is unavailable.",
          results: [],
          state: "error",
          term,
        });
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [idle, labels.endpoint, term, year]);

  function add(entry: CatalogueEntry) {
    if (selectedCodes.has(entry.code) || atLimit) return;
    onChange([...selected, { code: entry.code, name: entry.name }]);
    setOpen(false);
    setQuery("");
  }

  function remove(code: string) {
    onChange(selected.filter((entry) => entry.code !== code));
  }

  return (
    <div className="space-y-4">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            className="justify-between"
            disabled={year === null || atLimit}
            fullWidth
          >
            <span className="inline-flex min-w-0 items-center gap-2 truncate">
              <Search aria-hidden="true" size={16} />
              {selected.length > 0 ? labels.more : labels.first}
            </span>
            <Plus aria-hidden="true" size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command label={labels.heading} loop shouldFilter={false}>
            <CommandInput
              autoFocus
              aria-label={labels.first}
              onValueChange={setQuery}
              placeholder={labels.placeholder}
              value={query}
            />
            <CommandList className="max-h-80" label={labels.heading}>
              {state === "idle" ? (
                <CommandEmpty>{labels.prompt}</CommandEmpty>
              ) : null}
              {state === "loading" ? (
                <div
                  aria-label="Searching the ANU catalogue"
                  className="space-y-1.5 p-1"
                  role="status"
                >
                  <span className="sr-only">Searching the ANU catalogue</span>
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
              {state === "error" ? (
                <Alert className="m-1 w-auto" role="alert" tone="danger">
                  <CircleAlert aria-hidden="true" />
                  <AlertTitle>{labels.unavailable}</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}
              {state === "ready" && results.length === 0 ? (
                <CommandEmpty>{labels.empty}</CommandEmpty>
              ) : null}
              {state === "ready" && results.length > 0 ? (
                <CommandGroup heading={labels.heading}>
                  {results.map((entry) => {
                    const isSelected = selectedCodes.has(entry.code);
                    return (
                      <CommandItem
                        key={entry.code}
                        disabled={isSelected || atLimit}
                        onSelect={() => add(entry)}
                        value={`${entry.code} ${entry.name}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-900">
                            {entry.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                            {entry.code}
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

      {atLimit ? (
        <Alert role="status" tone="warning">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            This is the maximum of {limit} per run. Remove one to add another,
            or run this batch and start a second one.
          </AlertDescription>
        </Alert>
      ) : null}

      {selected.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-800">
            {labels.selected} ({selected.length})
          </h3>
          <DataList className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {selected.map((entry) => (
              <DataListItem key={entry.code} className="flex-row">
                <DataListContent>
                  <DataListTitle className="mt-0">{entry.name}</DataListTitle>
                  <DataListDescription className="font-mono">
                    {entry.code}
                  </DataListDescription>
                </DataListContent>
                <DataListActions className="flex-nowrap">
                  <a
                    href={`https://programsandcourses.anu.edu.au/${year ?? ""}/${labels.sourcePath}/${entry.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden items-center gap-1 text-xs font-medium text-brand-700 hover:underline sm:inline-flex"
                  >
                    ANU page
                    <ExternalLink size={13} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <IconButton
                    label={`Remove ${entry.code}`}
                    onClick={() => remove(entry.code)}
                  >
                    <X size={15} aria-hidden="true" />
                  </IconButton>
                </DataListActions>
              </DataListItem>
            ))}
          </DataList>
        </div>
      ) : null}
    </div>
  );
}
