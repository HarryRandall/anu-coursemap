"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@reui/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@reui/ui/chart";
import type { DashboardTermPoint } from "@/lib/coursemap/dashboard-series";

const config = {
  completed: { label: "Completed", color: "var(--chart-2)" },
  planned: { label: "Planned", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Cumulative earned and planned units across the plan timeline. */
export function UnitsTrendChart({
  degreeUnits,
  points,
}: {
  degreeUnits: number | null;
  points: readonly DashboardTermPoint[];
}) {
  const data = points.map((point) => ({
    label: point.label,
    completed: point.completed,
    planned: point.planned,
  }));
  const peak = Math.max(...points.map((point) => point.units), 0);
  const top = Math.max(peak, degreeUnits ?? 0);

  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div>
          <h2 className="text-sm font-semibold">Units over time</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Cumulative units, split between completed and still planned
            {degreeUnits ? ` · degree target ${degreeUnits}` : ""}
          </p>
        </div>

        {data.length === 0 ? (
          <p className="text-muted-foreground flex flex-1 items-center justify-center py-10 text-sm">
            Add courses to your plan to see progress over time.
          </p>
        ) : (
          <ChartContainer config={config} className="h-56 w-full flex-1">
            <AreaChart data={data} margin={{ left: 4, right: 4, top: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={[0, Math.ceil(top * 1.05)]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {degreeUnits !== null && degreeUnits > 0 && (
                <ReferenceLine
                  y={degreeUnits}
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
              )}
              <Area
                dataKey="completed"
                type="monotone"
                stackId="units"
                stroke="var(--color-completed)"
                fill="var(--color-completed)"
                fillOpacity={0.3}
              />
              <Area
                dataKey="planned"
                type="monotone"
                stackId="units"
                stroke="var(--color-planned)"
                fill="var(--color-planned)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
