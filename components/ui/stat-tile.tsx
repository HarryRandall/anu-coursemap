import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Adapted from ShowCrafter's compact dashboard stat tile. */
export function StatTile({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900",
        className,
      )}
    >
      <div className="mb-1 text-xs font-medium text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}
