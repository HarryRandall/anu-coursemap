"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { AreaChart } from "@/components/dashboard/area-chart";
import { cn } from "@/lib/cn";
import type { SeriesPoint } from "@/lib/dashboard-series";

export type Metric = {
  id: string;
  label: string;
  value: string;
  hint: string;
  points: SeriesPoint[];
  format: (value: number) => string;
};

export function MetricsPanel({ metrics }: { metrics: Metric[] }) {
  if (metrics.length === 0) return null;

  return (
    <TabsPrimitive.Root defaultValue={metrics[0].id}>
      <TabsPrimitive.List className="grid grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <TabsPrimitive.Trigger
            key={metric.id}
            value={metric.id}
            className={cn(
              "group min-h-[5.5rem] border-b border-zinc-100 px-5 py-4 text-left transition hover:bg-zinc-50",
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400",
              "data-[state=active]:bg-zinc-50",
              index % 2 === 0 && "border-r border-zinc-100",
              "xl:border-r xl:border-b-0 xl:last:border-r-0",
            )}
          >
            <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
              {metric.label}
            </p>
            <p className="mt-1.5 text-[1.75rem] leading-none font-bold tracking-tight text-zinc-900 tabular-nums">
              {metric.value}
            </p>
            <p className="mt-1.5 text-[11px] text-zinc-500">{metric.hint}</p>
            <span
              className="mt-3 block h-0.5 rounded-full bg-transparent group-data-[state=active]:bg-brand-600"
              aria-hidden="true"
            />
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {metrics.map((metric) => (
        <TabsPrimitive.Content
          key={metric.id}
          value={metric.id}
          className="px-3 pt-1 pb-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-400 sm:px-5"
        >
          {metric.points.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-zinc-500">
              Nothing to plot for this measure yet.
            </p>
          ) : (
            <AreaChart points={metric.points} formatValue={metric.format} />
          )}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
