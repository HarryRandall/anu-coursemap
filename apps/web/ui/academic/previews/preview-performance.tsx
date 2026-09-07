import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@coursemap/ui/primitives/card";
import {
  averageMark,
  gradeForMark,
  periods,
  type PreviewCourse,
} from "./preview-data";

export function PreviewPerformance({ courses }: { courses: PreviewCourse[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Semester averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-around gap-4">
            {[...periods].reverse().map((period) => {
              const rows = courses.filter(
                (course) => course.term === period.value,
              );
              if (!rows.length) return null;
              const average = averageMark(rows);
              return (
                <div key={period.value} className="min-w-0 flex-1 text-center">
                  <p className="text-lg font-semibold tabular-nums">
                    {average}
                  </p>
                  <div className="mt-2 flex h-36 items-end justify-center">
                    <div
                      role="img"
                      aria-label={`${period.label}: ${average} out of 100`}
                      className="w-12 rounded-t-md bg-primary/75"
                      style={{ height: `${average}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {period.label}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Average mark / 100
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Grade distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {["HD", "D", "CR", "P", "N"].map((grade) => {
            const count = courses.filter(
              (course) => gradeForMark(course.mark ?? 0) === grade,
            ).length;
            return (
              <div
                key={grade}
                className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm"
              >
                <span className="font-medium">{grade}</span>
                <div
                  aria-hidden="true"
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary/75"
                    style={{
                      width: `${(count / Math.max(courses.length, 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-right tabular-nums">{count}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
