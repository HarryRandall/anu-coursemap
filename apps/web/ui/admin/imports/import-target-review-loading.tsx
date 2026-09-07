"use client";

import { Card, CardContent, CardHeader } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { Tabs } from "@coursemap/ui/primitives/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coursemap/ui/primitives/table";
import { AppShell } from "@/ui/shell";
import { DataTableShell } from "@/ui/common/data-table";
import { ImportSectionTabs } from "./import-section-tabs";

export function ImportTargetReviewLoading({ noun }: { noun: string }) {
  return (
    <Tabs defaultValue="pipeline" className="gap-0">
      <AppShell
        loading
        admin
        fullBleed
        fill
        tabs={<ImportSectionTabs course={noun === "course"} loading />}
      >
        <div
          aria-busy="true"
          className="workspace-stack w-full px-4 py-5 sm:px-6"
        >
          <span className="sr-only">Loading {noun} import</span>
          <div className="workspace-stack">
            <header className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="ms-auto size-7" />
            </header>
            <div className="workspace-stack">
              <div
                className="workspace-scroll space-y-4"
                role="region"
                aria-label="Import pipeline"
                tabIndex={0}
              >
                <div
                  className="min-w-0 overflow-x-auto"
                  role="region"
                  aria-label="Pipeline stages"
                  data-scroll-kind="table"
                  tabIndex={0}
                >
                  <DataTableShell>
                    <Table className="min-w-[720px]">
                      <TableCaption className="sr-only">
                        Loading import pipeline stages
                      </TableCaption>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-16">Step</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Attempts</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 10 }, (_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Skeleton className="h-3 w-3" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-3 w-40" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="ms-auto h-3 w-4" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="ms-auto h-3 w-10" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-3 w-4" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableShell>
                </div>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-64 max-w-full" />
                    <Skeleton className="h-3 w-32" />
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                    {Array.from({ length: 8 }, (_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Tabs>
  );
}
