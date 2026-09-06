import type { ReactNode } from "react";
import { Card, CardContent } from "@reui/ui/card";
import { Skeleton } from "@reui/ui/skeleton";
import { AppShell } from "@/components/shell";

function MetricFrame({ children }: { children: ReactNode }) {
  return (
    <Card className="min-w-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4">{children}</CardContent>
    </Card>
  );
}

/**
 * Mirrors the student home: four university metric cards, the degree progress
 * hero beside the requirements panel, three compact planning metrics, then the
 * degree composition treemap beside the month calendar.
 */
export default function DashboardLoading() {
  return (
    <AppShell>
      <div aria-busy="true" className="mx-auto flex max-w-7xl flex-col gap-6">
        <span className="sr-only">Loading dashboard</span>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricFrame>
            <div className="flex min-h-7 items-baseline justify-between gap-2">
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-3.5 w-12" />
            </div>
            <Skeleton className="h-[76px] w-full" />
            <div className="flex justify-between">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-2 w-8" />
              ))}
            </div>
          </MetricFrame>
          <MetricFrame>
            <div className="flex min-h-7 items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
            <div className="flex h-24 items-end gap-2 px-1">
              {[40, 50, 70, 80, 100].map((height, index) => (
                <Skeleton
                  key={index}
                  className="flex-1 rounded-t-sm"
                  style={{ height: `${height * 0.2}px` }}
                />
              ))}
            </div>
          </MetricFrame>
          <MetricFrame>
            <div className="flex min-h-7 items-baseline justify-between gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex h-24 flex-col justify-center gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[2rem_1fr_3.5rem] items-center gap-2"
                >
                  <Skeleton className="h-2 w-7" />
                  <Skeleton className="h-2 w-full rounded-sm" />
                  <Skeleton className="ml-auto h-2 w-10" />
                </div>
              ))}
            </div>
          </MetricFrame>
          <MetricFrame>
            <div className="flex min-h-7 items-center justify-between gap-2">
              <Skeleton className="h-5 w-16" />
              <div className="flex items-center gap-0.5">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
            <div className="flex h-24 flex-col justify-center gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[4.5rem_1fr_1.5rem] items-center gap-2"
                >
                  <Skeleton className="h-2 w-16" />
                  <Skeleton className="h-px w-full" />
                  <Skeleton className="ml-auto h-2 w-4" />
                </div>
              ))}
            </div>
          </MetricFrame>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
          <Card className="h-full py-0">
            <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Skeleton className="h-8 w-64 max-w-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <div className="flex flex-1 flex-col justify-center gap-4">
                <Skeleton className="h-2.5 w-full rounded-full" />
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Skeleton className="size-2 rounded-full" />
                      <Skeleton className="h-2.5 w-16" />
                      <Skeleton className="h-2.5 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="h-full py-0">
            <CardContent className="flex h-full flex-col gap-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
              <ul className="flex flex-col gap-4 pt-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <li key={index} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-sm" />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="relative overflow-visible py-0">
              <CardContent className="relative flex h-32 flex-col justify-between p-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-6 w-24" />
                <div className="absolute top-6 right-4 flex h-20 w-2/5 items-center justify-end">
                  {index === 2 ? (
                    <div className="flex h-full w-full items-end gap-1">
                      {[70, 50, 80, 40].map((height, bar) => (
                        <Skeleton
                          key={bar}
                          className="flex-1 rounded-sm"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Skeleton className="size-16 rounded-full" />
                  )}
                </div>
                <Skeleton className="h-2.5 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <Card className="h-full py-0">
            <CardContent className="flex h-full flex-col gap-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <div className="grid min-h-52 flex-1 grid-cols-4 gap-1.5">
                <Skeleton className="col-span-2 h-full rounded-lg" />
                <Skeleton className="h-full rounded-lg" />
                <div className="grid min-w-0 grid-rows-[2fr_1fr] gap-1.5">
                  <Skeleton className="rounded-lg" />
                  <Skeleton className="rounded-lg" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Skeleton className="size-2 rounded-sm" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="h-full py-0">
            <CardContent className="flex h-full flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-28" />
                <div className="flex items-center">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-7">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="flex justify-center pb-1">
                    <Skeleton className="h-2 w-6" />
                  </div>
                ))}
                {Array.from({ length: 42 }, (_, index) => (
                  <div key={index} className="grid h-9 place-items-center">
                    <Skeleton className="size-8 rounded-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
