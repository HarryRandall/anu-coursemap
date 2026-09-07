"use client";

import { useState } from "react";
import { Card, CardContent } from "@coursemap/ui/primitives/card";
import { Button } from "@coursemap/ui/primitives/button";
import { cn } from "@/lib/cn";
import type { DegreeUnitProgress } from "@/lib/planner";
import type { DashboardTermPoint } from "@/lib/coursemap/dashboard-series";
import { DonutChart, TrendChart, chartColours } from "./metric-charts";

type View = "mix" | "progress" | "semesters";
const views: { id: View; label: string }[] = [
  { id: "mix", label: "Unit mix" },
  { id: "progress", label: "Progress" },
  { id: "semesters", label: "Semesters" },
];

export function PlanInsights({
  progress,
  enrolledUnits,
  cumulative,
  terms,
}: {
  progress: DegreeUnitProgress;
  enrolledUnits: number;
  cumulative: readonly DashboardTermPoint[];
  terms: readonly DashboardTermPoint[];
}) {
  const [view, setView] = useState<View>("mix");
  const segments = [
    { name: "Completed", value: progress.completed, fill: chartColours.green },
    { name: "Enrolled", value: enrolledUnits, fill: chartColours.blue },
    {
      name: "Planned",
      value: Math.max(0, progress.planned - enrolledUnits),
      fill: chartColours.violet,
    },
    {
      name: "Unallocated",
      value: progress.remaining,
      fill: chartColours.muted,
    },
  ];
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Plan insights</h2>
          <div
            role="group"
            aria-label="Plan chart view"
            className="flex gap-1 rounded-lg border border-border p-1"
          >
            {views.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "h-7 px-2 text-xs",
                  view === item.id && "bg-muted text-foreground",
                )}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
        {view === "mix" ? (
          <div className="flex min-h-52 flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:gap-8">
            <div className="relative">
              <DonutChart segments={segments} large />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">
                  {progress.mapped}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  units allocated
                </span>
              </div>
            </div>
            <dl className="flex min-w-40 flex-1 flex-col gap-4">
              {segments.map((segment) => (
                <div
                  key={segment.name}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: segment.fill }}
                    aria-hidden="true"
                  />
                  <dt className="flex-1 text-muted-foreground">
                    {segment.name}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {segment.value}
                    <span className="ml-1 font-normal text-muted-foreground">
                      units
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <TrendChart
            expanded
            kind={view === "progress" ? "area" : "bar"}
            points={(view === "progress" ? cumulative : terms).map((point) => ({
              label: point.label,
              units: point.units,
            }))}
            colour={
              view === "progress" ? chartColours.violet : chartColours.blue
            }
          />
        )}
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          {view === "mix"
            ? `${progress.remaining} units still to allocate`
            : view === "progress"
              ? "Cumulative completed and planned units"
              : "Completed and planned units in each semester"}
        </p>
      </CardContent>
    </Card>
  );
}
