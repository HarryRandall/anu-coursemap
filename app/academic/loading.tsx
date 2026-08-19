import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AcademicLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="mx-auto max-w-6xl space-y-5">
        <span className="sr-only">Loading academic overview</span>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </header>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="flex items-center gap-3 p-4">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-2.5 w-24 max-w-full" />
              </div>
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden">
          <div className="space-y-2 border-b border-zinc-100 px-5 py-4">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 5 }, (_, row) => (
              <div key={row} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2.5 w-28" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
