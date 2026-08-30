"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Academic year chooser. Years are dense and ordered, so a grid shows every
 * option at once instead of the tall scrolling list a generic select produces
 * for the same data.
 */
export type YearSelection = number | "all";

export function YearPicker({
  allLabel = "All",
  allowAll = false,
  ariaLabel = "Academic year",
  disabled = false,
  onChange,
  value,
  years,
}: {
  allLabel?: string;
  /** Offers an "all years" cell after the individual years. */
  allowAll?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onChange: (year: YearSelection) => void;
  value: YearSelection;
  years: number[];
}) {
  const [open, setOpen] = useState(false);
  const ordered = [...new Set(years)].sort((left, right) => left - right);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-label={ariaLabel}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white pr-2 pl-3 text-sm font-medium text-zinc-950 shadow-xs transition-colors outline-none hover:border-zinc-300 hover:bg-zinc-50 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-brand-500 data-[state=open]:ring-3 data-[state=open]:ring-brand-500/20"
          disabled={disabled}
          type="button"
        >
          <span className="tabular-nums">
            {value === "all" ? allLabel : value}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="text-zinc-400 transition-transform duration-150 data-[open=true]:rotate-180"
            data-open={open}
            size={15}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-1.5">
        <div className="grid grid-cols-3 gap-1">
          {ordered.map((year) => {
            const selected = year === value;
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "h-9 w-16 cursor-pointer rounded-md text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  selected
                    ? "bg-brand-600 font-semibold text-white hover:bg-brand-700"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
                )}
                key={year}
                onClick={() => {
                  setOpen(false);
                  if (year !== value) onChange(year);
                }}
                type="button"
              >
                {year}
              </button>
            );
          })}
          {allowAll ? (
            <button
              aria-pressed={value === "all"}
              className={cn(
                "h-9 w-16 cursor-pointer rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                value === "all"
                  ? "bg-brand-600 font-semibold text-white hover:bg-brand-700"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
              )}
              onClick={() => {
                setOpen(false);
                if (value !== "all") onChange("all");
              }}
              type="button"
            >
              {allLabel}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
