import { resultLabel, type PreviewCourse } from "./preview-data";

export function PreviewMarkTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: PreviewCourse }[];
}) {
  const course = payload?.[0]?.payload;
  if (!active || !course || course.mark === undefined) return null;
  return (
    <div className="flex items-center gap-2 px-2 text-xs">
      <span className="shrink-0 font-medium">{course.code}</span>
      <span className="min-w-0 truncate text-muted-foreground">
        {course.name}
      </span>
      <span className="ml-auto shrink-0 font-medium tabular-nums">
        {course.mark}% · {resultLabel(course)}
      </span>
    </div>
  );
}
