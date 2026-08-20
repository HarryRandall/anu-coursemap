import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Adapted from ShowCrafter's compact dashboard stat tile. */
export function StatTile({
  label,
  value,
  unit,
  icon,
  description,
  action,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200/80 bg-white px-3.5 py-3 text-zinc-950 shadow-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-medium text-zinc-500">
            {label}
          </div>
          <div className="text-xl font-semibold tracking-tight tabular-nums">
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-normal text-zinc-500">
                {unit}
              </span>
            ) : null}
          </div>
        </div>
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-brand-100 bg-brand-50 text-brand-700 [&>svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
