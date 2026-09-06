"use client";

import { useParams } from "next/navigation";
import { Card } from "@reui/ui/card";
import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";
import { TabsLoading } from "@/components/ui/tabs-loading";
import { cn } from "@/lib/cn";

/**
 * Mirrors the course review workspace: section tabs, a code and status
 * header, then the course data card. The public id is a database identifier,
 * so it stays out of the breadcrumb until the course title loads.
 */
export default function AdminCourseDetailLoading() {
  const { id } = useParams<{ id: string }>();

  return (
    <AppShell
      admin
      breadcrumbSegmentLabels={{ [id]: null }}
      tabs={<TabsLoading widths={["w-20", "w-14", "w-16", "w-24"]} />}
    >
      <div
        aria-busy="true"
        className="mx-auto w-full max-w-7xl min-w-0 space-y-4 pb-10"
      >
        <span className="sr-only">Loading course review</span>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-56 max-w-full" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-5 w-20 rounded-full" />
          ))}
        </div>
        <Card className="gap-0 py-0">
          <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={cn(
                  "space-y-2.5 px-4 py-3.5 sm:px-5",
                  index > 0 && "border-l border-border",
                )}
              >
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
          <div className="px-5 sm:px-6">
            {[
              ["w-12", "w-3/4"],
              ["w-16", "w-24"],
              ["w-10", "w-16"],
              ["w-20", "w-full"],
              ["w-24", "w-2/3"],
            ].map(([labelWidth, valueWidth], index) => (
              <div
                key={index}
                className="grid gap-2 border-b border-border/60 py-4 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-5"
              >
                <Skeleton className={cn("h-3", labelWidth)} />
                <div className="space-y-2">
                  <Skeleton className={cn("h-3", valueWidth)} />
                  {index === 3 ? <Skeleton className="h-3 w-1/2" /> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
