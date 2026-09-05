"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
} from "recharts";
import { Card, CardContent } from "@reui/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@reui/ui/chart";
import type { DashboardTermPoint } from "@/lib/coursemap/dashboard-series";
import { STANDARD_TERM_UNITS } from "@/lib/planner";

const config = {
  units: { label: "Units", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Units per semester with the standard 24-unit load marked. */
export function TermLoadChart({
  terms,
  currentTermId,
}: {
  terms: readonly DashboardTermPoint[];
  currentTermId?: string;
}) {
  const data = terms.map((term) => ({
    id: term.id,
    label: term.label,
    units: term.units,
  }));

  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div>
          <h2 className="text-sm font-semibold">Semester load</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dashed line marks the standard {STANDARD_TERM_UNITS}-unit load
          </p>
        </div>

        {data.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">
            Add courses to see your semester load.
          </p>
        ) : (
          <ChartContainer config={config} className="h-56 w-full flex-1">
            <BarChart data={data} margin={{ top: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine
                y={STANDARD_TERM_UNITS}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <Bar dataKey="units" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {data.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={
                      entry.units > STANDARD_TERM_UNITS
                        ? "var(--chart-4)"
                        : "var(--chart-1)"
                    }
                    fillOpacity={
                      entry.units > STANDARD_TERM_UNITS ||
                      entry.id === currentTermId
                        ? 1
                        : 0.4
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
