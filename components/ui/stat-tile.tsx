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
        "rounded-lg border border-zinc-200/90 bg-white px-3.5 py-2.5 text-zinc-900 shadow-xs",
        className,
      )}
    >
      <div className="mb-0.5 text-[11px] font-medium text-zinc-500">
        {label}
      </div>
      <div className="text-lg font-semibold tracking-tight tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-zinc-500">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}
