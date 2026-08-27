import { AppShell } from "@/components/shell";
import { DataTableShell } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImportsSyncLoading() {
  return (
    <AppShell admin>
      <div
        aria-label="Loading catalogue sync"
        className="mx-auto w-full max-w-5xl space-y-4 pb-10"
        role="status"
      >
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-xs">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="ml-auto h-8 w-16" />
        </div>
        <DataTableShell>
          <div className="divide-y divide-zinc-100">
            <div className="h-10 bg-zinc-50/80" />
            {Array.from({ length: 6 }, (_, index) => (
              <div className="flex h-[45px] items-center px-4" key={index}>
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            ))}
          </div>
        </DataTableShell>
        <span className="sr-only">Loading catalogue sync</span>
      </div>
    </AppShell>
  );
}
