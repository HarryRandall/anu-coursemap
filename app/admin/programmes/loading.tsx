import { AppShell } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProgrammesLoading() {
  return (
    <AppShell admin>
      <div
        aria-busy="true"
        className="mx-auto w-full max-w-7xl space-y-4 pb-10"
      >
        <h1 className="sr-only">Loading academic structures</h1>
        <span className="sr-only">Loading academic structure directory</span>
        <div className="flex h-11 items-center gap-5 border-b border-zinc-200">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-4 w-24" key={index} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[440px] w-full" />
      </div>
    </AppShell>
  );
}
