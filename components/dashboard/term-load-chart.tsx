import { Card } from "@/components/ui/card";
import type { DashboardTermPoint } from "@/lib/coursemap/dashboard-series";
import { cn } from "@/lib/cn";
import { STANDARD_TERM_UNITS } from "@/lib/planner";

export function TermLoadChart({
  terms,
  currentTermId,
}: {
  terms: readonly DashboardTermPoint[];
  currentTermId?: string;
}) {
  const yMax = Math.max(
    STANDARD_TERM_UNITS * 1.25,
    ...terms.map((term) => term.units * 1.1),
  );
  const standardPct = (STANDARD_TERM_UNITS / yMax) * 100;

  return (
    <Card className="flex min-h-72 flex-col p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Semester load</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          Dashed line marks the standard {STANDARD_TERM_UNITS}u load
        </p>
      </div>
      {terms.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Add courses to see your semester load.
        </p>
      ) : (
        <>
          <div className="relative mt-4 flex-1">
            <div
              aria-hidden="true"
              className="absolute right-0 left-0 border-t border-dashed border-zinc-300"
              style={{ bottom: `${standardPct}%` }}
            >
              <span className="absolute -top-2 right-0 bg-white pl-1 text-[9px] font-medium text-zinc-400">
                {STANDARD_TERM_UNITS}u
              </span>
            </div>
            <div className="flex h-full min-h-32 items-end gap-2">
              {terms.map((term) => {
                const overloaded = term.units > STANDARD_TERM_UNITS;
                const current = term.id === currentTermId;
                return (
                  <div
                    key={term.id}
                    title={`${term.label}: ${term.units} units`}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  >
                    <p className="text-[10px] font-semibold text-zinc-600 tabular-nums">
                      {term.units}
                    </p>
                    <span
                      className={cn(
                        "w-full max-w-8 rounded-t-md",
                        overloaded && "bg-amber-500",
                        !overloaded && current && "bg-brand-600",
                        !overloaded && !current && "bg-brand-300",
                      )}
                      style={{
                        height: `${Math.max((term.units / yMax) * 100, term.units > 0 ? 4 : 0)}%`,
                      }}
                      aria-label={`${term.label}: ${term.units} units`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-1 flex gap-2">
            {terms.map((term) => (
              <p
                key={term.id}
                className={cn(
                  "min-w-0 flex-1 truncate text-center text-[10px] font-medium",
                  term.id === currentTermId ? "text-zinc-700" : "text-zinc-400",
                )}
              >
                {term.label}
              </p>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
