"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ListFilter, Search, X } from "lucide-react";
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
import { cn } from "@/lib/cn";

export type FilterConfig = {
  key: string;
  label: string;
  /** Label for the unset option. Defaults to "All <label>". */
  allLabel?: string;
  options: Array<{ value: string; label: string }>;
};

/**
 * Search plus filtering, bound to the URL so a narrowed view can be shared.
 * Filters are chosen from a searchable field list and then read back as
 * removable chips, which keeps the active state legible at a glance.
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
  const [openField, setOpenField] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
          <Popover onOpenChange={setPickerOpen} open={pickerOpen}>
            <PopoverTrigger asChild>
              <Button className="h-10" size="md" variant="secondary">
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
              <Command label="Choose a filter">
                <CommandInput placeholder="Filter..." />
                <CommandList className="max-h-72">
                  <CommandEmpty>No filters match.</CommandEmpty>
                  <CommandGroup>
                    {filters.map((filter) => (
                      <CommandItem
                        key={filter.key}
                        onSelect={() => {
                          setPickerOpen(false);
                          setOpenField(filter.key);
                        }}
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
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {(active.length > 0 || openField) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => {
            const current = active.find(
              (entry) => entry.filter.key === filter.key,
            );
            if (!current && openField !== filter.key) return null;
            return (
              <Popover
                key={filter.key}
                onOpenChange={(open) =>
                  setOpenField(
                    open
                      ? filter.key
                      : (value) => (value === filter.key ? null : value),
                  )
                }
                open={openField === filter.key}
              >
                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-white text-xs shadow-xs">
                  <span className="px-2.5 py-1.5 font-medium text-zinc-700">
                    {filter.label}
                  </span>
                  <span className="border-x border-zinc-200 px-2 py-1.5 text-zinc-400">
                    is
                  </span>
                  <PopoverTrigger asChild>
                    <button
                      className="px-2.5 py-1.5 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                      type="button"
                    >
                      {current?.label ?? "any"}
                    </button>
                  </PopoverTrigger>
                  <button
                    aria-label={`Remove the ${filter.label} filter`}
                    className="border-l border-zinc-200 px-2 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                    onClick={() => {
                      setOpenField(null);
                      update(filter.key, "");
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" size={12} />
                  </button>
                </span>
                <PopoverContent align="start" className="w-56 p-0">
                  <Command label={filter.label}>
                    <CommandInput
                      placeholder={`Search ${filter.label.toLowerCase()}...`}
                    />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No values match.</CommandEmpty>
                      <CommandGroup>
                        {[
                          {
                            value: "",
                            label:
                              filter.allLabel ??
                              `All ${filter.label.toLowerCase()}`,
                          },
                          ...filter.options,
                        ].map((option) => (
                          <CommandItem
                            key={option.value || "__all"}
                            onSelect={() => {
                              setOpenField(null);
                              update(filter.key, option.value);
                            }}
                            value={option.label}
                          >
                            <Check
                              aria-hidden="true"
                              className={cn(
                                "text-zinc-900",
                                (current?.value ?? "") === option.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                              size={14}
                            />
                            {option.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            );
          })}
          {active.length > 0 ? (
            <Button
              onClick={() =>
                replaceParams((params) => {
                  filters.forEach((filter) => params.delete(filter.key));
                })
              }
              size="sm"
              variant="ghost"
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
