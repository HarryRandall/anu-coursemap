"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type FilterConfig = {
  key: string;
  label: string;
  /** Label for the unset option. Defaults to "All <label>". */
  allLabel?: string;
  options: Array<{ value: string; label: string }>;
};

/**
 * Search plus filtering, bound to the URL so a narrowed view can be shared.
 * The filter menu drills from field to value in one popover, and a filter
 * only becomes a chip once it has a value, so nothing half-set is left on
 * screen.
 */
export function FilterBar({
  searchPlaceholder,
  filters = [],
}: {
  searchPlaceholder: string;
  filters?: FilterConfig[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [field, setField] = useState<FilterConfig | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsRef = useRef(searchParams.toString());

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(paramsRef.current);
    const currentQuery = query.trim();
    if (currentQuery) params.set("q", currentQuery);
    else params.delete("q");
    mutate(params);
    params.delete("page");
    const next = params.toString();
    paramsRef.current = next;
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  };

  const update = (key: string, value: string) => {
    replaceParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  };

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  useEffect(() => {
    paramsRef.current = searchParams.toString();
  }, [searchParams]);

  const active = filters.flatMap((filter) => {
    const value = searchParams.get(filter.key);
    if (!value) return [];
    const option = filter.options.find((item) => item.value === value);
    return [{ filter, label: option?.label ?? value, value }];
  });

  function openMenu(open: boolean) {
    setMenuOpen(open);
    if (!open) setField(null);
  }

  return (
    <div aria-busy={isPending} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search</span>
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            className="h-10 pl-9"
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (timeout.current) clearTimeout(timeout.current);
              timeout.current = setTimeout(() => update("q", value), 250);
            }}
          />
        </label>
        {filters.length > 0 ? (
          <Popover onOpenChange={openMenu} open={menuOpen}>
            <PopoverTrigger asChild>
              <Button
                className="h-10 shrink-0 px-3.5"
                size="md"
                variant="secondary"
              >
                <ListFilter size={16} aria-hidden="true" />
                Filter
                {active.length > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                    {active.length}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-0">
              {field ? (
                <Command label={field.label}>
                  <div className="flex items-center gap-1 border-b border-zinc-100 px-1.5 py-1.5">
                    <button
                      className="grid size-6 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                      onClick={() => setField(null)}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" size={14} />
                      <span className="sr-only">Back to all filters</span>
                    </button>
                    <span className="text-xs font-medium text-zinc-700">
                      {field.label}
                    </span>
                  </div>
                  <CommandInput
                    placeholder={`Search ${field.label.toLowerCase()}...`}
                  />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No values match.</CommandEmpty>
                    <CommandGroup>
                      {[
                        {
                          value: "",
                          label:
                            field.allLabel ??
                            `All ${field.label.toLowerCase()}`,
                        },
                        ...field.options,
                      ].map((option) => {
                        const selected =
                          (searchParams.get(field.key) ?? "") === option.value;
                        return (
                          <CommandItem
                            key={option.value || "__all"}
                            onSelect={() => {
                              update(field.key, option.value);
                              openMenu(false);
                            }}
                            value={option.label}
                          >
                            <Check
                              aria-hidden="true"
                              className={
                                selected ? "text-zinc-900" : "text-transparent"
                              }
                              size={14}
                            />
                            {option.label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              ) : (
                <Command label="Choose a filter">
                  <CommandInput placeholder="Filter..." />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No filters match.</CommandEmpty>
                    <CommandGroup>
                      {filters.map((filter) => (
                        <CommandItem
                          key={filter.key}
                          onSelect={() => setField(filter)}
                          value={filter.label}
                        >
                          <ListFilter
                            aria-hidden="true"
                            className="text-zinc-400"
                            size={14}
                          />
                          {filter.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              )}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map(({ filter, label }) => (
            <span
              className="inline-flex items-center overflow-hidden rounded-md border border-zinc-200 bg-white text-xs shadow-xs"
              key={filter.key}
            >
              <span className="py-1.5 pr-1.5 pl-2.5 text-zinc-500">
                {filter.label}
              </span>
              <span className="py-1.5 font-medium text-zinc-900">{label}</span>
              <button
                aria-label={`Remove the ${filter.label} filter`}
                className="ml-1.5 grid h-full place-items-center border-l border-zinc-200 px-1.5 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                onClick={() => update(filter.key, "")}
                type="button"
              >
                <X aria-hidden="true" size={12} />
              </button>
            </span>
          ))}
          {active.length > 1 ? (
            <button
              className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
              onClick={() =>
                replaceParams((params) => {
                  filters.forEach((filter) => params.delete(filter.key));
                })
              }
              type="button"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
