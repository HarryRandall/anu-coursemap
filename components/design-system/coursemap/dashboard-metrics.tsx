"use client";

import {
  Award01,
  BarChart03,
  CalendarDate,
  CoinsStacked01,
} from "@untitledui/icons";
import { MetricCard } from "@/components/design-system/coursemap/metric-card";

export function DashboardMetrics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Provisional GPA"
        value="6.17"
        change={4}
        caption="Across 13 graded courses"
        icon={Award01}
      />
      <MetricCard
        label="Recorded average"
        value="76.4"
        caption="Distinction average"
        icon={BarChart03}
      />
      <MetricCard
        label="Estimated fees so far"
        value="$21,840"
        caption="Eight completed courses"
        icon={CoinsStacked01}
      />
      <MetricCard
        label="Expected completion"
        value="Nov 2028"
        caption="Seven teaching periods"
        icon={CalendarDate}
      />
    </div>
  );
}
