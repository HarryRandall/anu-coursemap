import type { ImportRunDetail } from "@/components/admin/imports/import-detail-data";
import { Badge } from "@/components/ui/badge";
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
import { StatTile } from "@/components/ui/stat-tile";
import type { Tone } from "@/lib/ui";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

function statusTone(status: string): Tone {
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "queued" || status === "running") return "info";
  return "success";
}

function duration({ completedAt, startedAt }: ImportRunDetail["run"]) {
  if (!completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1_000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function RunDetail({ detail }: { detail: ImportRunDetail }) {
  const { diagnostics, run } = detail;
  const warnings = diagnostics.length - run.errorCount;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-10">
      {/*
        No back link and no visible heading. The breadcrumb states the trail and
        carries this run's time as its final crumb, so both would be a second
        copy of navigation the shell already provides.
      */}
      <h1 className="sr-only">
        {run.type} import, {dateFormatter.format(new Date(run.startedAt))}
      </h1>

      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone={statusTone(run.status)}>
          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
        </Badge>
        <span className="text-sm text-zinc-700">{run.type}</span>
        <time
          className="text-[13px] text-zinc-500 tabular-nums"
          dateTime={run.startedAt}
        >
          {dateFormatter.format(new Date(run.startedAt))}
        </time>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Checked" value={run.checkedCount} />
        <StatTile label="Changed" value={run.addedCount + run.changedCount} />
        <StatTile label="Failed" value={run.failedCount} />
        <StatTile label="Duration" value={duration(run)} />
      </div>

      <dl className="grid gap-3 border-y border-zinc-200 py-4 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Adapter</dt>
          <dd className="mt-0.5 font-mono break-all text-zinc-800">
            {run.adapter}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Catalogue year</dt>
          <dd className="mt-0.5 text-zinc-800 tabular-nums">{run.year}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Source pages</dt>
          <dd className="mt-0.5 text-zinc-800 tabular-nums">
            {run.sourcePageCount}
          </dd>
        </div>
      </dl>

      {run.errorOutput ? (
        <div>
          <p className="text-[13px] text-zinc-500">Error output</p>
          <pre className="mt-1 font-sans text-[13px] whitespace-pre-wrap text-rose-800">
            {run.errorOutput}
          </pre>
        </div>
      ) : null}

      <section className="space-y-3" aria-labelledby="parser-notes">
        {/*
          The paragraph that used to sit here explained to an operator what a
          parser note is and where catalogue changes live instead. The heading
          and the empty state already say it.
        */}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-900" id="parser-notes">
            Parser notes
          </h2>
          {run.errorCount > 0 ? (
            <Badge size="sm" tone="danger">
              {run.errorCount} error{run.errorCount === 1 ? "" : "s"}
            </Badge>
          ) : null}
          {warnings > 0 ? (
            <Badge size="sm" tone="warning">
              {warnings} warning{warnings === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>

        <DataTableShell>
          {diagnostics.length === 0 ? (
            <DataTableEmpty
              description="Every page in this run parsed cleanly."
              title="No parser notes"
            />
          ) : (
            <Table className="min-w-[720px]">
              <TableCaption>Parser diagnostics for this run</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[104px]">Severity</TableHead>
                  <TableHead className="w-[124px]">Course</TableHead>
                  <TableHead className="w-[264px]">Issue</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diagnostics.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge
                        size="sm"
                        tone={entry.severity === "error" ? "danger" : "warning"}
                      >
                        {entry.severity === "error" ? "Error" : "Warning"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-zinc-700">
                      {entry.courseCode ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-zinc-500">
                      {entry.issueCode}
                    </TableCell>
                    <TableCell className="text-zinc-700">
                      {entry.summary}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableShell>
      </section>
    </div>
  );
}
