import { Card } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";
import { TabsLoading } from "@/ui/common/tabs-loading";

export default function ProfileLoading() {
  return (
    <AppShell loading tabs={<TabsLoading widths={["w-16", "w-24", "w-14"]} />}>
      <div aria-busy="true" className="w-full">
        <span className="sr-only">Loading profile and study details</span>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="min-w-0 gap-5 p-5">
            <Skeleton className="h-4 w-32" />
            <div className="grid gap-5 sm:grid-cols-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={index === 0 ? "sm:col-span-2" : undefined}
                >
                  <Skeleton className="mb-2 h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="min-w-0 gap-5 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
            <Skeleton className="h-28 w-full" />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
