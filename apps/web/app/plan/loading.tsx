import { Card } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";

export default function PlanLoading() {
  return (
    <AppShell loading fill fullWidth>
      <div aria-busy="true" className="workspace-scroll">
        <span className="sr-only">Loading your course plan</span>
        <div className="mb-4 space-y-3 rounded-2xl bg-card px-4 py-3.5 shadow-sm ring-1 ring-border sm:px-5">
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
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 2 }, (_, termIndex) => (
                  <Card key={termIndex} className="space-y-3 p-4">
                    <Skeleton className="h-3.5 w-36" />
                    {Array.from({ length: 3 }, (_, row) => (
                      <Skeleton key={row} className="h-12 w-full" />
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
