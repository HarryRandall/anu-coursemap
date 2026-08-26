"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function ImportWizardSteps({
  current,
  labels,
  onSelect,
}: {
  current: number;
  labels: string[];
  onSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Import steps">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        {labels.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li className="flex min-w-0 flex-1 items-center gap-3" key={label}>
              <button
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:cursor-default",
                  active && "border-brand-500 bg-brand-50/60 text-zinc-950",
                  done &&
                    "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
                  !active && !done && "border-zinc-200 bg-white text-zinc-400",
                )}
                disabled={index > current}
                onClick={() => onSelect(index)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    active && "bg-brand-600 text-white",
                    done && "bg-emerald-600 text-white",
                    !active && !done && "bg-zinc-100 text-zinc-500",
                  )}
                >
                  {done ? (
                    <Check aria-hidden="true" size={13} strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate font-medium">{label}</span>
                <span className="sr-only">
                  {done
                    ? " (completed)"
                    : active
                      ? " (current step)"
                      : " (not yet available)"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
