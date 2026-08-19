import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="mx-auto max-w-6xl space-y-5">
        <span className="sr-only">Loading dashboard</span>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-3.5 w-52 max-w-full" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </header>
        <Card className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="space-y-2.5 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
