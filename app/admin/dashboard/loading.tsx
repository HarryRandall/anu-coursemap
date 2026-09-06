import { Card } from "@reui/ui/card";
import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";

/** Mirrors the admin dashboard: four stat tiles above the import model card. */
export default function AdminDashboardLoading() {
  return (
    <AppShell admin>
      <div aria-busy="true" className="mx-auto w-full max-w-7xl space-y-5">
        <span className="sr-only">Loading live catalogue status</span>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="h-full gap-0 px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="mt-0.5 h-2.5 w-20" />
                <Skeleton className="size-8 shrink-0 rounded-md" />
              </div>
              <div className="mt-1 flex items-end gap-3">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="mb-0.5 h-8 flex-1" />
              </div>
            </Card>
          ))}
        </div>
        <Card className="gap-0 py-0">
          <div className="space-y-2 px-4 pt-4">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>
          <div className="px-4 pt-4 pb-5">
            <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
