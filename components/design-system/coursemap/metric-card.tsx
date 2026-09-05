"use client";

import type { FC, ReactNode } from "react";
import { ArrowDown, ArrowUp, DotsVertical } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Badge } from "@uui/components/base/badges/badges";
import { Dropdown } from "@uui/components/base/dropdown/dropdown";
import { ProgressBarBase } from "@uui/components/base/progress-indicators/progress-indicators";
import { ProgressBarHalfCircle } from "@uui/components/base/progress-indicators/progress-circles";
import { FeaturedIcon } from "@uui/components/foundations/featured-icon/featured-icon";
import { cx } from "@uui/utils/cx";

/**
 * Adapted. Untitled UI's metric cards are PRO-only. These are composed from the
 * free Badge, Dropdown, ProgressBar and FeaturedIcon primitives, with Recharts
 * supplying the sparkline as it does in the free charts-base component.
 */

function ChangeBadge({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <Badge size="sm" type="pill-color" color={up ? "success" : "error"}>
      <span className="flex items-center gap-1">
        {up ? (
          <ArrowUp className="size-3 shrink-0" />
        ) : (
          <ArrowDown className="size-3 shrink-0" />
        )}
        {Math.abs(change)}%
      </span>
    </Badge>
  );
}

function CardMenu({ onAction }: { onAction: (key: string) => void }) {
  return (
    <Dropdown.Root>
      <AriaButton
        aria-label="Metric options"
        className="cursor-pointer rounded-md p-1 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <DotsVertical className="size-5" />
      </AriaButton>
      <Dropdown.Popover className="w-min">
        <Dropdown.Menu onAction={(key) => onAction(String(key))}>
          <Dropdown.Item id="view">
            <span className="whitespace-nowrap">View breakdown</span>
          </Dropdown.Item>
          <Dropdown.Item id="export">
            <span className="whitespace-nowrap">Export as CSV</span>
          </Dropdown.Item>
          <Dropdown.Item id="hide">
            <span className="whitespace-nowrap">Hide this metric</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}

const shell =
  "flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-secondary";

/** Headline figure with a change badge. */
export function MetricCard({
  label,
  value,
  change,
  caption,
  icon,
  onAction,
  className,
}: {
  label: string;
  value: string;
  change?: number;
  caption?: ReactNode;
  icon?: FC<{ className?: string }>;
  onAction?: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cx(shell, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <FeaturedIcon size="md" color="brand" theme="light" icon={icon} />
          )}
          <p className="text-sm font-medium text-tertiary">{label}</p>
        </div>
        {onAction && <CardMenu onAction={onAction} />}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <p className="text-display-sm font-semibold text-primary">{value}</p>
        {typeof change === "number" && <ChangeBadge change={change} />}
      </div>

      {caption && <p className="text-sm text-tertiary">{caption}</p>}
    </div>
  );
}

/** Headline figure with a sparkline of recent periods. */
export function MetricTrendCard({
  label,
  value,
  change,
  data,
  dataKey,
  onAction,
}: {
  label: string;
  value: string;
  change: number;
  data: Array<Record<string, number | string>>;
  dataKey: string;
  onAction?: (key: string) => void;
}) {
  const up = change >= 0;

  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-tertiary">{label}</p>
        {onAction && <CardMenu onAction={onAction} />}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-display-sm font-semibold text-primary">{value}</p>
          <ChangeBadge change={change} />
        </div>

        <div className="h-16 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id={`spark-${dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={
                      up
                        ? "var(--color-fg-success-secondary)"
                        : "var(--color-fg-error-secondary)"
                    }
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      up
                        ? "var(--color-fg-success-secondary)"
                        : "var(--color-fg-error-secondary)"
                    }
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                strokeWidth={2}
                stroke={
                  up
                    ? "var(--color-fg-success-secondary)"
                    : "var(--color-fg-error-secondary)"
                }
                fill={`url(#spark-${dataKey})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/** Progress towards a target, for degree and requirement completion. */
export function MetricProgressCard({
  label,
  completed,
  total,
  unit = "units",
  caption,
  onAction,
}: {
  label: string;
  completed: number;
  total: number;
  unit?: string;
  caption?: ReactNode;
  onAction?: (key: string) => void;
}) {
  const percentage = total === 0 ? 0 : (completed / total) * 100;

  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-tertiary">{label}</p>
        {onAction && <CardMenu onAction={onAction} />}
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-display-sm font-semibold text-primary">
          {completed}
        </p>
        <p className="text-md text-tertiary">
          of {total} {unit}
        </p>
      </div>

      <ProgressBarBase value={percentage} />

      <p className="text-sm text-tertiary">
        {caption ?? `${Math.round(percentage)} per cent complete.`}
      </p>
    </div>
  );
}

/** A single figure broken into its parts, with a segmented bar and a legend. */
export function MetricBreakdownCard({
  label,
  total,
  unit = "units",
  segments,
  onAction,
}: {
  label: string;
  total: number;
  unit?: string;
  segments: Array<{
    id: string;
    label: string;
    value: number;
    className: string;
  }>;
  onAction?: (key: string) => void;
}) {
  const sum = segments.reduce((acc, segment) => acc + segment.value, 0);

  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-tertiary">{label}</p>
        {onAction && <CardMenu onAction={onAction} />}
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-display-sm font-semibold text-primary">{sum}</p>
        <p className="text-md text-tertiary">
          of {total} {unit}
        </p>
      </div>

      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-quaternary">
        {segments.map((segment) => (
          <span
            key={segment.id}
            className={cx("h-full first:rounded-l-full", segment.className)}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cx("size-2 rounded-full", segment.className)}
              />
              <span className="text-sm text-tertiary">{segment.label}</span>
            </span>
            <span className="font-mono text-xs text-quaternary">
              {segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A gauge, for a single headline percentage. */
export function MetricGaugeCard({
  label,
  value,
  caption,
  onAction,
}: {
  label: string;
  value: number;
  caption?: ReactNode;
  onAction?: (key: string) => void;
}) {
  return (
    <div className={cx(shell, "items-center text-center")}>
      <div className="flex w-full items-start justify-between gap-3">
        <p className="text-sm font-medium text-tertiary">{label}</p>
        {onAction && <CardMenu onAction={onAction} />}
      </div>

      <ProgressBarHalfCircle
        size="xs"
        value={value}
        label={caption ? String(caption) : undefined}
      />
    </div>
  );
}

/** Several small figures in one card, for a side-by-side read. */
export function MetricComparisonCard({
  label,
  rows,
  onAction,
}: {
  label: string;
  rows: Array<{ id: string; label: string; value: string; percentage: number }>;
  onAction?: (key: string) => void;
}) {
  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-tertiary">{label}</p>
        {onAction && <CardMenu onAction={onAction} />}
      </div>

      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-secondary">{row.label}</span>
              <span className="text-sm font-semibold text-primary">
                {row.value}
              </span>
            </div>
            <ProgressBarBase value={row.percentage} />
          </li>
        ))}
      </ul>
    </div>
  );
}
