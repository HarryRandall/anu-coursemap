"use client";
import { TrendChart, DonutChart, chartColours } from "./metric-charts";

export function Ring({ percent, label }: { percent: number; label: string }) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <DonutChart
      segments={[
        { name: label, value, fill: chartColours.green },
        { name: "Remaining (%)", value: 100 - value, fill: chartColours.muted },
      ]}
    />
  );
}
export function TickMeter({
  percent,
  label,
  steps = 20,
}: {
  percent: number;
  label: string;
  steps?: number;
}) {
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * steps;
  return (
    <div className="flex h-3 gap-1" role="img" aria-label={label}>
      {Array.from({ length: steps }, (_, index) => (
        <span
          key={index}
          className="relative flex-1 overflow-hidden rounded-xs bg-muted"
        >
          <span
            className="absolute inset-y-0 left-0 bg-current"
            style={{
              width: `${Math.max(0, Math.min(1, filled - index)) * 100}%`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
export function MiniBars({
  points,
}: {
  points: readonly { label: string; units: number }[];
  label: string;
}) {
  return <TrendChart points={points} kind="bar" colour={chartColours.blue} />;
}

/* ------------------------------------------------------------------ */
/* View model                                                          */
/* ------------------------------------------------------------------ */
