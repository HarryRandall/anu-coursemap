"use client";
import { cn } from "@/lib/cn";
import { type RequirementNodeProgress } from "@/lib/coursemap/requirement-progress";

export /**
 * Completed and planned units stacked against a target so the two kinds of
 * progress read at a glance. Falls back to a plain line when the rule has
 * nothing to measure against.
 */
function UnitsBar({
  progress,
  className,
}: {
  progress: RequirementNodeProgress;
  className?: string;
}) {
  const goal = progress.targetUnits ?? progress.maximumUnits;
  if (goal === null || goal <= 0) return null;
  const completed = Math.min(100, (progress.completedUnits / goal) * 100);
  const planned = Math.min(
    100 - completed,
    (progress.plannedUnits / goal) * 100,
  );
  const overLimit = progress.state === "over_limit";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full transition-[width]",
          overLimit ? "bg-destructive" : "bg-primary",
        )}
        style={{ width: `${completed}%` }}
      />
      <span
        className={cn(
          "block h-full transition-[width]",
          overLimit ? "bg-destructive/40" : "bg-primary/35",
        )}
        style={{ width: `${planned}%` }}
      />
    </div>
  );
}
