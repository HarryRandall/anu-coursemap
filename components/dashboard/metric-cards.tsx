import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type MetricBar = {
  key: string;
  caption: string;
  value: number;
  planned?: number;
  muted?: boolean;
};

export type Metric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  bars: MetricBar[];
  /** Floor for the bar scale, so a part-filled card still reads in context. */
  max?: number;
  emptyLabel?: string;
};

function scaleFor(metric: Metric) {
  return Math.max(
    metric.max ?? 0,
    ...metric.bars.map((bar) => bar.value + (bar.planned ?? 0)),
    1,
  );
}

export function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const scale = scaleFor(metric);
        return (
          <Card key={metric.id} className="flex h-40 flex-col p-4">
            <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
              {metric.label}
            </p>
            <p className="mt-1.5 text-[1.75rem] leading-none font-bold tracking-tight text-zinc-900 tabular-nums">
              {metric.value}
            </p>
            <p className="mt-1.5 text-[11px] text-zinc-500">{metric.hint}</p>
            {metric.bars.length === 0 ? (
              <p className="mt-auto text-[11px] text-zinc-400">
                {metric.emptyLabel ?? "Nothing recorded yet"}
              </p>
            ) : (
              <div
                role="group"
                aria-label={`${metric.label} by study period`}
                className="mt-auto flex h-10 items-end gap-1"
              >
                {metric.bars.map((bar) => (
                  <div
                    key={bar.key}
                    className="group relative flex h-full max-w-10 flex-1"
                  >
                    <span className="sr-only">{bar.caption}</span>
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full flex-col justify-end overflow-hidden rounded-[3px] bg-zinc-100 transition group-hover:bg-zinc-200"
                    >
                      {bar.planned ? (
                        <span
                          className="w-full bg-brand-200"
                          style={{ height: `${(bar.planned / scale) * 100}%` }}
                        />
                      ) : null}
                      <span
                        className={cn(
                          "w-full",
                          bar.muted ? "bg-brand-200" : "bg-brand-500",
                        )}
                        style={{ height: `${(bar.value / scale) * 100}%` }}
                      />
                    </span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white shadow-md group-hover:block"
                    >
                      {bar.caption}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
