"use client";

import { useState, type ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export type OptionMenuItem<T extends string> = {
  value: T;
  /** Plain text, used for matching the search box and as the accessible name. */
  label: string;
  icon?: ReactNode;
  /** Replaces the label's appearance only; searching still uses the label. */
  render?: ReactNode;
};

/**
 * The single list body every popover menu in the admin surfaces uses, so a
 * filter, a value and an ordering all read the same: one row per option, the
 * current one filled rather than only ticked. Pass searchPlaceholder for
 * lists long enough to need narrowing.
 *
 * Render it inside a PopoverContent with `p-1.5`.
 */
export function OptionMenu<T extends string>({
  emptyLabel = "Nothing matches.",
  items,
  onSelect,
  searchPlaceholder,
  value,
}: {
  emptyLabel?: string;
  items: OptionMenuItem<T>[];
  onSelect: (value: T) => void;
  searchPlaceholder?: string;
  value: T | null;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? items.filter((item) => item.label.toLowerCase().includes(needle))
    : items;

  return (
    <div className="flex min-w-0 flex-col">
      {searchPlaceholder ? (
        <div className="flex items-center gap-2 border-b border-zinc-100 px-2 pb-1.5">
          <Search
            aria-hidden="true"
            className="shrink-0 text-zinc-400"
            size={14}
          />
          <input
            autoFocus
            className="h-8 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            type="search"
            value={query}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex max-h-64 flex-col overflow-y-auto overscroll-contain",
          searchPlaceholder && "pt-1.5",
        )}
      >
        {visible.length === 0 ? (
          <p className="px-2.5 py-3 text-sm text-zinc-500">{emptyLabel}</p>
        ) : (
          visible.map((item) => {
            const selected = item.value === value;
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "flex h-9 w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  selected
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
                )}
                key={item.value}
                onClick={() => onSelect(item.value)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {item.icon ? (
                    <span className="shrink-0 text-zinc-400">{item.icon}</span>
                  ) : null}
                  <span className="min-w-0 truncate">
                    {item.render ?? item.label}
                  </span>
                </span>
                {selected ? (
                  <Check
                    aria-hidden="true"
                    className="shrink-0"
                    size={14}
                    strokeWidth={2.5}
                  />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
