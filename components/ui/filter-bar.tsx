"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [isPending, startTransition] = useTransition();
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

  const activeFilterCount = filters.filter((filter) =>
    Boolean(searchParams.get(filter.key)),
  );

  return (
    <div className="flex flex-col gap-3" aria-busy={isPending}>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button size="md" variant="secondary" className="h-10">
                <ListFilter size={16} aria-hidden="true" />
                Filters
                {activeFilterCount.length > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 tabular-nums">
                    {activeFilterCount.length}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-950">Filter courses</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Narrow the published catalogue.
                  </p>
                </div>
                {activeFilterCount.length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      replaceParams((params) => {
                        filters.forEach((filter) => params.delete(filter.key));
                      })
                    }
                  >
                    <X size={14} aria-hidden="true" />
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className="space-y-4">
                {filters.map((filter) => (
                  <div key={filter.key} className="space-y-1.5">
                    <FieldLabel>{filter.label}</FieldLabel>
                    <Select
                      value={searchParams.get(filter.key) ?? ""}
                      onChange={(value) => update(filter.key, value)}
                      aria-label={filter.label}
                      options={[
                        {
                          value: "",
                          label: `All ${filter.label.toLowerCase()}`,
                        },
                        ...filter.options,
                      ]}
                    />
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}
