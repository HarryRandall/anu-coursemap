import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import type { CourseImportRunPage } from "@/lib/coursemap/admin-course-imports";
import type { Tone } from "@/lib/ui";
import { CourseImportAutoRefresh } from "./course-import-auto-refresh";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function statusTone(status: string): Tone {
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "queued" || status === "running") return "info";
  if (status === "partially_succeeded") return "warning";
  return "success";
}

function usd(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: 6,
  }).format(value);
}

export function CourseImportRuns({ data }: { data: CourseImportRunPage }) {
  const hasActiveRun = data.records.some((run) =>
    ["queued", "running"].includes(run.status),
  );

  return (
    <AppShell admin>
      <CourseImportAutoRefresh active={hasActiveRun} />
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Course import runs</h1>
        <div className="flex justify-end">
          <ButtonLink href="/admin/courses" variant="primary">
            <Download aria-hidden="true" size={15} />
            Import courses
          </ButtonLink>
        </div>

        <DataTableShell
          footer={
            <Pagination
              itemName="runs"
              page={data.page}
              pageSize={data.pageSize}
              pathname="/admin/imports/runs"
              searchParams={{}}
              total={data.total}
            />
          }
        >
          {data.records.length === 0 ? (
            <DataTableEmpty
              description="Select up to 10 rows from the course directory to create the first background run."
              title="No course import runs"
            />
          ) : (
            <Table className="min-w-[1100px]">
              <TableCaption>Course import runs, newest first</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Run</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-zinc-950 tabular-nums">
                        #{run.runNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <time
                        className="text-xs text-zinc-600 tabular-nums"
                        dateTime={run.createdAt}
                      >
                        {dateFormatter.format(new Date(run.createdAt))}
                      </time>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-72 truncate font-mono text-xs text-zinc-800">
                        {run.courseCodes.join(" ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {run.academicYear}
                    </TableCell>
                    <TableCell>
                      <Badge tone={statusTone(run.status)}>
                        {readable(run.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600 tabular-nums">
                      {run.processedCount} / {run.targetCount}
                    </TableCell>
                    <TableCell>
                      {run.readyForReviewCount ? (
                        <Badge tone="warning">
                          {run.readyForReviewCount} ready
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">None</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-52 truncate font-mono text-[11px] text-zinc-600">
                      {run.requestedModel}
                    </TableCell>
                    <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                      {(run.inputTokens + run.outputTokens).toLocaleString(
                        "en-AU",
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                      {usd(run.actualCostUsd)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        aria-label={`Open course import run ${run.runNumber}`}
                        className="inline-grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                        href={`/admin/imports/runs/${run.id}`}
                      >
                        <ArrowUpRight aria-hidden="true" size={15} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableShell>
      </div>
    </AppShell>
  );
}
