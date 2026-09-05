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
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card pr-2 pl-3 text-sm font-medium text-foreground shadow-xs transition-colors outline-none hover:border-input hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-primary data-[state=open]:ring-3 data-[state=open]:ring-ring/20"
          disabled={disabled}
          type="button"
        >
          <span className="tabular-nums">
            {value === "all" ? allLabel : value}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="text-muted-foreground/80 transition-transform duration-150 data-[open=true]:rotate-180"
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
                  "h-9 w-16 cursor-pointer rounded-md text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                    : "text-foreground/80 hover:bg-accent hover:text-foreground",
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
                "h-9 w-16 cursor-pointer rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                value === "all"
                  ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                  : "text-foreground/80 hover:bg-accent hover:text-foreground",
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
