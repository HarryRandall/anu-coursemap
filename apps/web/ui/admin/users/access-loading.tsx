import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { DataTableShell } from "@/ui/common/data-table";

export function RoleMatrixLoadingSkeleton() {
  return (
    <div className="mx-auto flex w-full flex-col gap-5">
      <DataTableShell>
        <div className="grid h-10 min-w-[800px] grid-cols-[minmax(500px,1fr)_150px_150px] items-center border-b border-border bg-muted/30 px-4">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mx-auto h-3 w-28" />
          <Skeleton className="mx-auto h-3 w-28" />
        </div>
        {[1, 2, 3].map((group) => (
          <div key={group}>
            <div className="flex h-8 items-center gap-2 border-b border-border bg-muted/30 px-4">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="size-4" />
            </div>
            <div className="grid min-h-14 min-w-[800px] grid-cols-[minmax(500px,1fr)_150px_150px] items-center border-b border-border px-4">
              <span className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-64" />
              </span>
              <Skeleton className="mx-auto size-7" />
              <Skeleton className="mx-auto size-7" />
            </div>
          </div>
        ))}
      </DataTableShell>
    </div>
  );
}

export function UserDetailLoadingSkeleton() {
  return (
    <div className="mx-auto w-full min-w-0 space-y-5 overflow-hidden">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
