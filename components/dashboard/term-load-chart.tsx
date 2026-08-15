import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { TermUnits } from "@/lib/dashboard-series";
import { STANDARD_TERM_UNITS } from "@/lib/planner";

export function TermLoadChart({
  terms,
  currentTermId,
}: {
  terms: TermUnits[];
  currentTermId?: string;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Semester load</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          A full bar is the standard {STANDARD_TERM_UNITS} unit load
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {terms.map((term) => {
          const overloaded = term.units > STANDARD_TERM_UNITS;
          const current = term.id === currentTermId;
          return (
            <li
              key={term.id}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] items-center gap-3"
            >
              <span
                className={cn(
                  "text-[11px] font-medium",
                  current ? "text-zinc-900" : "text-zinc-500",
                )}
              >
                {term.label}
              </span>
              <span
                aria-hidden="true"
                className="flex h-2 overflow-hidden rounded-full bg-zinc-100"
              >
                <span
                  className={cn(
                    "rounded-full",
                    overloaded && "bg-amber-500",
                    !overloaded && current && "bg-brand-600",
                    !overloaded && !current && "bg-brand-400",
                  )}
                  style={{
                    width: `${Math.min(100, (term.units / STANDARD_TERM_UNITS) * 100)}%`,
                  }}
                />
              </span>
              <span className="text-right text-[11px] text-zinc-600 tabular-nums">
                {term.units}u
              </span>
            </li>
          );
        })}
      </ul>
      {terms.some((term) => term.units > STANDARD_TERM_UNITS) && (
        <p className="mt-auto pt-4 text-[11px] text-amber-700">
          Amber marks a study period above the standard load.
        </p>
      )}
    </Card>
  );
}
