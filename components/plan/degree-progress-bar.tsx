import { cn } from "@/lib/cn";
import type { DegreeUnitProgress } from "@/lib/planner";

export function DegreeProgressBar({
  progress,
  compact = false,
  tone = "light",
}: {
  progress: DegreeUnitProgress;
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const completedWidth =
    progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const plannedWidth =
    progress.total > 0 ? (progress.planned / progress.total) * 100 : 0;
  const empty = progress.mapped === 0;
  const dark = tone === "dark";

  return (
    <div>
      <div
        className={cn(
          "flex overflow-hidden rounded-full",
          compact ? "h-2" : "h-2.5",
          dark ? "bg-card/80" : "bg-accent/80",
        )}
        aria-label={`${progress.completed} units completed, ${progress.planned} units planned and ${progress.remaining} units still to plan`}
      >
        <span
          className={cn(
            "transition-[width] duration-300 motion-reduce:transition-none",
            dark ? "bg-brand-400" : "bg-primary",
          )}
          style={{ width: `${completedWidth}%` }}
        />
        <span
          className={cn(
            "transition-[width] duration-300 motion-reduce:transition-none",
            dark ? "bg-brand-200" : "bg-brand-300",
          )}
          style={{ width: `${plannedWidth}%` }}
        />
      </div>
      <dl
        className={cn("mt-3 grid grid-cols-3 gap-3", compact && "mt-2 gap-2")}
      >
        {[
          [
            "Completed",
            progress.completed,
            dark ? "bg-brand-400" : "bg-primary",
          ],
          [
            "In your plan",
            progress.planned,
            dark ? "bg-brand-200" : "bg-brand-300",
          ],
          [
            "Still to plan",
            progress.remaining,
            dark ? "bg-card/80" : "bg-zinc-300",
          ],
        ].map(([label, value, dot]) => (
          <div key={label}>
            <dt
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-medium sm:text-[11px]",
                dark ? "text-muted-foreground/80" : "text-muted-foreground",
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", dot)}
                aria-hidden="true"
              />
              {label}
            </dt>
            <dd
              className={cn(
                "mt-0.5 font-bold tracking-tight tabular-nums",
                compact ? "text-sm" : "text-lg sm:text-xl",
                dark ? "text-white" : "text-foreground",
              )}
            >
              {value}
              <span
                className={cn(
                  "ml-1 text-[11px] font-medium",
                  dark ? "text-muted-foreground" : "text-muted-foreground/80",
                )}
              >
                units
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {empty && !compact && (
        <p
          className={cn(
            "mt-2 text-[11px] leading-relaxed",
            dark ? "text-muted-foreground/80" : "text-muted-foreground",
          )}
        >
          Nothing is mapped yet. The bar stays empty until you add a course or
          record a completed unit.
        </p>
      )}
    </div>
  );
}
