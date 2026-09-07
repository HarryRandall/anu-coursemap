import { averageMark, type PreviewCourse } from "./preview-data";

export function PreviewSummary({ courses }: { courses: PreviewCourse[] }) {
  return (
    <dl className="flex flex-wrap gap-x-12 gap-y-5 border-b pb-6">
      {[
        { label: "Average mark", value: averageMark(courses) },
        {
          label: "Units earned",
          value:
            courses.filter((course) => (course.mark ?? 0) >= 50).length * 6,
        },
        { label: "Results recorded", value: courses.length },
      ].map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
