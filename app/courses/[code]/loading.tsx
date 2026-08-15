import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-md bg-zinc-200/70 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <div className="space-y-2 border-b border-zinc-100 px-5 py-4">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-64 max-w-full" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-6 shrink-0" />
            <Skeleton
              className={cn("h-3", index % 2 === 0 ? "w-3/4" : "w-1/2")}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function CourseLoading() {
  return (
    <AppShell title="Course">
      <div aria-busy="true">
        <span className="sr-only">Loading course</span>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-2.5 w-44" />
              <Skeleton className="h-5 w-72 max-w-full" />
              <Skeleton className="h-3 w-full max-w-xl" />
              <div className="flex gap-1.5 pt-1">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
            <Skeleton className="hidden h-9 w-28 rounded-lg sm:block" />
          </div>
        </Card>
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="flex flex-col gap-4">
            <SectionSkeleton rows={3} />
            <SectionSkeleton rows={4} />
            <SectionSkeleton rows={3} />
          </div>
          <div className="flex flex-col gap-4">
            <Card className="space-y-3 p-5">
              <Skeleton className="h-3.5 w-24" />
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3"
                >
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              ))}
            </Card>
            <Card className="space-y-3 p-5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-2/3" />
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
