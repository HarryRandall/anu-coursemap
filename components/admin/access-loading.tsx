import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";

export function UserDirectoryLoadingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5">
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xs">
        <div className="overflow-x-hidden">
          <div className="grid h-10 min-w-[720px] grid-cols-[42%_28%_15%_15%] items-center border-b border-zinc-200/80 bg-zinc-50/70 px-4">
            {["w-10", "w-9", "w-11", "w-12"].map((width, index) => (
              <Skeleton key={index} className={cn("h-2.5", width)} />
            ))}
          </div>
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="grid min-h-14 min-w-[720px] grid-cols-[42%_28%_15%_15%] items-center border-b border-zinc-200/80 px-4 last:border-b-0"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <span className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-40" />
                </span>
              </div>
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-200/80 bg-zinc-50/40 px-4 py-2.5">
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
    </div>
  );
}

export function RoleMatrixLoadingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5">
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xs">
        <div className="grid h-10 min-w-[800px] grid-cols-[minmax(500px,1fr)_150px_150px] items-center border-b border-zinc-200/80 bg-zinc-50/70 px-4">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mx-auto h-3 w-28" />
          <Skeleton className="mx-auto h-3 w-28" />
        </div>
        {[1, 2, 3].map((group) => (
          <div key={group}>
            <div className="flex h-8 items-center gap-2 border-b border-zinc-200/80 bg-zinc-50/70 px-4">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="size-4" />
            </div>
            <div className="grid min-h-14 min-w-[800px] grid-cols-[minmax(500px,1fr)_150px_150px] items-center border-b border-zinc-200/80 px-4">
              <span className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-64" />
              </span>
              <Skeleton className="mx-auto size-7" />
              <Skeleton className="mx-auto size-7" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserDetailLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[920px] min-w-0 space-y-5 overflow-hidden">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <span className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-2.5 w-44" />
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
          <span className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-48" />
          </span>
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>
        <div className="space-y-3 border-t border-zinc-200/80 px-4 py-4 sm:px-5">
          <Skeleton className="h-2.5 w-28" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 rounded-lg bg-zinc-50/80 px-3 py-2.5 ring-1 ring-zinc-200/70 ring-inset"
              >
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <span className="space-y-1.5">
                  <Skeleton className="h-2.5 w-28" />
                  <Skeleton className="h-2 w-44" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
