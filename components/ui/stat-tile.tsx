import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sparkline, type SparklineVariant } from "@/components/ui/sparkline";

/** Adapted from ShowCrafter's compact dashboard stat tile. */
export function StatTile({
  label,
  value,
  unit,
  icon,
  description,
  action,
  href,
  trend,
  trendDomainMax,
  trendLabel,
  trendVariant = "area",
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  href?: string;
  trend?: readonly number[];
  trendDomainMax?: number;
  trendLabel?: string;
  trendVariant?: SparklineVariant;
  className?: string;
}) {
  const showTrend = Boolean(
    trend && trend.length > 1 && Math.max(...trend) > 0,
  );
  const chartLabel = trendLabel ?? `${label} over the last eight weeks`;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-medium text-zinc-500">
            {label}
          </div>
        </div>
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-brand-100 bg-brand-50 text-brand-700 [&>svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex min-w-0 items-end gap-3">
        <div className="shrink-0">
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-normal text-zinc-500">
                {unit}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              {description}
            </p>
          ) : null}
        </div>
        {showTrend ? (
          <div className="mb-0.5 flex min-w-0 flex-1 justify-end">
            <Sparkline
              domainMax={trendDomainMax}
              label={chartLabel}
              values={trend ?? []}
              variant={trendVariant}
            />
          </div>
        ) : null}
      </div>
      {action ? (
        <div className="mt-auto border-t border-zinc-100 pt-3">{action}</div>
      ) : null}
    </>
  );

  const classes = cn(
    "flex h-full flex-col rounded-lg border border-zinc-200/80 bg-white px-3.5 py-3 text-zinc-950 shadow-xs",
    href &&
      "transition hover:border-zinc-300 hover:bg-zinc-50/80 focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:outline-none",
    className,
  );

  if (href) {
    return (
      <Link className={classes} href={href}>
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
