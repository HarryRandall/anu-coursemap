import Link from "next/link";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { StatTile } from "@/components/ui/stat-tile";
import type { CourseImportRunDetail } from "@/lib/coursemap/admin-course-imports";
import type { Tone } from "@/lib/ui";
import { CourseImportAutoRefresh } from "./course-import-auto-refresh";
import { CourseImportRunRecovery } from "./course-import-run-recovery";

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
  if (status === "failed" || status === "cancelled" || status === "rejected") {
    return "danger";
  }
  if (status === "queued" || status === "running" || status === "processing") {
    return "info";
  }
  if (
    status === "partially_succeeded" ||
    status === "ready_for_review" ||
    status === "pending"
  ) {
    return "warning";
  }
  if (status === "accepted" || status === "succeeded") return "success";
  return "neutral";
}

function usd(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function duration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt) return "Not started";
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const elapsed = end - new Date(startedAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "—";
  const seconds = Math.floor(elapsed / 1_000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function CourseImportRunDetailView({
  detail,
}: {
  detail: CourseImportRunDetail;
}) {
  const { run } = detail;
  const active = run.status === "queued" || run.status === "running";

  return (
    <AppShell admin currentBreadcrumbLabel={`${run.academicYear} course run`}>
      <CourseImportAutoRefresh active={active} />
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
        <h1 className="sr-only">{run.academicYear} course import run</h1>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={statusTone(run.status)}>{readable(run.status)}</Badge>
            <span className="font-mono text-xs text-zinc-500">{run.id}</span>
            <time className="text-xs text-zinc-500" dateTime={run.createdAt}>
              {dateFormatter.format(new Date(run.createdAt))}
            </time>
          </div>
          {active ? <CourseImportRunRecovery runId={run.id} /> : null}
        </header>

        {active ? (
          <Alert tone="brand">
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
            <AlertDescription>
              This page updates automatically. The worker continues if the
              browser closes.
            </AlertDescription>
          </Alert>
        ) : null}
        {run.errorSummary ? (
          <Alert tone="danger">
            <AlertDescription>{run.errorSummary}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            label="Processed"
            value={`${run.processedCount} / ${run.targetCount}`}
          />
          <StatTile label="Ready for review" value={run.readyForReviewCount} />
          <StatTile label="Unchanged" value={run.unchangedCount} />
          <StatTile label="Failed" value={run.failedCount} />
          <StatTile
            label="Duration"
            value={duration(run.startedAt, run.completedAt)}
          />
        </div>

        <dl className="grid gap-x-6 gap-y-3 border-y border-zinc-200 py-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-zinc-500">Model</dt>
            <dd className="mt-1 font-mono break-all text-zinc-800">
              {run.requestedModel}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tokens</dt>
            <dd className="mt-1 text-zinc-800 tabular-nums">
              {run.inputTokens.toLocaleString("en-AU")} in ·{" "}
              {run.outputTokens.toLocaleString("en-AU")} out
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Cost</dt>
            <dd className="mt-1 text-zinc-800 tabular-nums">
              {usd(run.actualCostUsd)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Pipeline</dt>
            <dd className="mt-1 font-mono text-zinc-800">
              {run.parserVersion}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Prompt / schema</dt>
            <dd className="mt-1 font-mono text-zinc-800">
              {run.promptVersion} · {run.schemaVersion}
            </dd>
          </div>
        </dl>

        <DataTableShell>
          <Table className="min-w-[980px]">
            <TableCaption>Course targets in this import run</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Course</TableHead>
                <TableHead>Processing</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.targets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell>
                    <span className="font-mono font-medium text-zinc-950">
                      {target.courseCode}
                    </span>
                    {target.errorSummary ? (
                      <span className="mt-1 block max-w-64 truncate text-xs text-rose-700">
                        {target.errorSummary}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge tone={statusTone(target.processingStatus)}>
                      {readable(target.processingStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge tone={statusTone(target.reviewStatus)}>
                      {readable(target.reviewStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-600">
                    {target.changeKind ? readable(target.changeKind) : "—"}
                  </TableCell>
                  <TableCell className="max-w-48 truncate font-mono text-[11px] text-zinc-600">
                    {target.extraction?.resolvedModel ??
                      target.extraction?.requestedModel ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                    {target.extraction
                      ? (
                          target.extraction.inputTokens +
                          target.extraction.outputTokens
                        ).toLocaleString("en-AU")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                    {target.extraction ? usd(target.extraction.costUsd) : "—"}
                  </TableCell>
                  <TableCell>
                    {target.extraction ? (
                      <Badge
                        tone={
                          target.extraction.validationStatus === "valid"
                            ? "success"
                            : target.extraction.validationStatus === "invalid"
                              ? "danger"
                              : "info"
                        }
                      >
                        {readable(target.extraction.validationStatus)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      aria-label={`Open ${target.courseCode} import target`}
                      className="inline-grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                      href={`/admin/imports/runs/${run.id}/targets/${target.id}`}
                    >
                      <ArrowUpRight aria-hidden="true" size={15} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    </AppShell>
  );
}
