"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export type FilterConfig = {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

/** Coursemap adaptation of ShowCrafter's URL-bound search and filter bar. */
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterMenu = useRef<HTMLDivElement | null>(null);

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  };

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  useEffect(() => {
    if (!filterOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        filterMenu.current &&
        !filterMenu.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [filterOpen]);

  const hasActiveFilters = filters.some((filter) =>
    searchParams.has(filter.key),
  );

  return (
    <div
      ref={filterMenu}
      className="relative flex flex-col gap-3"
      aria-busy={isPending}
    >
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
            className="h-11 pl-9"
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (timeout.current) clearTimeout(timeout.current);
              timeout.current = setTimeout(() => update("q", value), 250);
            }}
          />
        </label>
        {filters.length > 0 ? (
          <Button
            size="md"
            variant="secondary"
            className="h-11"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <ListFilter size={16} aria-hidden="true" />
            Filter
            {hasActiveFilters ? (
              <span className="size-1.5 rounded-full bg-brand-600" />
            ) : null}
          </Button>
        ) : null}
      </div>

      {filterOpen ? (
        <div className="absolute top-13 right-0 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-3 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900">Filters</span>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setFilterOpen(false)}
              className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-3">
            {filters.map((filter) => (
              <label key={filter.key} className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-600">
                  {filter.label}
                </span>
                <Select
                  value={searchParams.get(filter.key) ?? ""}
                  onChange={(value) => update(filter.key, value)}
                  aria-label={filter.label}
                  options={[
                    { value: "", label: `All ${filter.label.toLowerCase()}` },
                    ...filter.options,
                  ]}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
