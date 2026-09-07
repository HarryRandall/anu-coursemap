import Link from "next/link";
import { Card } from "@coursemap/ui/primitives/card";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sparkline, type SparklineVariant } from "@/ui/ui/sparkline";

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
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            {label}
          </div>
        </div>
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary [&>svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex min-w-0 items-end gap-3">
        <div className="shrink-0">
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {showTrend ? (
          <Sparkline
            className="mb-0.5"
            label={chartLabel}
            values={trend ?? []}
            variant={trendVariant}
          />
        ) : null}
      </div>
      {action ? (
        <div className="mt-auto border-t border-border/60 pt-3">{action}</div>
      ) : null}
    </>
  );

  const classes = cn(
    "h-full gap-0 px-3.5 py-3",
    href &&
      "transition hover:border-input hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none",
    className,
  );

  if (href) {
    return (
      <Link
        className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={href}
      >
        <Card className={classes}>{body}</Card>
      </Link>
    );
  }

  return <Card className={classes}>{body}</Card>;
}
