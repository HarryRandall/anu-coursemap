import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell/app-shell";

/** Mirrors the indoor map picker: a building search rail beside the campus map. */
export default function AdminRoomsLoading() {
  return (
    <AppShell admin fullBleed>
      <div
        aria-busy="true"
        className="grid min-h-[calc(100dvh-4rem)] bg-muted lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)]"
      >
        <span className="sr-only">Loading indoor maps</span>
        <div className="flex min-h-0 flex-col border-b border-border bg-card lg:border-r lg:border-b-0">
          <div className="border-b border-border p-4">
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-96 min-w-0" />
      </div>
    </AppShell>
  );
}
