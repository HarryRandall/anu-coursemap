import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, CircleDot } from "lucide-react";
import { Suspense } from "react";
import type {
  HistoricalChangeRow,
  HistoricalStatus,
  ImportsDashboardData,
} from "@/components/admin/imports/imports-overview-data";
import { FilterBar } from "@/components/ui/filter-bar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import type { Tone } from "@/lib/ui";

const statusLabels: Record<HistoricalStatus, string> = {
  "in-review": "In review",
  new: "New",
  resolved: "Resolved",
};

const statusTones: Record<HistoricalStatus, Tone> = {
  "in-review": "warning",
  new: "danger",
  resolved: "success",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function HistoryBadge({ status }: { status: HistoricalStatus }) {
  return (
    <Badge
      tone={statusTones[status]}
      className="h-8 w-28 justify-center text-xs"
    >
      {status === "resolved" ? (
        <Check aria-hidden="true" />
      ) : status === "in-review" ? (
        <CircleDot aria-hidden="true" />
      ) : (
        <AlertTriangle aria-hidden="true" />
      )}
      {statusLabels[status]}
    </Badge>
  );
}

export function ImportsHistory({
  data,
  rows,
}: {
  data: ImportsDashboardData;
  rows: HistoricalChangeRow[];
}) {
  const lastChecked = data.historical[0]?.checkedAt;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Historical changes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Approved past catalogue years remain unchanged.
          </p>
        </div>
        {lastChecked ? (
          <p className="text-sm text-zinc-500">
            Last change checked {formatDate(lastChecked)}
          </p>
        ) : null}
      </header>

      {data.error ? (
        <Alert tone="danger">
          <AlertTriangle aria-hidden="true" />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="historical-flags-heading" className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2
            id="historical-flags-heading"
            className="text-xl font-semibold tracking-tight text-zinc-950"
          >
            Flags
          </h2>
          <span className="text-sm text-zinc-500">
            {data.historicalOpenCount} open
          </span>
        </div>
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar
            searchPlaceholder="Search course or year"
            filters={[
              {
                key: "status",
                label: "Status",
                allLabel: "All statuses",
                options: [
                  { label: "New", value: "new" },
                  { label: "In review", value: "in-review" },
                  { label: "Resolved", value: "resolved" },
                ],
              },
            ]}
          />
        </Suspense>
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Course</TableHead>
                <TableHead className="hidden md:table-cell">Change</TableHead>
                <TableHead className="hidden sm:table-cell">Checked</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <DataTableEmpty
                      title="No historical changes"
                      description="Changes to approved past catalogue years will be flagged here."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={`${row.checkedAt}:${row.code}:${index}`}>
                    <TableCell>
                      <Link href={row.href} className="block">
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-sm font-semibold text-zinc-700">
                            {row.code}
                          </span>
                          <span className="font-medium text-zinc-950">
                            {row.title}
                          </span>
                          <span className="text-xs text-zinc-500 tabular-nums">
                            {row.year}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500 md:hidden">
                          {row.summary}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.summary}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-zinc-500 sm:table-cell">
                      {formatDate(row.checkedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex">
                        <HistoryBadge status={row.status} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={row.href}
                        aria-label={`Open ${row.code} historical change`}
                        className="grid size-9 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <ChevronRight size={17} aria-hidden="true" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableShell>
      </section>
    </div>
  );
}
