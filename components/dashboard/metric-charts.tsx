"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartHoverCard } from "@/components/ui/chart-tooltip";

export const chartColours = {
  violet: "#9e77ed",
  blue: "#53b1fd",
  green: "#32d583",
  amber: "#fdb022",
  rose: "#f970a8",
  muted: "var(--color-border)",
};
export type MetricPoint = { label: string; units: number };
export type ChartSegment = { name: string; value: number; fill: string };

export function TrendChart({
  points,
  kind = "area",
  colour = chartColours.violet,
  expanded = false,
}: {
  points: readonly MetricPoint[];
  kind?: "area" | "bar" | "line";
  colour?: string;
  expanded?: boolean;
}) {
  const gradient = `metric-${useId().replace(/:/g, "")}`;
  const Chart =
    kind === "bar" ? BarChart : kind === "line" ? LineChart : AreaChart;
  return (
    <div
      className={expanded ? "h-52 min-w-0" : "h-14 min-w-0"}
      role="group"
      aria-label={
        points.map((p) => `${p.label}: ${p.units} units`).join(", ") ||
        "No scheduled semesters"
      }
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 280, height: expanded ? 208 : 56 }}
      >
        <Chart
          data={[...points]}
          margin={{ top: 6, right: 8, left: expanded ? -22 : 4, bottom: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colour} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--color-border)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="label"
            hide={!expanded}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
            minTickGap={20}
          />
          <YAxis
            hide={!expanded}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, (max: number) => Math.max(6, Math.ceil(max * 1.15))]}
            tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            allowEscapeViewBox={{ x: false, y: true }}
            wrapperStyle={{ zIndex: 200 }}
            content={<ChartHoverCard suffix=" units" />}
            cursor={{
              stroke: "var(--color-muted-foreground)",
              strokeDasharray: "3 3",
              fill: "var(--color-muted)",
              fillOpacity: 0.25,
            }}
          />
          {kind === "bar" ? (
            <Bar
              dataKey="units"
              name="Units"
              fill={colour}
              radius={[3, 3, 0, 0]}
              maxBarSize={expanded ? 32 : 18}
              isAnimationActive={false}
            />
          ) : kind === "line" ? (
            <Line
              dataKey="units"
              name="Units"
              type="linear"
              stroke={colour}
              strokeWidth={2}
              dot={{ r: 2, fill: colour, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          ) : (
            <Area
              dataKey="units"
              name="Units"
              type="linear"
              stroke={colour}
              strokeWidth={2}
              fill={`url(#${gradient})`}
              dot={points.length === 1 ? { r: 3 } : false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  segments,
  large = false,
  half = false,
  compact = false,
}: {
  segments: readonly ChartSegment[];
  large?: boolean;
  half?: boolean;
  compact?: boolean;
}) {
  const hasValues = segments.some((segment) => segment.value > 0);
  const data = hasValues
    ? segments.filter((segment) => segment.value > 0)
    : [{ name: "No data", value: 1, fill: chartColours.muted }];
  return (
    <div
      className={
        large
          ? "size-44 shrink-0"
          : compact
            ? "h-14 w-16 shrink-0"
            : "h-20 w-24 shrink-0"
      }
      role="group"
      aria-label={
        hasValues
          ? segments.map((s) => `${s.name}: ${s.value}`).join(", ")
          : "No data yet"
      }
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: large ? 176 : 96, height: large ? 176 : 80 }}
      >
        <PieChart accessibilityLayer>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy={half ? "80%" : "50%"}
            innerRadius={large ? 60 : compact ? 18 : 25}
            outerRadius={large ? 80 : compact ? 26 : 36}
            startAngle={half ? 180 : 90}
            endAngle={half ? 0 : -270}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((segment) => (
              <Cell key={segment.name} fill={segment.fill} />
            ))}
          </Pie>
          {hasValues && (
            <Tooltip
              allowEscapeViewBox={{ x: true, y: true }}
              reverseDirection={{ x: true, y: false }}
              wrapperStyle={{ zIndex: 200 }}
              content={<ChartHoverCard />}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
