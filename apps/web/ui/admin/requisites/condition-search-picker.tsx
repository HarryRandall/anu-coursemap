"use client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@coursemap/ui/primitives/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@coursemap/ui/primitives/popover";
import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  searchRequisiteCourses,
  searchRequisiteProgrammes,
  type RequisiteCourseSearchResult,
  type RequisiteProgrammeSearchResult,
} from "@/lib/coursemap/requisite-search-actions";

export async function searchCourses(query: string) {
  const results: RequisiteCourseSearchResult[] =
    await searchRequisiteCourses(query);
  return results.map((result) => ({
    code: result.code,
    title: result.title,
  }));
}
export async function searchProgrammes(query: string) {
  const results: RequisiteProgrammeSearchResult[] =
    await searchRequisiteProgrammes(query);
  return results.map((result) => ({
    code: result.code,
    title: result.title,
  }));
}
export function SearchPicker({
  className,
  empty,
  label,
  onOpenChange,
  onSearch,
  onSelect,
  open,
  value,
  valueTitle,
}: {
  className?: string;
  empty: string;
  label: string;
  onOpenChange?: (open: boolean) => void;
  onSearch: (
    query: string,
  ) => Promise<Array<{ code: string; title: string | null }>>;
  onSelect: (code: string, title: string | null) => void;
  open?: boolean;
  value: string;
  valueTitle?: string | null;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  function setIsOpen(next: boolean) {
    onOpenChange?.(next);
    if (open === undefined) setUncontrolledOpen(next);
  }
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ code: string; title: string | null }>
  >([]);
  const term = query.trim();
  const options =
    term.length < 2
      ? value
        ? [{ code: value, title: valueTitle ?? null }]
        : []
      : results;

  useEffect(() => {
    if (!isOpen) return;
    if (term.length < 2) return;
    const timeout = window.setTimeout(() => {
      void onSearch(term).then(setResults);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [onSearch, isOpen, term]);

  return (
    <Popover
      modal
      onOpenChange={(next) => {
        setIsOpen(next);
        if (next) {
          setQuery("");
          setResults([]);
        }
      }}
      open={isOpen}
    >
      <PopoverTrigger asChild>
        <button
          data-slot="search-picker-trigger"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
          className={cn(
            "cn-input",
            cn(
              "flex min-w-0 flex-1 cursor-pointer items-center justify-start text-left font-normal",
              className,
            ),
          )}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {value ? (
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 font-mono text-xs font-semibold text-foreground/80">
                {value}
              </span>
              {valueTitle ? (
                <span className="min-w-0 truncate text-[11px] font-normal text-muted-foreground">
                  {valueTitle}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="truncate text-muted-foreground/80">
              Choose {label.toLowerCase()}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className="ml-auto shrink-0 text-muted-foreground/80"
            size={15}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg p-1 shadow-xl md:w-[var(--radix-popover-trigger-width)]"
        sideOffset={4}
      >
        <Command label={label} shouldFilter={false}>
          <CommandInput
            className="h-9 text-xs"
            onValueChange={setQuery}
            placeholder="Search by code or title..."
            value={query}
          />
          <CommandList className="max-h-56 p-1">
            {term.length < 2 && !value ? (
              <p className="px-2.5 py-2.5 text-xs text-muted-foreground">
                Type a code or title.
              </p>
            ) : null}
            {term.length >= 2 ? (
              <CommandEmpty className="py-3 text-xs">{empty}</CommandEmpty>
            ) : null}
            <CommandGroup className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:gap-0.5">
              {options.map((result) => (
                <CommandItem
                  className="min-h-10 items-center gap-2 rounded-md px-2 py-1.5"
                  key={result.code}
                  onSelect={() => {
                    onSelect(result.code, result.title);
                    setIsOpen(false);
                  }}
                  value={`${result.code} ${result.title ?? ""}`}
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="shrink-0 font-mono text-xs font-semibold text-foreground/90">
                      {result.code}
                    </span>
                    {result.title ? (
                      <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                        {result.title}
                      </span>
                    ) : null}
                  </span>
                  {result.code === value ? (
                    <Check
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary"
                    />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
