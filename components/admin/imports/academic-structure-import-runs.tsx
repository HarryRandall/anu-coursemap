import Link from "next/link";
import { ArrowUpRight, ChevronDown, Import } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import type { AcademicStructureImportRunPage } from "@/lib/coursemap/admin-academic-structure-imports";
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

export function AcademicStructureImportRuns({
  data,
}: {
  data: AcademicStructureImportRunPage;
}) {
  const hasActiveRun = data.records.some((run) =>
    ["queued", "running"].includes(run.status),
  );

  return (
    <AppShell admin currentBreadcrumbLabel="Structure runs">
      <CourseImportAutoRefresh active={hasActiveRun} />
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Academic structure import runs</h1>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="primary">
                <Import aria-hidden="true" size={15} />
                Start import
                <ChevronDown aria-hidden="true" size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                ["Programmes", "/admin/programmes"],
                ["Majors", "/admin/majors"],
                ["Minors", "/admin/minors"],
                ["Specialisations", "/admin/specialisations"],
              ].map(([label, href]) => (
                <DropdownMenuItem asChild key={href}>
                  <Link href={href}>{label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DataTableShell
          footer={
            <Pagination
              itemName="runs"
              page={data.page}
              pageSize={data.pageSize}
              pathname="/admin/imports/structures/runs"
              searchParams={{}}
              total={data.total}
            />
          }
        >
          {data.records.length === 0 ? (
            <DataTableEmpty
              description="Choose up to 10 directory entries to create the first background run."
              title="No academic structure import runs"
            />
          ) : (
            <Table className="min-w-[1120px]">
              <TableCaption>
                Academic structure import runs, newest first
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Run</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Structures</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Type</TableHead>
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
                      <span className="font-mono text-xs font-semibold text-zinc-950">
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
                      <span className="block max-w-64 truncate font-mono text-xs text-zinc-800">
                        {run.structureCodes.join(" ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {run.academicYear}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600">
                      {readable(run.structureKind)}
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
                      ) : run.acceptedCount || run.rejectedCount ? (
                        <span className="text-xs text-zinc-600 tabular-nums">
                          {run.acceptedCount} accepted · {run.rejectedCount}{" "}
                          rejected
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">None</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-[11px] text-zinc-600">
                      {run.requestedModel}
                    </TableCell>
                    <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                      {(run.inputTokens + run.outputTokens).toLocaleString(
                        "en-AU",
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                      {usd(run.costUsd)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        aria-label={`Open academic structure import run ${run.runNumber}`}
                        className="inline-grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                        href={`/admin/imports/structures/runs/${run.id}`}
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
