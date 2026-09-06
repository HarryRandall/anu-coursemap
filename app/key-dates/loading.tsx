import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell/app-shell";

/** Mirrors the university calendar: heading and year picker, filters, the next three dates and the monthly agenda. */
export default function KeyDatesLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="w-full min-w-0 space-y-6">
        <span className="sr-only">Loading key dates</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-28" />
          <div className="grid gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex h-11 flex-wrap items-center gap-6 border-b border-border">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          {Array.from({ length: 2 }, (_, month) => (
            <div
              key={month}
              className="overflow-hidden rounded-xl border border-border bg-card lg:grid lg:grid-cols-[12rem_minmax(0,1fr)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-6 py-4 lg:flex-col lg:items-start lg:justify-start lg:gap-2 lg:border-r lg:border-b-0 lg:py-6">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="divide-y divide-border/60">
                {Array.from({ length: 3 }, (_, row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-4 px-4 py-5 sm:px-6 md:grid-cols-[5rem_minmax(0,1fr)_auto]"
                  >
                    <div className="space-y-1.5">
                      <Skeleton className="h-2.5 w-7" />
                      <Skeleton className="h-6 w-8" />
                    </div>
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="hidden h-5 w-24 rounded-full md:block" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
