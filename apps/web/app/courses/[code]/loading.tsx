import { Card } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { TabsLoading } from "@/ui/common/tabs-loading";
import { AppShell } from "@/ui/shell";

export default function CourseLoading() {
  return (
    <AppShell
      loading
      tabs={
        <TabsLoading
          widths={["w-16", "w-16", "w-16", "w-24"]}
          className="gap-4"
        />
      }
    >
      <div aria-busy="true" className="space-y-4">
        <span className="sr-only">Loading course</span>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-3 w-28 max-w-full" />
              <Skeleton className="h-6 w-72 max-w-full" />
              <Skeleton className="h-3 w-full max-w-xl" />
            </div>
          </div>
        </Card>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-4">
            {[0, 1].map((index) => (
              <Card key={index} className="min-w-0 gap-5 p-5">
                <Skeleton className="h-4 w-36" />
                <div className="space-y-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </Card>
            ))}
          </div>
          <Card className="min-w-0 gap-5 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
