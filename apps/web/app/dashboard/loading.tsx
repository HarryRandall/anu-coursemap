import { Card } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";

export default function DashboardLoading() {
  return (
    <AppShell loading>
      <div aria-busy="true" className="flex min-w-0 flex-col gap-6">
        <span className="sr-only">Loading dashboard</span>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="min-w-0 gap-4 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
          {[0, 1].map((index) => (
            <Card key={index} className="min-w-0 justify-between gap-8 p-5">
              <Skeleton className="h-5 w-48 max-w-full" />
              <div className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="h-32 min-w-0 justify-between p-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ))}
        </div>
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          {[0, 1].map((index) => (
            <Card key={index} className="min-w-0 gap-4 p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-64 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
