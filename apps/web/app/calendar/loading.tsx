import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";

const filters = [
  "w-[5.5rem]",
  "w-16",
  "w-[5.75rem]",
  "w-32",
  "w-20",
  "w-16",
  "w-14",
];

/**
 * Mirrors the study calendar: the category filter chips above the EventCalendar
 * month chrome (Today, view switcher, prev/next, title, then the week grid).
 */
export default function CalendarLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="mx-auto flex max-w-6xl flex-col gap-4">
        <span className="sr-only">Loading study calendar</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((width, index) => (
            <span
              key={index}
              className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 ${width}`}
            >
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-2.5 flex-1" />
            </span>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex h-[clamp(32rem,calc(100dvh-14rem),46rem)] flex-col">
            <div className="flex min-w-0 flex-wrap items-center gap-1 border-b border-border px-3 py-2">
              <Skeleton className="h-8 w-14 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <div className="flex items-center">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
              <Skeleton className="ms-3 h-4 w-32" />
            </div>
            <div className="grid grid-cols-7 border-b border-border">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="px-2 py-1.5">
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
            <div className="grid min-h-0 flex-1 grid-rows-6">
              {Array.from({ length: 6 }, (_, week) => (
                <div
                  key={week}
                  className="grid min-h-0 grid-cols-7 border-b border-border last:border-b-0"
                >
                  {Array.from({ length: 7 }, (_, day) => {
                    const showBar = (week + day) % 5 === 1;
                    const showSecond = (week + day) % 9 === 0;
                    return (
                      <div
                        key={day}
                        className="flex min-h-0 flex-col gap-0.5 overflow-hidden border-r border-border px-1 pt-1.5 last:border-r-0"
                      >
                        <Skeleton className="mb-1 h-3 w-4" />
                        {showBar ? (
                          <Skeleton className="h-[calc(var(--ec-month-bar-h,1.75rem)-0.125rem)] w-full rounded-sm" />
                        ) : null}
                        {showSecond ? (
                          <Skeleton className="h-[calc(var(--ec-month-bar-h,1.75rem)-0.125rem)] w-3/4 rounded-sm" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
