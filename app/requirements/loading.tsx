import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RequirementsLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="mx-auto max-w-5xl space-y-5">
        <span className="sr-only">Loading degree requirements</span>
        <Card className="space-y-4 p-5">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </Card>
        <Card>
          <div className="space-y-2 border-b border-zinc-100 px-5 py-4">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 4 }, (_, row) => (
              <div key={row} className="flex items-center gap-3 px-5 py-3">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-2.5 w-2/5" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
