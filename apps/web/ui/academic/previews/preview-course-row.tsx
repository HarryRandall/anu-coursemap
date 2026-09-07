import { PreviewCourseActions } from "./preview-course-actions";
import { Button } from "@coursemap/ui/primitives/button";

import { CourseToken } from "@/ui/common/course-token";
import { cn } from "@/lib/cn";
import { PreviewGrade } from "./preview-grade";
import {
  hasResult,
  resultCodeBadge,
  specialResults,
  type PreviewCourse,
} from "./preview-data";

export function PreviewCourseRow({
  course,
  compact,
  onSelect,
  onAction,
}: {
  course: PreviewCourse;
  compact: boolean;
  onSelect: (code: string) => void;
  onAction?: (code: string, action: "clear" | "remove") => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_3rem_3rem_2rem] items-center gap-3 border-b px-4 last:border-0 sm:px-5",
        compact ? "py-3" : "py-4",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {!compact ? (
          <span className="hidden sm:block">
            <CourseToken code={course.code} accent="blue" size="sm" />
          </span>
        ) : null}
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onSelect(course.id ?? course.code)}
            className="cursor-pointer text-left text-sm font-medium hover:underline"
          >
            {course.name}
          </button>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {course.code} · {course.units ?? 6} units
          </p>
        </div>
      </div>
      {!hasResult(course) ? (
        <Button
          variant="outline"
          size="sm"
          className="col-span-2 justify-self-end"
          onClick={() => onSelect(course.id ?? course.code)}
        >
          Record result
        </Button>
      ) : (
        <>
          <span className="text-right text-sm font-semibold tabular-nums">
            {course.mark === undefined ? "—" : `${course.mark}%`}
          </span>
          {course.resultCode ? (
            <span
              aria-label={
                specialResults.find((item) => item.value === course.resultCode)
                  ?.label
              }
              className={cn(
                "inline-flex justify-center justify-self-center rounded px-1.5 py-0.5 text-xs font-medium",
                resultCodeBadge(course.resultCode),
              )}
            >
              {course.resultCode}
            </span>
          ) : (
            <PreviewGrade mark={course.mark ?? 0} />
          )}
        </>
      )}
      <PreviewCourseActions
        course={course}
        onEdit={() => onSelect(course.id ?? course.code)}
        onAction={(action) => onAction?.(course.id ?? course.code, action)}
      />
    </div>
  );
}
