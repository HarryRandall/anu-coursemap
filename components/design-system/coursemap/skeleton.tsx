import { cx } from "@uui/utils/cx";

/**
 * Adapted. Untitled UI has no free skeleton component, so these are built from
 * the semantic surface tokens and shaped to match the real components they
 * stand in for.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("bg-quaternary animate-pulse rounded-md", className)}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cx("h-3.5", index === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Matches the geometry of a Coursemap course card. */
export function SkeletonCourseCard() {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-secondary">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4.5 w-56" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

/** Matches the geometry of a metric card. */
export function SkeletonMetricCard() {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-primary p-5 ring-1 ring-secondary">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

/** Matches the geometry of a table row. */
export function SkeletonTableRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-secondary rounded-xl bg-primary ring-1 ring-secondary">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-6 w-20 rounded-full max-sm:hidden" />
          <Skeleton className="h-3.5 w-16 max-md:hidden" />
        </div>
      ))}
    </div>
  );
}
