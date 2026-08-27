"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";

export type SparklineVariant = "area" | "bar" | "line";

const BRAND = "#7c3aed";
const FILL = "url(#sparklineFill)";

type Point = { index: number; value: number };

function LastDot({
  cx,
  cy,
  index,
  lastIndex,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  lastIndex: number;
}) {
  if (cx == null || cy == null || index !== lastIndex) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} fill="white" r={3.25} />
      <circle cx={cx} cy={cy} fill={BRAND} r={2} />
    </g>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
}) {
  if (!active || payload?.[0]?.value == null) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-800 tabular-nums shadow-xs">
      {payload[0].value.toLocaleString("en-AU")}
    </div>
  );
}

function axes(peak: number) {
  return (
    <>
      <XAxis dataKey="index" hide />
      <YAxis domain={[0, peak]} hide />
      <Tooltip
        content={<ChartTooltip />}
        cursor={false}
        isAnimationActive={false}
      />
    </>
  );
}

/** Compact Recharts trend used inside dashboard stat tiles. */
export function Sparkline({
  className,
  label,
  values,
  variant = "area",
}: {
  className?: string;
  label: string;
  values: readonly number[];
  variant?: SparklineVariant;
}) {
  if (values.length === 0) return null;
  const series = values[0] === 0 ? values : [0, ...values];
  const peak = Math.max(...series, 1);
  const data: Point[] = series.map((value, index) => ({ index, value }));
  const lastIndex = data.length - 1;
  const lastDot = (props: { cx?: number; cy?: number; index?: number }) => (
    <LastDot lastIndex={lastIndex} {...props} />
  );

  return (
    <div
      aria-label={label}
      className={cn("h-8 min-w-0 flex-1", className)}
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        {variant === "bar" ? (
          <BarChart
            data={data}
            margin={{ bottom: 2, left: 0, right: 4, top: 2 }}
          >
            {axes(peak)}
            <Bar
              dataKey="value"
              fill={BRAND}
              isAnimationActive={false}
              maxBarSize={8}
              radius={[1, 1, 0, 0]}
            />
          </BarChart>
        ) : variant === "line" ? (
          <LineChart
            data={data}
            margin={{ bottom: 2, left: 0, right: 6, top: 4 }}
          >
            {axes(peak)}
            <Line
              activeDot={false}
              dataKey="value"
              dot={lastDot}
              isAnimationActive={false}
              stroke={BRAND}
              strokeWidth={1.75}
              type="monotone"
            />
          </LineChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ bottom: 2, left: 0, right: 6, top: 4 }}
          >
            <defs>
              <linearGradient id="sparklineFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {axes(peak)}
            <Area
              activeDot={false}
              dataKey="value"
              dot={lastDot}
              fill={FILL}
              isAnimationActive={false}
              stroke={BRAND}
              strokeWidth={1.75}
              type="monotone"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
