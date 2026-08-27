"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ImportFlag,
  ImportFlagCategory,
  ImportFlagStatus,
} from "@/components/admin/imports/imports-overview-data";
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
import type { Tone } from "@/lib/ui";

const absoluteDateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function relativeTime(value: string) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const absolute = Math.abs(seconds);
  if (absolute < 60) {
    return relativeTimeFormatter.format(Math.round(seconds), "second");
  }
  if (absolute < 3_600) {
    return relativeTimeFormatter.format(Math.round(seconds / 60), "minute");
  }
  if (absolute < 86_400) {
    return relativeTimeFormatter.format(Math.round(seconds / 3_600), "hour");
  }
  return relativeTimeFormatter.format(Math.round(seconds / 86_400), "day");
}

function categoryTone(category: ImportFlagCategory): Tone {
  if (category === "Discontinued") return "danger";
  if (category === "Units" || category === "Code changed") return "info";
  return "warning";
}

const STATUS_LABELS: Record<ImportFlagStatus, string> = {
  accepted: "Accepted",
  open: "Open",
  rejected: "Dismissed",
  resolved: "Resolved",
};

/**
 * Renders the change itself rather than a sentence about it: the value that was
 * held, struck through, then the value the source now states. A reviewer can
 * triage the list without opening a single row.
 */
function ChangeSummary({ flag }: { flag: ImportFlag }) {
  if (flag.oldValue === null && flag.newValue === null) {
    return <span className="text-zinc-500">{flag.summary}</span>;
  }
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      {flag.oldValue !== null ? (
        <span className="min-w-0 shrink truncate text-zinc-400 line-through">
          {flag.oldValue}
        </span>
      ) : (
        <span className="shrink-0 text-zinc-400">Not previously held</span>
      )}
      <span aria-hidden="true" className="shrink-0 text-zinc-300">
        →
      </span>
      {flag.newValue !== null ? (
        <span className="min-w-0 flex-1 truncate text-zinc-900">
          {flag.newValue}
        </span>
      ) : (
        <span className="shrink-0 text-zinc-500 italic">
          Removed from source
        </span>
      )}
    </span>
  );
}

export function ChangesQueue({ flags }: { flags: ImportFlag[] }) {
  const [showResolved, setShowResolved] = useState(false);

  const openFlags = useMemo(
    () => flags.filter((flag) => flag.status === "open"),
    [flags],
  );
  const visibleFlags = showResolved ? flags : openFlags;
  const resolvedCount = flags.length - openFlags.length;

  return (
    <div className="space-y-3">
      {/*
        The queue holds catalogue changes only, so it stays small. A search box,
        a year select and a date range for a handful of rows was more chrome
        than content.
      */}
      {resolvedCount > 0 ? (
        <div className="flex items-center gap-2">
          <Button
            aria-pressed={showResolved}
            onClick={() => setShowResolved((current) => !current)}
            size="sm"
            variant={showResolved ? "secondary" : "ghost"}
          >
            {showResolved
              ? `Showing all ${flags.length}`
              : `Show ${resolvedCount} resolved`}
          </Button>
        </div>
      ) : null}

      {visibleFlags.length === 0 ? (
        <DataTableShell>
          <DataTableEmpty
            description={
              resolvedCount > 0
                ? "Every change from the last import has been reviewed."
                : "Imports have not found any catalogue changes needing review."
            }
            title="Nothing to review"
          />
        </DataTableShell>
      ) : (
        <DataTableShell>
          <Table className="min-w-[760px]">
            <TableCaption>Catalogue changes awaiting review</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[132px]">Course</TableHead>
                <TableHead className="w-[124px]">Area</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="w-[112px]">Detected</TableHead>
                <TableHead className="w-[92px] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFlags.map((flag) => (
                <TableRow key={flag.id}>
                  {/*
                    The link wraps the cell contents, not the row: an <a> cannot
                    contain <td> elements.
                  */}
                  <TableCell className="p-0">
                    <Link
                      className="flex h-full items-center px-4 py-3 font-mono text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:outline-none focus-visible:ring-inset"
                      href={`/admin/imports/changes/${flag.id}`}
                    >
                      {flag.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge tone={categoryTone(flag.category)}>
                      {flag.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-0">
                    <ChangeSummary flag={flag} />
                  </TableCell>
                  <TableCell className="text-[13px] text-zinc-500">
                    <time
                      dateTime={flag.detectedAt}
                      title={absoluteDateFormatter.format(
                        new Date(flag.detectedAt),
                      )}
                    >
                      {relativeTime(flag.detectedAt)}
                    </time>
                  </TableCell>
                  <TableCell className="text-right">
                    {flag.status === "open" ? (
                      <Link
                        className="text-[13px] font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:outline-none"
                        href={`/admin/imports/changes/${flag.id}`}
                      >
                        Review
                      </Link>
                    ) : (
                      <Badge
                        size="sm"
                        tone={
                          flag.status === "rejected" ? "neutral" : "success"
                        }
                      >
                        {STATUS_LABELS[flag.status]}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
