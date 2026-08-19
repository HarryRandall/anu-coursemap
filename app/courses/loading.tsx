import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoursesLoading() {
  return (
    <AppShell>
      <div
        aria-busy="true"
        className="mx-auto flex w-full max-w-[1280px] flex-col gap-5"
      >
        <span className="sr-only">Loading the course catalogue</span>
        <Card className="overflow-hidden">
          <div className="border-b border-zinc-100 px-4 py-3">
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2 max-w-64" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <Skeleton className="hidden h-5 w-24 rounded-md sm:block" />
                <Skeleton className="hidden h-5 w-16 rounded-md sm:block" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
