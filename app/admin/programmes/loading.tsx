import { AppShell } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProgrammesLoading() {
  return (
    <AppShell admin>
      <div
        aria-busy="true"
        className="mx-auto w-full max-w-7xl space-y-4 pb-10"
      >
        <h1 className="sr-only">Loading programmes</h1>
        <span className="sr-only">Loading programme directory</span>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[440px] w-full" />
      </div>
    </AppShell>
  );
}
