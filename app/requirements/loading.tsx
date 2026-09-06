import { Card } from "@reui/ui/card";
import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";

/** Mirrors the requirements layout: rule cards on the left, summary rail on the right. */
export default function RequirementsLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="mx-auto w-full max-w-7xl">
        <span className="sr-only">Loading degree requirements</span>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, row) => (
                  <div
                    key={row}
                    className="space-y-3 rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-4 rounded-full" />
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="ml-auto h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="space-y-4 p-5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            </Card>
            <Card className="space-y-3 p-5">
              <Skeleton className="h-3.5 w-28" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-9" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
