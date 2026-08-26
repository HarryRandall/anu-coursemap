import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleDot,
  Plus,
} from "lucide-react";
import { Suspense } from "react";
import type {
  ImportReviewRow,
  ImportReviewStatus,
  ImportsDashboardData,
} from "@/components/admin/imports/imports-overview-data";
import { AdminListControls } from "@/components/admin/admin-list-controls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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

const reviewLabels: Record<ImportReviewStatus, string> = {
  blocked: "Blocked",
  failed: "Failed",
  "needs-review": "Review",
  ready: "Ready",
};

const reviewTones: Record<ImportReviewStatus, Tone> = {
  blocked: "danger",
  failed: "danger",
  "needs-review": "warning",
  ready: "brand",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function progress(data: ImportsDashboardData) {
  if (!data.run) return null;
  if (data.run.expectedCount) {
    return Math.min(
      100,
      Math.round((data.run.checkedCount / data.run.expectedCount) * 100),
    );
  }
  return data.run.completedAt ? 100 : null;
}

function ImportStatus({
  issue,
  status,
}: {
  issue?: string;
  status: ImportReviewStatus;
}) {
  const label = reviewLabels[status];
  return (
    <span
      aria-label={issue ? `${label}: ${issue}` : label}
      className="inline-flex"
      title={issue}
    >
      <Badge
        tone={reviewTones[status]}
        className="h-8 w-28 justify-center text-xs"
      >
        {status === "ready" ? (
          <Check aria-hidden="true" />
        ) : status === "needs-review" ? (
          <CircleDot aria-hidden="true" />
        ) : (
          <AlertTriangle aria-hidden="true" />
        )}
        {label}
      </Badge>
    </span>
  );
}

function ReviewTable({ rows }: { rows: ImportReviewRow[] }) {
  return (
    <DataTableShell>
      <Suspense
        fallback={<div className="h-[65px] border-b border-zinc-200/80" />}
      >
        <AdminListControls
          searchPlaceholder="Search courses"
          statuses={[
            { label: "All statuses", value: "all" },
            { label: "Ready", value: "ready" },
            { label: "Needs review", value: "needs-review" },
            { label: "Blocked", value: "blocked" },
            { label: "Failed", value: "failed" },
          ]}
        />
      </Suspense>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Course</TableHead>
            <TableHead className="hidden text-center sm:table-cell">
              Year
            </TableHead>
            <TableHead className="hidden text-center lg:table-cell">
              Sources
            </TableHead>
            <TableHead className="hidden md:table-cell">Change</TableHead>
            <TableHead className="hidden lg:table-cell">Checked</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="p-0">
                <DataTableEmpty
                  title="Nothing is waiting on you"
                  description="Courses appear here when an import finds a change that a person needs to confirm."
                />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={`${row.year}:${row.code}`} className="group">
                <TableCell>
                  <Link
                    href={row.href}
                    className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-sm font-semibold text-zinc-700">
                        {row.code}
                      </span>
                      <span className="font-medium text-zinc-950">
                        {row.title}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500 md:hidden">
                      {row.detail}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="hidden text-center font-medium tabular-nums sm:table-cell">
                  {row.year}
                </TableCell>
                <TableCell
                  className="hidden text-center lg:table-cell"
                  title={row.sourceSummary}
                >
                  <span className="border-b border-dotted border-zinc-400 font-semibold tabular-nums">
                    {row.sourceCount}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {row.detail}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-zinc-500 lg:table-cell">
                  {formatDate(row.checkedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <ImportStatus issue={row.issue} status={row.status} />
                </TableCell>
                <TableCell>
                  <Link
                    href={row.href}
                    aria-label={`Review ${row.code} ${row.title}`}
                    className="grid size-9 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:outline-none"
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
  );
}

export function ImportsOverview({
  data,
  rows,
}: {
  data: ImportsDashboardData;
  rows: ImportReviewRow[];
}) {
  const percentage = progress(data);
  const ready = data.review.filter((row) => row.status === "ready").length;
  const attention = data.review.filter((row) =>
    ["blocked", "failed", "needs-review"].includes(row.status),
  ).length;
  const runInProgress =
    data.run?.status === "running" && data.run.completedAt === null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Imports
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Bring course and programme pages in from ANU Programs and Courses.
            Everything arrives as a draft, so nothing reaches students until it
            is reviewed and published.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {runInProgress ? (
            <ButtonLink href="/admin/imports/activity" size="lg">
              <CircleDot size={17} aria-hidden="true" />
              View progress
            </ButtonLink>
          ) : null}
          <ButtonLink href="/admin/imports/new" variant="primary" size="lg">
            <Plus size={17} aria-hidden="true" />
            New import
          </ButtonLink>
        </div>
      </header>

      {data.error ? (
        <Alert tone="danger">
          <AlertTriangle aria-hidden="true" />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
        {data.run ? (
          <>
            <div className="flex flex-col gap-5 px-5 py-4 lg:flex-row lg:items-center">
              <Link
                href="/admin/imports/activity"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <span
                  className={`size-2.5 shrink-0 rounded-full ${
                    runInProgress
                      ? "bg-brand-600 ring-4 ring-brand-100"
                      : "bg-emerald-600 ring-4 ring-emerald-100"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <strong className="block truncate text-base font-semibold text-zinc-950">
                    {runInProgress
                      ? "Import running now"
                      : `Last import: ${data.run.scopeLabel}`}
                  </strong>
                  <span className="mt-0.5 block text-sm text-zinc-500">
                    {data.run.checkedCount}
                    {data.run.expectedCount
                      ? ` of ${data.run.expectedCount}`
                      : ""}{" "}
                    pages read from {data.run.sourceName} for the{" "}
                    {data.run.year} catalogue
                  </span>
                </span>
              </Link>
              <dl className="grid grid-cols-3 divide-x divide-zinc-200 lg:w-[26rem]">
                <div className="px-3 text-center">
                  <dt className="text-xs text-zinc-500">Added or changed</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {data.run.addedCount + data.run.changedCount}
                  </dd>
                </div>
                <div className="px-3 text-center">
                  <dt className="text-xs text-zinc-500">Ready to publish</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{ready}</dd>
                </div>
                <div className="px-3 text-center">
                  <dt className="text-xs text-zinc-500">Needs a person</dt>
                  <dd
                    className={`mt-0.5 font-semibold tabular-nums ${
                      attention > 0 ? "text-rose-700" : "text-zinc-950"
                    }`}
                  >
                    {attention}
                  </dd>
                </div>
              </dl>
              {runInProgress && percentage !== null ? (
                <strong className="text-2xl font-semibold tracking-tight tabular-nums lg:w-20 lg:text-right">
                  {percentage}%
                </strong>
              ) : null}
            </div>
            {runInProgress && percentage !== null ? (
              <div
                className="h-1 bg-zinc-100"
                role="progressbar"
                aria-label="Import progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
              >
                <div
                  className="h-full bg-brand-600 transition-[width] motion-reduce:transition-none"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            ) : null}
          </>
        ) : (
          <DataTableEmpty
            title="No imports yet"
            description="Start an import to pull course pages in from ANU."
          />
        )}
      </Card>

      <section aria-labelledby="review-heading" className="space-y-3">
        <div>
          <h2
            id="review-heading"
            className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-zinc-950"
          >
            <span>Needs your review</span>
            {data.review.length > 0 ? (
              <span className="text-base font-normal text-zinc-500">
                {data.review.length}
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {data.review.length === 0 ? (
              <>
                Nothing is queued.{" "}
                <Link
                  className="font-medium text-brand-700 hover:text-brand-900"
                  href="/admin/imports/activity"
                >
                  See what the last import did
                </Link>
                .
              </>
            ) : (
              <>
                {ready} ready to publish · {attention} still need a decision
              </>
            )}
          </p>
        </div>
        <ReviewTable rows={rows} />
      </section>
    </div>
  );
}
