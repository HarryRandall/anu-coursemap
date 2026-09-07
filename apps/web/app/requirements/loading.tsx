import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { TabsLoading } from "@/ui/common/tabs-loading";
import { AppShell } from "@/ui/shell";

export default function RequirementsLoading() {
  return (
    <AppShell loading fill>
      <div aria-busy="true" className="workspace-scroll space-y-5">
        <span className="sr-only">Loading degree requirements</span>
        <div className="space-y-6 rounded-2xl border border-border bg-card p-8">
          <Skeleton className="h-4 w-56 max-w-full" />
          <div className="flex flex-wrap items-center gap-6">
            <Skeleton className="size-28 rounded-full" />
            <div className="min-w-0 space-y-3">
              <Skeleton className="h-9 w-64 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
        </div>
        <TabsLoading widths={["w-12", "w-12", "w-12", "w-24"]} />
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="space-y-3 rounded-xl border border-border p-5"
          >
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
