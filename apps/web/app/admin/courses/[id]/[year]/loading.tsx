"use client";

import { useParams } from "next/navigation";
import { Card } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { AppShell } from "@/ui/shell";
import { TabsLoading } from "@/ui/common/tabs-loading";

export default function AdminCourseDetailLoading() {
  const { id, year } = useParams<{ id: string; year: string }>();

  return (
    <AppShell
      showThemeToggle={false}
      admin
      breadcrumbSegmentLabels={{ [id]: null, [year]: null }}
      breadcrumbTrailingLabel="Course data"
      tabs={<TabsLoading widths={["w-20", "w-16", "w-24", "w-14", "w-16"]} />}
    >
      <div aria-busy="true" className="w-full min-w-0 space-y-4 pb-10">
        <span className="sr-only">Loading course review</span>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="ml-auto size-9 rounded-md" />
        </div>
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="ml-auto h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-2 sm:col-span-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
