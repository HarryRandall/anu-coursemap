import { Card } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";
import { TabsLoading } from "@/ui/common/tabs-loading";

function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

/** Mirrors the profile editor: section tabs, a form card and the summary rail. */
export default function ProfileLoading() {
  return (
    <AppShell tabs={<TabsLoading widths={["w-16", "w-24", "w-14"]} />}>
      <div aria-busy="true" className="mx-auto w-full">
        <span className="sr-only">Loading profile and study details</span>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="min-w-0 gap-0 p-0">
            <div className="space-y-2 border-b border-border/60 px-5 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <FieldSkeleton className="sm:col-span-2" />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          </Card>
          <Card className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40 max-w-full" />
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4"
                >
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
