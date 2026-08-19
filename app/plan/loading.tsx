import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanLoading() {
  return (
    <AppShell>
      <div aria-busy="true">
        <span className="sr-only">Loading your course plan</span>
        <div className="mb-4 space-y-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-zinc-200/70 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </div>
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
        <div className="flex flex-col gap-5">
          {Array.from({ length: 2 }, (_, yearIndex) => (
            <section key={yearIndex}>
              <Skeleton className="mb-2 h-4 w-32" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }, (_, termIndex) => (
                  <Card key={termIndex} className="space-y-3 p-4">
                    <Skeleton className="h-3.5 w-36" />
                    {Array.from({ length: 3 }, (_, row) => (
                      <div key={row} className="flex items-center gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
