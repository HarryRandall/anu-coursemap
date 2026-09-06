"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";
import { TabsLoading } from "@/components/ui/tabs-loading";

/** Mirrors the indoor map editor: section tabs, the floors rail and the map surface. */
export default function AdminRoomEditorLoading() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <AppShell
      admin
      fullBleed
      breadcrumbSegmentLabels={{ [slug]: null }}
      tabs={<TabsLoading widths={["w-12", "w-20", "w-32", "w-16"]} />}
    >
      <div
        aria-busy="true"
        className="flex min-h-[calc(100dvh-6.5rem)] flex-col bg-muted lg:h-[calc(100dvh-6.5rem)] lg:min-h-0"
      >
        <span className="sr-only">Loading floor plan</span>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b border-border bg-card lg:border-r lg:border-b-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="divide-y divide-border/60">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  <Skeleton className="size-8 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="min-h-96 bg-muted" />
        </div>
      </div>
    </AppShell>
  );
}
