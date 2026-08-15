import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { DegreeUnitProgress } from "@/lib/planner";

export function DegreeCharts({
  progress,
  years,
}: {
  progress: DegreeUnitProgress;
  years: Array<{
    year: number;
    completed: number;
    planned: number;
    total: number;
  }>;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const completedLength = (progress.completed / progress.total) * circumference;
  const plannedLength = (progress.planned / progress.total) * circumference;
  const maxYear = Math.max(48, ...years.map((item) => item.total));

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Progress"
        description={`${progress.percent}% of units completed`}
      />
      <div className="grid gap-6 border-t border-zinc-100 px-5 py-5">
        <div className="flex items-center gap-5">
          <div className="relative size-28 shrink-0">
            <svg
              viewBox="0 0 108 108"
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="54"
                cy="54"
                r={radius}
                fill="none"
                className="stroke-zinc-100"
                strokeWidth="12"
              />
              <circle
                cx="54"
                cy="54"
                r={radius}
                fill="none"
                className="stroke-brand-600"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${completedLength} ${circumference}`}
              />
              <circle
                cx="54"
                cy="54"
                r={radius}
                fill="none"
                className="stroke-brand-300"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${plannedLength} ${circumference}`}
                strokeDashoffset={-completedLength}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <p className="text-xl font-bold tracking-tight text-zinc-900 tabular-nums">
                {progress.percent}
                <span className="text-sm font-semibold text-zinc-400">%</span>
              </p>
            </div>
          </div>
          <dl className="min-w-0 flex-1 space-y-2">
            {[
              ["Completed", progress.completed, "bg-brand-600"],
              ["Planned", progress.planned, "bg-brand-300"],
              ["Remaining", progress.remaining, "bg-zinc-200"],
            ].map(([label, value, dot]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3"
              >
                <dt className="flex items-center gap-2 text-[12px] text-zinc-500">
                  <span
                    className={cn("size-2 rounded-full", dot)}
                    aria-hidden="true"
                  />
                  {label}
                </dt>
                <dd className="text-[12px] font-semibold text-zinc-800 tabular-nums">
                  {value}u
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3 className="text-[12px] font-semibold text-zinc-800">
            Units by year
          </h3>
          <ul className="mt-3 space-y-2.5">
            {years.map((item, index) => (
              <li key={item.year}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <p className="text-[11px] font-medium text-zinc-500">
                    Year {index + 1}
                    <span className="ml-1.5 text-zinc-400">{item.year}</span>
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-700 tabular-nums">
                    {item.total}u
                  </p>
                </div>
                <div
                  className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100"
                  aria-label={`${item.year}: ${item.completed} completed and ${item.planned} planned units`}
                >
                  <span
                    className="bg-brand-600"
                    style={{ width: `${(item.completed / maxYear) * 100}%` }}
                  />
                  <span
                    className="bg-brand-300"
                    style={{ width: `${(item.planned / maxYear) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
