import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, CircleDot } from "lucide-react";
import { Suspense } from "react";
import type {
  ImportActivityResult,
  ImportActivityRow,
  ImportsDashboardData,
} from "@/components/admin/imports/imports-overview-data";
import { FilterBar } from "@/components/ui/filter-bar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

const resultLabels: Record<ImportActivityResult, string> = {
  changed: "Changed",
  failed: "Failed",
  review: "Review",
  unchanged: "Unchanged",
};

const resultTones: Record<ImportActivityResult, Tone> = {
  changed: "brand",
  failed: "danger",
  review: "warning",
  unchanged: "neutral",
};

function ResultBadge({ result }: { result: ImportActivityResult }) {
  return (
    <Badge
      tone={resultTones[result]}
      className="h-8 w-28 justify-center text-xs"
    >
      {result === "failed" ? (
        <AlertTriangle aria-hidden="true" />
      ) : result === "review" ? (
        <CircleDot aria-hidden="true" />
      ) : (
        <Check aria-hidden="true" />
      )}
      {resultLabels[result]}
    </Badge>
  );
}

export function ImportsActivity({
  data,
  rows,
}: {
  data: ImportsDashboardData;
  rows: ImportActivityRow[];
}) {
  const run = data.run;
  const percentage =
    run?.expectedCount && run.expectedCount > 0
      ? Math.min(100, Math.round((run.checkedCount / run.expectedCount) * 100))
      : run?.completedAt
        ? 100
        : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Activity
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {run
            ? `${run.scopeLabel} · ${run.checkedCount}${run.expectedCount ? ` of ${run.expectedCount}` : ""} checked`
            : "No import activity recorded"}
        </p>
      </header>

      {data.error ? (
        <Alert tone="danger">
          <AlertTriangle aria-hidden="true" />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      {run ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <span
                  className="size-2 rounded-full bg-brand-600 ring-4 ring-brand-100"
                  aria-hidden="true"
                />
                {run.status === "running" ? "Running" : run.status}
              </div>
              <h2 className="mt-2 text-lg font-semibold text-zinc-950">
                {run.scopeLabel}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {run.sourcePageCount} source pages · {run.parserVersion}
              </p>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-zinc-200 sm:w-[27rem]">
              <div className="px-3 text-center">
                <dt className="text-xs text-zinc-500">Checked</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {run.checkedCount}
                </dd>
              </div>
              <div className="px-3 text-center">
                <dt className="text-xs text-zinc-500">Changed</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {run.addedCount + run.changedCount}
                </dd>
              </div>
              <div className="px-3 text-center">
                <dt className="text-xs text-zinc-500">Failed</dt>
                <dd className="mt-1 text-lg font-semibold text-rose-700 tabular-nums">
                  {run.failedCount}
                </dd>
              </div>
            </dl>
            {percentage !== null ? (
              <strong className="text-2xl font-semibold tracking-tight tabular-nums">
                {percentage}%
              </strong>
            ) : null}
          </div>
          {percentage !== null ? (
            <div
              className="h-1 bg-zinc-100"
              role="progressbar"
              aria-label="Import progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
            >
              <div
                className="h-full bg-brand-600"
                style={{ width: `${percentage}%` }}
              />
            </div>
          ) : null}
        </Card>
      ) : null}

      <section aria-labelledby="course-activity-heading" className="space-y-3">
        <h2
          id="course-activity-heading"
          className="text-xl font-semibold tracking-tight text-zinc-950"
        >
          Course activity
        </h2>
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar
            filterTitle="Filter activity"
            searchPlaceholder="Search courses"
            filters={[
              {
                key: "status",
                label: "Result",
                allLabel: "All results",
                options: [
                  { label: "Changed", value: "changed" },
                  { label: "Unchanged", value: "unchanged" },
                  { label: "Review", value: "review" },
                  { label: "Failed", value: "failed" },
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
                <TableHead className="hidden text-center sm:table-cell">
                  Pages
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Current stage
                </TableHead>
                <TableHead className="text-right">Result</TableHead>
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
                      title="No course activity"
                      description="Courses checked by the latest import will appear here."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.year}:${row.code}`}>
                    <TableCell>
                      <Link href={row.href} className="block">
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-sm font-semibold text-zinc-700">
                            {row.code}
                          </span>
                          <span className="font-medium text-zinc-950">
                            {row.title}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500 md:hidden">
                          {row.stage}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell
                      className="hidden text-center sm:table-cell"
                      title={row.pageSummary}
                    >
                      <span className="font-semibold tabular-nums">
                        {row.pageCount}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.stage}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex">
                        <ResultBadge result={row.result} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={row.href}
                        aria-label={`Open ${row.code}`}
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
