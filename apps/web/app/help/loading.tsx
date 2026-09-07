import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";

/** Mirrors the help centre: a centred search, grouped guide cards and the contact band. */
export default function HelpLoading() {
  return (
    <AppShell>
      <div
        aria-busy="true"
        className="mx-auto max-w-6xl space-y-12 py-2 sm:py-4"
      >
        <span className="sr-only">Loading help centre</span>
        <div className="space-y-10">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          {[3, 3].map((count, group) => (
            <div key={group}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: count }, (_, index) => (
                  <div
                    key={index}
                    className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-xs"
                  >
                    <Skeleton className="size-10 rounded-lg" />
                    <Skeleton className="mt-4 h-4 w-3/4" />
                    <Skeleton className="mt-2.5 h-3 w-full" />
                    <Skeleton className="mt-1.5 h-3 w-2/3" />
                    <Skeleton className="mt-5 h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border border-border bg-background p-4"
              >
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
