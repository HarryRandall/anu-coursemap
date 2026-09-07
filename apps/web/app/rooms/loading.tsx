import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";

/** Mirrors the room finder: a full-height map surface with the floating controls card. */
export default function RoomsLoading() {
  return (
    <AppShell fullBleed>
      <div
        aria-busy="true"
        className="relative h-[calc(100dvh-4rem)] min-h-[28rem] overflow-hidden bg-muted"
      >
        <span className="sr-only">Loading room finder</span>
        <div className="absolute top-3 right-16 left-3 z-10 sm:right-auto sm:w-[22rem]">
          <div className="space-y-2 rounded-md border border-border bg-card p-2.5 shadow-sm">
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </div>
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <Skeleton className="size-10 rounded-md" />
          <Skeleton className="size-10 rounded-md" />
        </div>
      </div>
    </AppShell>
  );
}
