"use client";

import { OptionPicker } from "@/components/ui/option-picker";

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
  /** Offers an "all years" option after the individual years. */
  allowAll?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onChange: (year: YearSelection) => void;
  value: YearSelection;
  years: number[];
}) {
  const ordered = [...new Set(years)].sort((left, right) => left - right);
  return (
    <OptionPicker
      aria-label={ariaLabel}
      disabled={disabled}
      searchable={false}
      value={String(value)}
      items={[
        ...ordered.map((year) => ({
          value: String(year),
          label: String(year),
        })),
        ...(allowAll ? [{ value: "all", label: allLabel }] : []),
      ]}
      onValueChange={(next) => onChange(next === "all" ? "all" : Number(next))}
    />
  );
}
