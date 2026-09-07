import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import { ChartContainer } from "@coursemap/ui/primitives/chart";
import { ChartHoverCard } from "@/ui/common/chart-tooltip";
import {
  averageMark,
  periods,
  semesterChartData,
  type PreviewCourse,
} from "./preview-data";

export function PreviewTrendChart({
  courses,
  individual = false,
}: {
  courses: PreviewCourse[];
  individual?: boolean;
}) {
  const gradient = useId().replace(/:/g, "");
  const points = individual
    ? [...periods]
        .reverse()
        .flatMap((period) =>
          courses
            .filter((course) => course.term === period.value)
            .map((course) => ({ label: course.code, average: course.mark })),
        )
    : semesterChartData(courses);
  const Chart = individual ? LineChart : AreaChart;
  return (
    <Card className="min-w-0 gap-3">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>
              {individual ? "Course marks" : "Semester averages"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Mark / 100</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {averageMark(courses)}
            </p>
            <p className="text-xs text-muted-foreground">Overall average</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-4 sm:px-5">
        <ChartContainer
          config={{ average: { label: "Mark", color: "var(--color-primary)" } }}
          className="aspect-auto h-56 w-full"
          aria-label={points
            .map((point) => `${point.label}: ${point.average}`)
            .join(", ")}
        >
          <Chart
            data={points}
            margin={{ top: 10, right: 16, bottom: 0, left: -14 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              minTickGap={32}
              tickMargin={10}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <ReferenceLine
              y={50}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="4 5"
              strokeOpacity={0.4}
            />
            <Tooltip
              content={<ChartHoverCard suffix=" / 100" showNames={false} />}
              cursor={{
                stroke: "var(--color-muted-foreground)",
                strokeDasharray: "3 4",
              }}
            />
            {individual ? (
              <Line
                type="linear"
                dataKey="average"
                name="Mark"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-background)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            ) : (
              <Area
                type="linear"
                dataKey="average"
                name="Average"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill={`url(#${gradient})`}
                dot={{ r: 4, fill: "var(--color-background)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            )}
          </Chart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
