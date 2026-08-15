"use client";

import { useId, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import type { SeriesPoint } from "@/lib/dashboard-series";

const width = 800;
const height = 168;
const pad = { left: 8, right: 8, top: 16, bottom: 26 };

export function AreaChart({
  points,
  formatValue,
}: {
  points: SeriesPoint[];
  formatValue: (value: number) => string;
}) {
  const fillId = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);
  const series = points.length > 0 ? points : [{ label: "Start", value: 0 }];
  const max = Math.max(...series.map((point) => point.value), 1);
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const coords = series.map((point, index) => {
    const x =
      series.length === 1
        ? pad.left + innerWidth / 2
        : pad.left + (index / (series.length - 1)) * innerWidth;
    const y = pad.top + innerHeight - (point.value / max) * innerHeight;
    return { ...point, x, y };
  });
  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1].x} ${height - pad.bottom} L${coords[0].x} ${height - pad.bottom} Z`;
  const hover = active === null ? null : coords[active];
  const showAxisLabels = series.every((point) => point.label.length <= 8);

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    coords.forEach((point, index) => {
      const distance = Math.abs(point.x - svgX);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActive(nearest);
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-36 w-full cursor-crosshair"
        role="img"
        aria-label="Trend across study periods. Hover or use arrow keys to inspect values."
        tabIndex={0}
        onPointerMove={move}
        onPointerLeave={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setActive((current) =>
              Math.min(coords.length - 1, (current ?? -1) + 1),
            );
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setActive((current) => Math.max(0, (current ?? coords.length) - 1));
          }
        }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((tick) => (
          <line
            key={tick}
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + innerHeight * (1 - tick)}
            y2={pad.top + innerHeight * (1 - tick)}
            className="stroke-zinc-100"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${fillId})`} />
        <path
          d={line}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hover && (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#7c3aed"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hover.x} cy={hover.y} r="4.5" fill="#7c3aed" />
            <circle cx={hover.x} cy={hover.y} r="2" fill="white" />
          </>
        )}
        {showAxisLabels &&
          coords.map((point) => (
            <text
              key={point.label}
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-zinc-400"
              fontSize="11"
            >
              {point.label}
            </text>
          ))}
      </svg>
      <div className="sr-only" aria-live="polite">
        {hover ? `${hover.label}: ${formatValue(hover.value)}` : null}
      </div>
      {hover && (
        <div
          className={cn(
            "pointer-events-none absolute top-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-white shadow-md",
          )}
          style={{
            left: `clamp(0.5rem, ${(hover.x / width) * 100}%, calc(100% - 8rem))`,
          }}
        >
          <p className="text-[10px] text-zinc-400">{hover.label}</p>
          <p className="text-xs font-semibold">{formatValue(hover.value)}</p>
        </div>
      )}
    </div>
  );
}
