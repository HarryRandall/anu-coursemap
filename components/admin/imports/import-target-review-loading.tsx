"use client";

import { useParams } from "next/navigation";
import { Card } from "@reui/ui/card";
import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";
import { TabsLoading } from "@/components/ui/tabs-loading";

/**
 * Mirrors the course and academic structure import review pages: a full-bleed
 * workspace with review section tabs, a code and status header, and the
 * import pipeline stages. The numeric target id stays out of the breadcrumb
 * until the imported code is known.
 */
export function ImportTargetReviewLoading({ noun }: { noun: string }) {
  const { targetId } = useParams<{ targetId: string }>();

  return (
    <AppShell
      showThemeToggle={false}
      admin
      fullBleed
      breadcrumbSegmentLabels={{ [targetId]: null }}
    >
      <div aria-busy="true" className="w-full px-4 pb-10 sm:px-6">
        <span className="sr-only">Loading {noun} import</span>
        <div className="-mx-4 border-b border-border px-4 sm:-mx-6 sm:px-6">
          <TabsLoading widths={["w-14", "w-16", "w-12", "w-32", "w-24"]} />
        </div>
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-20 rounded-full" />
            ))}
          </div>
          <Card className="overflow-hidden">
            <div className="divide-y divide-border/60">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40 max-w-full" />
                    <Skeleton className="h-2.5 w-64 max-w-full" />
                  </div>
                  <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
                  <Skeleton className="hidden h-3 w-24 md:block" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
