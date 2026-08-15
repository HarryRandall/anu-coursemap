"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export function Sparkline({
  values,
  className,
  label,
}: {
  values: number[];
  className?: string;
  label: string;
}) {
  const fillId = useId().replace(/:/g, "");
  const width = 128;
  const height = 44;
  const series =
    values.length > 1
      ? values
      : values.length === 1
        ? [values[0], values[0]]
        : [0, 0];
  const max = Math.max(...series, 1);
  const min = Math.min(0, ...series);
  const span = max - min || 1;
  const coords = series.map((value, index) => {
    const x =
      series.length === 1 ? width / 2 : (index / (series.length - 1)) * width;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return { x, y };
  });
  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const last = coords[coords.length - 1];
  const area = `${line} L${width} ${height} L0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-11 w-32 overflow-visible", className)}
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r="2.25" fill="currentColor" />
    </svg>
  );
}
