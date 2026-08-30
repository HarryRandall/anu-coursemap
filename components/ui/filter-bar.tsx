"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Funnel, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { encodeNegatableValue, parseNegatableValue } from "@/lib/filter-params";
import { OptionMenu } from "@/components/ui/option-menu";
import { Tooltip } from "@/components/ui/tooltip";
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
  /**
   * Offer "is not" as well as "is". Only set this where the reader of the
   * parameter understands the leading "!", or the view silently empties.
   */
  negatable?: boolean;
  options: Array<{ value: string; label: string }>;
};

type ControlledFilterState = {
  query: string;
  values: Record<string, string>;
  onQueryChange: (query: string) => void;
  onFilterChange: (key: string, value: string) => void;
};

type ChipPart = "operator" | "value";

/**
 * Search plus filtering, bound to the URL so a narrowed view can be shared.
 * The filter menu drills from field to value in one popover, and a filter
 * only becomes a chip once it has a value, so nothing half-set is left on
 * screen. Each chip stays editable in place: its condition and its value are
 * both menus, which keeps a correction one click away rather than a delete
 * and a re-add.
 */
export function FilterBar({
  searchPlaceholder,
  filters = [],
  state,
}: {
  searchPlaceholder: string;
  filters?: FilterConfig[];
  /** Keeps small, already-loaded datasets synchronous and client-filtered. */
  state?: ControlledFilterState;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localQuery, setLocalQuery] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [field, setField] = useState<FilterConfig | null>(null);
  const [openChip, setOpenChip] = useState<{
    key: string;
    part: ChipPart;
  } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsRef = useRef(searchParams.toString());
  const query = state?.query ?? localQuery;

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
    if (state) {
      state.onFilterChange(key, value);
      return;
    }
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

  const rawValue = (filter: FilterConfig) =>
    state?.values[filter.key] ?? searchParams.get(filter.key) ?? "";

  const active = filters.flatMap((filter) => {
    const raw = rawValue(filter);
    if (!raw) return [];
    const { value, negated } = parseNegatableValue(raw);
    const option = filter.options.find((item) => item.value === value);
    return [{ filter, label: option?.label ?? value, value, negated }];
  });

  function openMenu(open: boolean) {
    setMenuOpen(open);
    if (!open) setField(null);
  }

  function clearFilters() {
    if (state) {
      filters.forEach((filter) => state.onFilterChange(filter.key, ""));
      return;
    }
    replaceParams((params) => {
      filters.forEach((filter) => params.delete(filter.key));
    });
  }

  function chipOpen(key: string, part: ChipPart) {
    return openChip?.key === key && openChip.part === part;
  }

  return (
    <div aria-busy={!state && isPending} className="flex flex-col gap-2">
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
              if (state) {
                state.onQueryChange(value);
                return;
              }
              setLocalQuery(value);
              if (timeout.current) clearTimeout(timeout.current);
              timeout.current = setTimeout(() => update("q", value), 250);
            }}
          />
        </label>
        {filters.length > 0 ? (
          <Popover onOpenChange={openMenu} open={menuOpen}>
            <Tooltip
              content={
                active.length > 0
                  ? `${active.length} filter${active.length === 1 ? "" : "s"} applied`
                  : "Filter"
              }
            >
              <PopoverTrigger asChild>
                <Button
                  aria-label={
                    active.length > 0
                      ? `Filter (${active.length} active)`
                      : "Filter"
                  }
                  aria-pressed={active.length > 0}
                  className="size-10 shrink-0"
                  size="icon"
                  variant={active.length > 0 ? "subtle" : "secondary"}
                >
                  {/* A solid funnel reads as "filtering" at a glance; the
                    outline is the resting state. */}
                  <Funnel
                    aria-hidden="true"
                    fill={active.length > 0 ? "currentColor" : "none"}
                    size={16}
                  />
                </Button>
              </PopoverTrigger>
            </Tooltip>
            <PopoverContent align="end" className="w-56 p-1.5">
              {field ? (
                <OptionMenu
                  emptyLabel="No values match."
                  items={[
                    {
                      value: "",
                      label:
                        field.allLabel ?? `All ${field.label.toLowerCase()}`,
                    },
                    ...field.options,
                  ]}
                  onSelect={(option) => {
                    update(field.key, option);
                    openMenu(false);
                  }}
                  searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
                  value={parseNegatableValue(rawValue(field)).value}
                />
              ) : (
                <OptionMenu
                  emptyLabel="No filters match."
                  items={filters.map((filter) => ({
                    value: filter.key,
                    label: filter.label,
                    icon: <ListFilter aria-hidden="true" size={14} />,
                  }))}
                  onSelect={(key) =>
                    setField(
                      filters.find((filter) => filter.key === key) ?? null,
                    )
                  }
                  searchPlaceholder="Search filters..."
                  value={null}
                />
              )}
              {active.length > 0 && !field ? (
                <div className="mt-1.5 border-t border-zinc-100 pt-1.5">
                  <button
                    className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm text-zinc-600 transition-colors outline-none hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-400"
                    onClick={() => {
                      clearFilters();
                      openMenu(false);
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" size={14} />
                    Clear {active.length > 1 ? "all filters" : "filter"}
                  </button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      {active.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map(({ filter, label, value, negated }) => (
            <span
              className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-zinc-200 bg-white text-xs shadow-xs"
              key={filter.key}
            >
              <span className="px-2.5 font-medium text-zinc-500">
                {filter.label}
              </span>
              <span aria-hidden="true" className="h-full w-px bg-zinc-200" />

              {filter.negatable ? (
                <Popover
                  onOpenChange={(open) =>
                    setOpenChip(
                      open ? { key: filter.key, part: "operator" } : null,
                    )
                  }
                  open={chipOpen(filter.key, "operator")}
                >
                  <PopoverTrigger asChild>
                    <button
                      aria-label={`Change the ${filter.label} condition`}
                      className="inline-flex h-full cursor-pointer items-center gap-1 px-2 text-zinc-600 transition-colors outline-none hover:bg-zinc-50 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 data-[state=open]:bg-zinc-100"
                      type="button"
                    >
                      {negated ? "is not" : "is"}
                      <ChevronDown
                        aria-hidden="true"
                        className="text-zinc-400"
                        size={12}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-36 p-1.5">
                    <OptionMenu
                      items={[
                        { value: "is", label: "is" },
                        { value: "not", label: "is not" },
                      ]}
                      onSelect={(operator) => {
                        setOpenChip(null);
                        update(
                          filter.key,
                          encodeNegatableValue(value, operator === "not"),
                        );
                      }}
                      value={negated ? "not" : "is"}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <span className="px-2 text-zinc-500">is</span>
              )}

              <span aria-hidden="true" className="h-full w-px bg-zinc-200" />

              <Popover
                onOpenChange={(open) =>
                  setOpenChip(open ? { key: filter.key, part: "value" } : null)
                }
                open={chipOpen(filter.key, "value")}
              >
                <PopoverTrigger asChild>
                  <button
                    aria-label={`Change the ${filter.label} value`}
                    className="inline-flex h-full cursor-pointer items-center gap-1 px-2 font-medium text-zinc-900 transition-colors outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-400 data-[state=open]:bg-zinc-100"
                    type="button"
                  >
                    {label}
                    <ChevronDown
                      aria-hidden="true"
                      className="text-zinc-400"
                      size={12}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1.5">
                  <OptionMenu
                    emptyLabel="No values match."
                    items={filter.options}
                    onSelect={(option) => {
                      setOpenChip(null);
                      update(filter.key, encodeNegatableValue(option, negated));
                    }}
                    searchPlaceholder={`Search ${filter.label.toLowerCase()}...`}
                    value={value}
                  />
                </PopoverContent>
              </Popover>

              <span aria-hidden="true" className="h-full w-px bg-zinc-200" />
              <button
                aria-label={`Remove the ${filter.label} filter`}
                className="inline-grid h-full cursor-pointer place-items-center px-1.5 text-zinc-400 transition-colors outline-none hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-400"
                onClick={() => update(filter.key, "")}
                type="button"
              >
                <X aria-hidden="true" size={13} />
              </button>
            </span>
          ))}
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
            onClick={clearFilters}
            type="button"
          >
            <X aria-hidden="true" size={12} />
            Clear {active.length > 1 ? "all" : "filter"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
