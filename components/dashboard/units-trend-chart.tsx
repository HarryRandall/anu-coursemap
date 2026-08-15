"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { Card } from "@/components/ui/card";
import type { TermUnits } from "@/lib/dashboard-series";

const width = 720;
const height = 220;
const pad = { left: 34, right: 12, top: 14, bottom: 26 };

export function UnitsTrendChart({
  points,
  degreeUnits,
}: {
  points: TermUnits[];
  degreeUnits: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const maxMapped = Math.max(...points.map((point) => point.units), 12);
  const yMax = (Math.floor(maxMapped / 12) + 1) * 12;
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const x = (index: number) =>
    points.length === 1
      ? pad.left + innerWidth / 2
      : pad.left + (index / (points.length - 1)) * innerWidth;
  const y = (value: number) =>
    pad.top + innerHeight - (value / yMax) * innerHeight;
  const path = (value: (point: TermUnits) => number) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${x(index)} ${y(value(point))}`,
      )
      .join(" ");
  const gridValues = Array.from(
    { length: yMax / 12 + 1 },
    (_, step) => step * 12,
  );
  const hover = active === null ? null : points[active];

  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let best = Infinity;
    points.forEach((_, index) => {
      const distance = Math.abs(x(index) - svgX);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActive(nearest);
  };

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Units over time
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Earned so far, and where the current plan lands · degree needs{" "}
            {degreeUnits}u
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full bg-brand-600"
              aria-hidden="true"
            />
            Earned
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0 w-4 border-t-2 border-dashed border-brand-400"
              aria-hidden="true"
            />
            With plan
          </span>
        </div>
      </div>
      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-48 w-full cursor-crosshair"
          role="img"
          aria-label="Cumulative units by study period. Hover or use arrow keys to inspect values."
          tabIndex={0}
          onPointerMove={move}
          onPointerLeave={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setActive((current) =>
                Math.min(points.length - 1, (current ?? -1) + 1),
              );
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setActive((current) =>
                Math.max(0, (current ?? points.length) - 1),
              );
            }
          }}
        >
          {gridValues.map((value) => (
            <g key={value}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(value)}
                y2={y(value)}
                className="stroke-zinc-100"
                strokeWidth="1"
              />
              <text
                x={pad.left - 6}
                y={y(value) + 3}
                textAnchor="end"
                className="fill-zinc-400"
                fontSize="10"
              >
                {value}
              </text>
            </g>
          ))}
          <path
            d={path((point) => point.units)}
            fill="none"
            stroke="var(--color-brand-400, #a78bfa)"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={path((point) => point.completed)}
            fill="none"
            stroke="var(--color-brand-600, #7c3aed)"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <circle
              key={point.id}
              cx={x(index)}
              cy={y(point.completed)}
              r={active === index ? 4.5 : 3}
              fill="var(--color-brand-600, #7c3aed)"
              stroke="white"
              strokeWidth="1.5"
            />
          ))}
          {hover && active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="var(--color-brand-600, #7c3aed)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}
          {points.map((point, index) => (
            <text
              key={point.id}
              x={x(index)}
              y={height - 8}
              textAnchor="middle"
              className="fill-zinc-400"
              fontSize="10"
            >
              {point.label}
            </text>
          ))}
        </svg>
        <div className="sr-only" aria-live="polite">
          {hover
            ? `${hover.label}: ${hover.completed} units earned, ${hover.units} units with plan`
            : null}
        </div>
        {hover && active !== null && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-white shadow-md"
            style={{
              left: `clamp(0.5rem, ${(x(active) / width) * 100}%, calc(100% - 9rem))`,
            }}
          >
            <p className="text-[10px] text-zinc-400">{hover.label}</p>
            <p className="text-xs font-semibold">
              {hover.completed}u earned · {hover.units}u with plan
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
