import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";

/** Mirrors a help guide: the tinted header, numbered sections and the sticky contents rail. */
export default function HelpArticleLoading() {
  return (
    <AppShell>
      <div
        aria-busy="true"
        className="mx-auto grid max-w-5xl items-start gap-10 py-2 sm:py-4 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-14"
      >
        <span className="sr-only">Loading help guide</span>
        <div className="max-w-3xl min-w-0">
          <div className="flex items-start gap-4 sm:gap-5">
            <Skeleton className="size-12 shrink-0 rounded-xl sm:size-14" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="mt-3 h-6 w-full max-w-lg" />
              <Skeleton className="mt-3 h-3 w-48" />
            </div>
          </div>
          <div className="mt-10 space-y-8 sm:mt-12 sm:space-y-10">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="grid gap-x-5 gap-y-3 sm:grid-cols-[2.25rem_minmax(0,1fr)]"
              >
                <Skeleton className="size-9 rounded-full" />
                <div className="min-w-0 space-y-3">
                  <Skeleton className="h-5 w-56 max-w-full sm:mt-1.5" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap gap-3 border-t border-border pt-8">
            <Skeleton className="h-10 w-40 rounded-lg" />
            <Skeleton className="h-10 w-56 rounded-lg" />
          </div>
        </div>
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
