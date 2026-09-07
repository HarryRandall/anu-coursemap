import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";

const stagePillWidths = ["w-24", "w-16", "w-16", "w-16", "w-24", "w-20"];

/** Mirrors the roadmap: stage pills, then a vertical timeline of stages with their item cards. */
export default function RoadmapLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="py-2 sm:py-4">
        <span className="sr-only">Loading roadmap</span>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap gap-2 pb-1">
            {stagePillWidths.map((width, index) => (
              <Skeleton key={index} className={`h-9 rounded-full ${width}`} />
            ))}
          </div>
          <div className="relative mt-10 space-y-14 before:absolute before:top-3 before:bottom-3 before:left-[0.6875rem] before:w-px before:bg-border sm:mt-12">
            {Array.from({ length: 2 }, (_, stage) => (
              <div key={stage} className="relative pl-10 sm:pl-12">
                <Skeleton className="absolute top-0.5 left-0 size-6 rounded-full" />
                <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
                  <div>
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="mt-3 h-3 w-40 max-w-full" />
                  </div>
                  <div className="mt-5 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:mt-0">
                    {Array.from({ length: 3 }, (_, item) => (
                      <div
                        key={item}
                        className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs"
                      >
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="mt-3 h-3.5 w-3/4" />
                        <Skeleton className="mt-2 h-3 w-full" />
                        <Skeleton className="mt-1.5 h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
