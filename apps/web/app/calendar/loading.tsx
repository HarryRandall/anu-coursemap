import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";

export default function CalendarLoading() {
  return (
    <AppShell loading fill>
      <div aria-busy="true" className="workspace-stack">
        <span className="sr-only">Loading study calendar</span>
        <Skeleton className="h-7 w-full max-w-xl shrink-0" />
        <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-card md:min-h-0 md:flex-1">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-7 gap-3 border-b border-border px-3 py-2">
            {Array.from({ length: 7 }, (_, day) => (
              <Skeleton key={day} className="h-3 w-8 max-w-full" />
            ))}
          </div>
          <Skeleton className="min-h-0 flex-1 rounded-none" />
        </div>
      </div>
    </AppShell>
  );
}
