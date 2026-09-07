import { cn } from "@/lib/cn";
import { gradeForMark, gradeStyles } from "./preview-data";

export function PreviewGrade({ mark }: { mark: number }) {
  const grade = gradeForMark(mark);
  return (
    <span
      aria-label={`${gradeStyles[grade].label} (${grade})`}
      className={cn(
        "inline-flex justify-center justify-self-center rounded px-1.5 py-0.5 text-xs font-semibold",
        gradeStyles[grade].badge,
      )}
    >
      {grade}
    </span>
  );
}
