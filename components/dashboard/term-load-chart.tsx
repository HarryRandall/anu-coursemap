import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { STANDARD_TERM_UNITS } from "@/lib/planner";

export function TermLoadChart({
  terms,
}: {
  terms: Array<{ id: string; label: string; units: number }>;
}) {
  const max = Math.max(STANDARD_TERM_UNITS, ...terms.map((term) => term.units));

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-900">Semester load</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          Standard load is {STANDARD_TERM_UNITS} units
        </p>
      </div>
      <div className="flex h-32 items-end gap-2">
        {terms.map((term) => {
          const height = (term.units / max) * 100;
          const overloaded = term.units > STANDARD_TERM_UNITS;
          return (
            <div
              key={term.id}
              title={`${term.label}: ${term.units} units`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <p className="text-[10px] font-semibold text-zinc-700 tabular-nums">
                {term.units}
              </p>
              <div className="flex h-20 w-full max-w-10 items-end">
                <span
                  className={cn(
                    "block w-full rounded-t-md",
                    overloaded ? "bg-amber-500" : "bg-brand-500",
                  )}
                  style={{
                    height: `${Math.max(height, term.units > 0 ? 8 : 0)}%`,
                  }}
                  aria-label={`${term.label}: ${term.units} units`}
                />
              </div>
              <p className="w-full truncate text-center text-[10px] font-medium text-zinc-400">
                {term.label}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
