import Link from "next/link";
import type { ImportRun } from "@/components/admin/imports/imports-overview-data";
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
import { cn } from "@/lib/cn";

const TIME_ZONE = "Australia/Sydney";

/** en-CA yields an ISO-shaped YYYY-MM-DD, which sorts and compares directly. */
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: TIME_ZONE,
  year: "numeric",
});

const dayLabelFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-AU", {
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/**
 * Calendar arithmetic on the key rather than subtracting 24 hours from the
 * clock, which lands on the wrong day either side of a daylight-saving change.
 */
function previousDayKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

type DayGroup = { key: string; label: string; runs: ImportRun[] };

/**
 * The runs arrive newest first, so a day breaks as soon as the key changes and
 * no sorting or bucketing map is needed.
 */
function groupByDay(runs: ImportRun[]): DayGroup[] {
  const today = dayKeyFormatter.format(new Date());
  const yesterday = previousDayKey(today);
  const groups: DayGroup[] = [];

  for (const run of runs) {
    const date = new Date(run.startedAt);
    const key = dayKeyFormatter.format(date);
    const current = groups.at(-1);
    if (current?.key === key) {
      current.runs.push(run);
      continue;
    }
    groups.push({
      key,
      label:
        key === today
          ? "Today"
          : key === yesterday
            ? "Yesterday"
            : dayLabelFormatter.format(date),
      runs: [run],
    });
  }

  return groups;
}

/**
 * What the run actually did, in words that differ between a one-course re-pull
 * and an eighty-page programme sweep. Reporting raw counts made every row read
 * "1 checked, 1 changed" and distinguished nothing.
 */
function outcome(run: ImportRun) {
  if (run.status === "failed") return run.errorOutput ?? "Import failed";
  const changed = run.addedCount + run.changedCount;
  if (run.checkedCount <= 1) return changed > 0 ? "Updated" : "No change";
  if (changed === 0) return `${run.checkedCount} checked, no change`;
  return `${changed} of ${run.checkedCount} updated`;
}

/**
 * The codes carry the identity of the run, so they lead. A programme sweep
 * touches too many to list, and its page count is the honest summary.
 */
function Scope({ run }: { run: ImportRun }) {
  if (run.type === "Directory courses" || run.type === "Directory programmes") {
    return (
      <span className="text-zinc-800">
        {run.type}
        <span className="text-zinc-500"> · {run.year}</span>
      </span>
    );
  }

  if (run.courseCodes.length === 0) {
    return (
      <span className="text-zinc-500">
        {run.sourcePageCount} {run.sourcePageCount === 1 ? "page" : "pages"}
      </span>
    );
  }

  const shown = run.courseCodes.slice(0, 3);
  const remaining = run.courseCodes.length - shown.length;
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="min-w-0 truncate font-mono text-zinc-800">
        {shown.join(" ")}
      </span>
      {remaining > 0 ? (
        <span className="shrink-0 text-zinc-500 tabular-nums">
          +{remaining}
        </span>
      ) : null}
    </span>
  );
}

export function RecentRuns({ runs }: { runs: ImportRun[] }) {
  if (runs.length === 0) {
    return (
      <DataTableShell>
        <DataTableEmpty
          description="Refresh the directory or import a course or programme and the run will appear here."
          title="No imports yet"
        />
      </DataTableShell>
    );
  }

  return (
    <DataTableShell>
      <Table className="min-w-[640px]">
        <TableCaption>Catalogue import runs, most recent first</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[72px]">Time</TableHead>
            <TableHead>Pages</TableHead>
            <TableHead className="w-[200px]">Outcome</TableHead>
            <TableHead className="w-[124px] text-right">Notes</TableHead>
          </TableRow>
        </TableHeader>
        {groupByDay(runs).map((group) => (
          <TableBody key={group.key}>
            <TableRow className="hover:bg-transparent">
              {/*
                A heading row rather than a second table per day: the columns
                must stay aligned down the whole list. Each day is its own
                tbody, so the heading scopes to that row group.
              */}
              <th
                className="bg-zinc-50/60 px-4 py-1.5 text-left text-[11px] font-medium tracking-wide text-zinc-500 uppercase"
                colSpan={4}
                scope="rowgroup"
              >
                {group.label}
              </th>
            </TableRow>
            {group.runs.map((run) => (
              <TableRow key={run.id}>
                {/*
                  The link wraps the cell content rather than the row: an <a>
                  cannot contain <td>s, and a row-level click handler would take
                  the keyboard affordance away from the link.
                */}
                <TableCell className="p-0">
                  <Link
                    className="flex h-full items-center px-4 py-3 text-zinc-500 tabular-nums focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:outline-none focus-visible:ring-inset"
                    href={`/admin/imports/sync/${run.id}`}
                  >
                    <time dateTime={run.startedAt}>
                      {timeFormatter.format(new Date(run.startedAt))}
                    </time>
                  </Link>
                </TableCell>
                <TableCell className="max-w-0">
                  <Scope run={run} />
                </TableCell>
                <TableCell
                  className={cn(
                    "max-w-0 truncate text-zinc-600",
                    run.status === "failed" && "text-rose-700",
                  )}
                >
                  {/*
                    Reported by exception. A green "Succeeded" pill on every one
                    of twenty rows is decoration, not information.
                  */}
                  {run.status === "succeeded" ? (
                    outcome(run)
                  ) : (
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge
                        size="sm"
                        tone={
                          run.status === "failed" || run.status === "cancelled"
                            ? "danger"
                            : "info"
                        }
                      >
                        {run.status.charAt(0).toUpperCase() +
                          run.status.slice(1)}
                      </Badge>
                      <span className="min-w-0 truncate">{outcome(run)}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {/*
                    "Notes", not "flagged". These are parser observations that
                    belong to the run; the catalogue changes an operator accepts
                    or dismisses live on the Changes page. Calling both "flags"
                    is what made the two lists appear to disagree.
                  */}
                  {run.diagnostics.length > 0 ? (
                    <Badge
                      size="sm"
                      tone={run.errorCount > 0 ? "danger" : "warning"}
                    >
                      {run.diagnostics.length}{" "}
                      {run.diagnostics.length === 1 ? "note" : "notes"}
                    </Badge>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        ))}
      </Table>
    </DataTableShell>
  );
}
