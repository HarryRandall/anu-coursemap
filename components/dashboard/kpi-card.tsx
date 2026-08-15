"use client";

import type { ReactNode } from "react";
import { Sparkline } from "@/components/dashboard/sparkline";

export function KpiCard({
  label,
  value,
  hint,
  series,
  seriesLabel,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  series: number[];
  seriesLabel: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70">
      <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[1.75rem] leading-none font-bold tracking-tight text-zinc-900 tabular-nums">
          {value}
        </p>
        <span className="text-brand-600">
          <Sparkline values={series} label={seriesLabel} />
        </span>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">{hint}</p>
    </article>
  );
}
