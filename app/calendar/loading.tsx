import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="mx-auto max-w-5xl space-y-5">
        <span className="sr-only">Loading plan calendar</span>
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, cardIndex) => (
            <Card key={cardIndex} className="overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-48 max-w-full" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="divide-y divide-zinc-100">
                {Array.from({ length: 3 }, (_, row) => (
                  <div key={row} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                    <Skeleton className="h-7 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
