import { Badge } from "@coursemap/ui/components/badge";
import { Card } from "@coursemap/ui/primitives/card";
import { BookCheck } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@coursemap/ui/primitives/empty";
import { CourseToken } from "@/ui/common/course-token";
import {
  periods,
  averageMark,
  gradeForMark,
  type PreviewCourse,
} from "./preview-data";

export function PreviewResultList({
  courses,
  ledger = false,
}: {
  courses: PreviewCourse[];
  ledger?: boolean;
}) {
  if (!courses.length)
    return (
      <Empty className="rounded-xl border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookCheck aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No results yet</EmptyTitle>
          <EmptyDescription>
            Record a result from your current courses.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  if (ledger)
    return (
      <Card className="overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Course</th>
              <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">
                Units
              </th>
              <th className="px-3 py-3 text-right font-medium">Mark</th>
              <th className="px-5 py-3 text-right font-medium">Grade</th>
            </tr>
          </thead>
          <tbody>
            {periods.flatMap((period) => {
              const rows = courses.filter(
                (course) => course.term === period.value,
              );
              return rows.length
                ? [
                    <tr key={period.value} className="border-b bg-muted/40">
                      <th
                        colSpan={4}
                        className="px-5 py-2 text-left text-xs font-medium text-muted-foreground"
                      >
                        {period.label}
                      </th>
                    </tr>,
                    ...rows.map((course) => (
                      <tr key={course.code} className="border-b last:border-0">
                        <td className="px-5 py-4">
                          <span className="block font-medium">
                            {course.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {course.code}
                          </span>
                        </td>
                        <td className="hidden px-3 text-right tabular-nums sm:table-cell">
                          6
                        </td>
                        <td className="px-3 text-right font-medium tabular-nums">
                          {course.mark}
                        </td>
                        <td className="px-5 text-right">
                          <Badge
                            variant={
                              (course.mark ?? 0) < 50
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {gradeForMark(course.mark ?? 0)}
                          </Badge>
                        </td>
                      </tr>
                    )),
                  ]
                : [];
            })}
          </tbody>
        </table>
      </Card>
    );
  return (
    <div className="space-y-6">
      {periods.map((period) => {
        const rows = courses.filter((course) => course.term === period.value);
        if (!rows.length) return null;
        return (
          <section key={period.value} className="space-y-3">
            <header className="flex flex-wrap justify-between gap-2">
              <h3 className="text-sm font-semibold">{period.label}</h3>
              <span className="text-xs text-muted-foreground">
                {averageMark(rows)} average
              </span>
            </header>
            <Card className="gap-0 overflow-hidden py-0">
              {rows.map((course) => (
                <div
                  key={course.code}
                  className="flex items-center gap-3 border-b px-4 py-4 last:border-0"
                >
                  <CourseToken code={course.code} accent="blue" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{course.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {course.code} · 6 units
                    </p>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">
                    {course.mark}
                  </span>
                  <Badge
                    variant={
                      (course.mark ?? 0) < 50 ? "destructive" : "secondary"
                    }
                  >
                    {gradeForMark(course.mark ?? 0)}
                  </Badge>
                </div>
              ))}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
