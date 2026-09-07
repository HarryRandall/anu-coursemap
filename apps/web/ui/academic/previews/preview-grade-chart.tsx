import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
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
  grades,
  gradeForMark,
  gradeStyles,
  semesterChartData,
  type PreviewCourse,
} from "./preview-data";

export function PreviewGradeChart({
  courses,
  design,
}: {
  courses: PreviewCourse[];
  design: string;
}) {
  const counts = grades.map((grade) => ({
    grade,
    count: courses.filter((course) => gradeForMark(course.mark ?? 0) === grade)
      .length,
    fill: gradeStyles[grade].colour,
  }));
  const config = Object.fromEntries(
    grades.map((grade) => [
      grade,
      { label: grade, color: gradeStyles[grade].colour },
    ]),
  );
  return (
    <Card className="min-w-0 gap-3">
      <CardHeader>
        <CardTitle>
          {design === "3" ? "Grades by semester" : "Grade distribution"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {courses.length} recorded results
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        {design === "1" ? (
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <ChartContainer
              config={config}
              className="aspect-auto h-56 w-full"
              aria-label={counts
                .map((item) => `${item.grade}: ${item.count}`)
                .join(", ")}
            >
              <PieChart accessibilityLayer>
                <Tooltip content={<ChartHoverCard suffix=" courses" />} />
                <Pie
                  data={counts.filter((item) => item.count)}
                  dataKey="count"
                  nameKey="grade"
                  innerRadius="66%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke="var(--color-background)"
                  strokeWidth={3}
                  isAnimationActive={false}
                >
                  <Label
                    value={`${courses.length} results`}
                    position="center"
                    fill="var(--color-foreground)"
                    className="text-sm font-medium"
                  />
                  {counts
                    .filter((item) => item.count)
                    .map((item) => (
                      <Cell key={item.grade} fill={item.fill} />
                    ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="grid grid-cols-5 gap-2 sm:grid-cols-1 sm:gap-4">
              {counts.map((item) => (
                <li
                  key={item.grade}
                  className="flex flex-wrap items-center gap-2 text-xs"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span>{item.grade}</span>
                  <span className="ml-auto text-muted-foreground tabular-nums">
                    {item.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-56 w-full"
            aria-label={counts
              .map((item) => `${item.grade}: ${item.count}`)
              .join(", ")}
          >
            {design === "2" ? (
              <BarChart
                data={counts}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 0, left: -15 }}
                accessibilityLayer
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="grade"
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={
                    <ChartHoverCard suffix=" courses" showNames={false} />
                  }
                  cursor={{ fill: "var(--color-muted)", fillOpacity: 0.4 }}
                />
                <Bar
                  dataKey="count"
                  name="Courses"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={18}
                  isAnimationActive={false}
                >
                  {counts.map((item) => (
                    <Cell key={item.grade} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={semesterChartData(courses)}
                margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                accessibilityLayer
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  content={<ChartHoverCard suffix=" courses" />}
                  cursor={{ fill: "var(--color-muted)", fillOpacity: 0.4 }}
                />
                {[...grades].reverse().map((grade) => (
                  <Bar
                    key={grade}
                    dataKey={grade}
                    stackId="grades"
                    fill={gradeStyles[grade].colour}
                    maxBarSize={45}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
