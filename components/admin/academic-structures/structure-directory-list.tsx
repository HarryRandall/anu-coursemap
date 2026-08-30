"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  ExternalLink,
  History,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { readImportStream } from "@/components/admin/imports/import-stream";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import type {
  AcademicStructureDirectoryPage,
  AcademicStructureDirectoryRecord,
  AcademicStructureYearOption,
} from "@/lib/coursemap/admin-academic-structures";
import type { AcademicStructureKind } from "@/lib/structure-import/contract";
import type { Tone } from "@/lib/ui";

const KIND_DETAILS = {
  programme: {
    label: "Programmes",
    singular: "programme",
    plural: "programmes",
  },
  major: { label: "Majors", singular: "major", plural: "majors" },
  minor: { label: "Minors", singular: "minor", plural: "minors" },
  specialisation: {
    label: "Specialisations",
    singular: "specialisation",
    plural: "specialisations",
  },
} as const satisfies Record<
  AcademicStructureKind,
  { label: string; singular: string; plural: string }
>;

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Australia/Sydney",
});

function availabilityTone(
  value: AcademicStructureYearOption["sourceAvailability"],
): Tone {
  if (value === "available") return "success";
  if (value === "unavailable") return "danger";
  return "neutral";
}

function statusTone(
  status: AcademicStructureDirectoryRecord["importStatus"],
): Tone {
  if (status === "failed") return "danger";
  if (status === "queued" || status === "processing") return "info";
  if (status === "needs-review") return "warning";
  if (status === "draft" || status === "draft-changes") return "brand";
  if (status === "published") return "success";
  return "neutral";
}

function statusLabel(status: AcademicStructureDirectoryRecord["importStatus"]) {
  if (status === "needs-review") return "Needs review";
  if (status === "directory") return "Not imported";
  if (status === "draft-changes") return "Draft changes";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function reviewLabel(status: string) {
  if (status === "needs_review") return "Needs review";
  if (status === "not_required") return "Not required";
  return status.replaceAll("_", " ");
}

function reviewTone(status: string): Tone {
  if (status === "needs_review" || status === "pending") return "warning";
  if (status === "accepted" || status === "unchanged") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

type DirectoryRefreshResult = {
  status: "succeeded" | "failed";
  counts: { checked: number; failed: number };
  warningCount: number;
  errorCount: number;
  receivedItemCount: number;
  uniqueItemCount: number;
};

function directoryRefreshResult(value: unknown): DirectoryRefreshResult | null {
  if (typeof value !== "object" || value === null) return null;
  const result = value as Record<string, unknown>;
  const counts = result.counts;
  if (
    (result.status !== "succeeded" && result.status !== "failed") ||
    typeof counts !== "object" ||
    counts === null
  ) {
    return null;
  }
  const countValues = counts as Record<string, unknown>;
  if (
    typeof countValues.checked !== "number" ||
    typeof countValues.failed !== "number" ||
    typeof result.warningCount !== "number" ||
    typeof result.errorCount !== "number" ||
    typeof result.receivedItemCount !== "number" ||
    typeof result.uniqueItemCount !== "number"
  ) {
    return null;
  }
  return {
    status: result.status,
    counts: {
      checked: countValues.checked,
      failed: countValues.failed,
    },
    warningCount: result.warningCount,
    errorCount: result.errorCount,
    receivedItemCount: result.receivedItemCount,
    uniqueItemCount: result.uniqueItemCount,
  };
}

function shouldOpenLatestImport(record: AcademicStructureDirectoryRecord) {
  const latest = record.latestImport;
  if (!latest) return false;
  return (
    latest.reviewStatus === "pending" ||
    latest.reviewStatus === "needs_review" ||
    latest.reviewStatus === "unchanged" ||
    ["queued", "running", "failed", "cancelled"].includes(
      latest.processingStatus,
    )
  );
}

function structureDetails(record: AcademicStructureDirectoryRecord) {
  if (record.kind === "programme") {
    const details = [
      record.durationYears === null ? null : `${record.durationYears} years`,
      record.selectionRank === null
        ? null
        : `Rank ${record.selectionRank.toLocaleString("en-AU")}`,
    ].filter(Boolean);
    return details.length > 0 ? details.join(" · ") : "-";
  }
  return record.units === null ? "-" : `${record.units} units`;
}

function DirectoryTabs({
  activeKind,
  year,
}: {
  activeKind: AcademicStructureKind;
  year: number;
}) {
  return (
    <div className="overflow-x-auto border-b border-zinc-200">
      <nav
        aria-label="Academic structure type"
        className="flex min-w-max gap-5"
      >
        {(Object.keys(KIND_DETAILS) as AcademicStructureKind[]).map((kind) => {
          const active = kind === activeKind;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-11 items-center border-b-2 px-0.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
              }`}
              href={`/admin/programmes?kind=${kind}&year=${year}`}
              key={kind}
            >
              {KIND_DETAILS[kind].label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function ReviewStatus({
  record,
}: {
  record: AcademicStructureDirectoryRecord;
}) {
  const status = record.latestImport?.reviewStatus;
  if (!status || status === "not_required") {
    return <span className="text-xs text-zinc-400">None</span>;
  }
  return <Badge tone={reviewTone(status)}>{reviewLabel(status)}</Badge>;
}

export function StructureDirectoryList({
  canImport,
  data,
  modelOptions,
  queueEnabled,
  searchParams,
}: {
  canImport: boolean;
  data: AcademicStructureDirectoryPage;
  modelOptions: string[];
  queueEnabled: boolean;
  searchParams: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [model, setModel] = useState(modelOptions[0] ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "danger" | "warning";
    text: string;
  } | null>(null);
  const labels = KIND_DETAILS[data.kind];

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const eligibleRecords = data.records.filter((record) => record.isAvailable);
  const allPageSelected =
    eligibleRecords.length > 0 &&
    eligibleRecords.every((record) => selectedSet.has(record.code));
  const somePageSelected = eligibleRecords.some((record) =>
    selectedSet.has(record.code),
  );

  function chooseYear(year: number) {
    router.replace(`/admin/programmes?kind=${data.kind}&year=${year}`);
  }

  function toggleStructure(code: string, checked: boolean) {
    setNotice(null);
    setSelected((current) => {
      if (!checked) return current.filter((value) => value !== code);
      if (current.includes(code)) return current;
      if (current.length >= 10) {
        setNotice({
          tone: "warning",
          text: `A testing run can contain no more than 10 ${labels.plural}.`,
        });
        return current;
      }
      return [...current, code];
    });
  }

  function togglePage(checked: boolean) {
    setNotice(null);
    const pageCodes = new Set(eligibleRecords.map((record) => record.code));
    if (!checked) {
      setSelected((current) => current.filter((code) => !pageCodes.has(code)));
      return;
    }
    setSelected((current) =>
      [
        ...new Set([
          ...current,
          ...eligibleRecords.map((record) => record.code),
        ]),
      ].slice(0, 10),
    );
    if (eligibleRecords.length + selected.length > 10) {
      setNotice({
        tone: "warning",
        text: `Selected the first available ${labels.plural} up to the 10-item testing limit.`,
      });
    }
  }

  async function refreshDirectory() {
    setRefreshing(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/academic-structure-directory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          academicYear: data.year.year,
          structureKind: data.kind,
        }),
      });
      let result: DirectoryRefreshResult | null = null;
      await readImportStream(response, (event) => {
        if (event.type === "complete") {
          result = directoryRefreshResult(event.result);
        }
      });
      router.refresh();
      if (!result) {
        throw new Error(
          `The ${labels.singular} directory returned no completion result.`,
        );
      }
      const completed: DirectoryRefreshResult = result;
      if (completed.status === "failed") {
        setNotice({
          tone: completed.counts.checked === 0 ? "warning" : "danger",
          text:
            completed.counts.checked === 0
              ? `ANU returned no usable ${labels.singular} directory data for ${data.year.year}. Existing entries were preserved.`
              : `The ${data.year.year} ${labels.singular} directory found ${completed.errorCount || completed.counts.failed} error${(completed.errorCount || completed.counts.failed) === 1 ? "" : "s"}. Usable rows were saved and missing existing entries were preserved.`,
        });
      } else if (completed.warningCount > 0) {
        setNotice({
          tone: "warning",
          text: `${data.year.year} ${labels.singular} directory refreshed with ${completed.warningCount} warning${completed.warningCount === 1 ? "" : "s"}. ${completed.receivedItemCount.toLocaleString("en-AU")} rows produced ${completed.uniqueItemCount.toLocaleString("en-AU")} unique entries.`,
        });
      } else {
        setNotice({
          tone: "success",
          text: `${data.year.year} ${labels.singular} directory refreshed with ${completed.uniqueItemCount.toLocaleString("en-AU")} entries. No detailed records were imported.`,
        });
      }
    } catch (error) {
      router.refresh();
      const message =
        error instanceof Error
          ? error.message
          : `The ${labels.singular} directory could not be refreshed.`;
      const unavailable =
        /(?:HTTP\s+(?:404|410)|no .*directory|no .*data)/iu.test(message);
      setNotice({
        tone: unavailable ? "warning" : "danger",
        text: unavailable
          ? `ANU has no ${labels.singular} directory data for ${data.year.year}. Existing entries were preserved.`
          : message,
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function startImport() {
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/academic-structure-imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          academicYear: data.year.year,
          structureKind: data.kind,
          structureCodes: selected,
          requestedModel: model,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        runId?: string;
        runNumber?: number;
      } | null;
      if (!response.ok) {
        if (payload?.runId) {
          router.push(`/admin/imports/structures/runs/${payload.runId}`);
          return;
        }
        throw new Error(
          payload?.error ??
            `The ${labels.singular} import could not be queued.`,
        );
      }
      if (!payload?.runId || typeof payload.runNumber !== "number") {
        throw new Error("The import run number was not returned.");
      }
      router.push(`/admin/imports/structures/runs/${payload.runId}`);
    } catch (error) {
      setNotice({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : `The ${labels.singular} import could not be queued.`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const importDisabledReason = !canImport
    ? "Academic structure import permission is required."
    : !queueEnabled
      ? "Background academic structure imports are not enabled in this deployment."
      : data.activeRun
        ? `Wait for run ${data.activeRun.runNumber} to finish before starting another.`
        : !data.year.importEnabled
          ? "This academic year is not enabled for imports."
          : data.year.sourceAvailability === "unavailable"
            ? `ANU has no ${labels.singular} directory data for this academic year.`
            : selected.length === 0
              ? `Select at least one ${labels.singular}.`
              : !model
                ? "No OpenRouter model is configured."
                : null;

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Academic structures</h1>

        <DirectoryTabs activeKind={data.kind} year={data.year.year} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-32">
              <Select
                aria-label="Academic year"
                onChange={chooseYear}
                options={data.years.map((year) => ({
                  label: String(year.year),
                  value: year.year,
                }))}
                value={data.year.year}
              />
            </div>
            <Badge tone={availabilityTone(data.year.sourceAvailability)}>
              {data.year.sourceAvailability === "available"
                ? "Directory available"
                : data.year.sourceAvailability === "unavailable"
                  ? "No ANU data"
                  : "Availability unknown"}
            </Badge>
            {data.year.uniqueCount !== null ? (
              <span className="text-xs text-zinc-500 tabular-nums">
                {data.year.uniqueCount.toLocaleString("en-AU")} entries
                {data.year.receivedCount !== null &&
                data.year.receivedCount !== data.year.uniqueCount
                  ? ` from ${data.year.receivedCount.toLocaleString("en-AU")} rows`
                  : ""}
              </span>
            ) : null}
            {data.year.directoryRefreshedAt ? (
              <span className="text-xs text-zinc-500">
                Refreshed{" "}
                {dateFormatter.format(new Date(data.year.directoryRefreshedAt))}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/admin/imports/structures/runs" size="md">
              <History aria-hidden="true" size={15} />
              Import runs
            </ButtonLink>
            <Button
              disabled={!canImport || refreshing}
              onClick={() => void refreshDirectory()}
              size="md"
              title="Fetch code and title rows only"
            >
              <RefreshCw
                aria-hidden="true"
                className={
                  refreshing ? "animate-spin motion-reduce:animate-none" : ""
                }
                size={15}
              />
              {refreshing ? "Refreshing..." : "Refresh directory"}
            </Button>
          </div>
        </div>

        {data.year.availabilityNote ? (
          <Alert
            tone={
              data.year.sourceAvailability === "unavailable"
                ? "warning"
                : "neutral"
            }
          >
            <AlertDescription>{data.year.availabilityNote}</AlertDescription>
          </Alert>
        ) : null}

        {!queueEnabled ? (
          <Alert tone="warning">
            <AlertDescription>
              Detailed imports are disabled until
              COURSEMAP_QUEUE_IMPORTS_ENABLED is configured.
            </AlertDescription>
          </Alert>
        ) : null}

        {data.activeRun ? (
          <Alert tone="brand">
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
            <AlertDescription>
              <Link
                className="font-medium underline underline-offset-2"
                href={`/admin/imports/structures/runs/${data.activeRun.id}`}
              >
                Run {data.activeRun.runNumber}
              </Link>{" "}
              is {data.activeRun.status} for{" "}
              {KIND_DETAILS[data.activeRun.structureKind].plural} (
              {data.activeRun.processedCount} of {data.activeRun.targetCount}{" "}
              processed).
            </AlertDescription>
          </Alert>
        ) : null}

        {notice ? (
          <Alert role="status" tone={notice.tone}>
            <AlertDescription>{notice.text}</AlertDescription>
          </Alert>
        ) : null}

        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              allLabel: `All ${labels.plural}`,
              options: [
                { label: "Not imported", value: "directory" },
                { label: "Queued", value: "queued" },
                { label: "Processing", value: "processing" },
                { label: "Needs review", value: "needs-review" },
                { label: "Draft", value: "draft" },
                { label: "Draft changes", value: "draft-changes" },
                { label: "Published", value: "published" },
                { label: "Unchanged", value: "unchanged" },
                { label: "Failed", value: "failed" },
              ],
            },
            {
              key: "availability",
              label: "Availability",
              allLabel: "All directory entries",
              options: [
                { label: "Available at ANU", value: "available" },
                { label: "No longer listed", value: "unavailable" },
              ],
            },
          ]}
          searchPlaceholder={`Search all ${labels.plural} by code or title`}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-950 tabular-nums">
              {selected.length}
            </span>{" "}
            of 10 selected
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 sm:w-72">
              <Select
                aria-label="OpenRouter model"
                disabled={!canImport || modelOptions.length === 0}
                onChange={setModel}
                options={modelOptions.map((value) => ({
                  label: value,
                  value,
                }))}
                placeholder="No model configured"
                value={model}
              />
            </div>
            <Button
              disabled={importDisabledReason !== null || submitting}
              onClick={() => void startImport()}
              title={importDisabledReason ?? `Queue selected ${labels.plural}`}
              variant="primary"
            >
              <Download aria-hidden="true" size={15} />
              {submitting ? "Starting..." : "Import selected"}
            </Button>
          </div>
        </div>

        <DataTableShell
          footer={
            <Pagination
              itemName={labels.plural}
              page={data.page}
              pageSize={data.pageSize}
              pathname="/admin/programmes"
              searchParams={searchParams}
              total={data.total}
            />
          }
        >
          {data.records.length === 0 ? (
            <DataTableEmpty
              description={
                data.year.availabilityCheckedAt
                  ? "Clear the search or choose different filters."
                  : `Refresh this year's directory to load ${labels.singular} codes and titles without importing details.`
              }
              title={`No directory ${labels.plural}`}
            />
          ) : (
            <Table className="min-w-[1040px]">
              <TableCaption>
                {labels.label} directory and import status
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label={`Select available ${labels.plural} on this page`}
                      checked={
                        allPageSelected
                          ? true
                          : somePageSelected
                            ? "indeterminate"
                            : false
                      }
                      disabled={eligibleRecords.length === 0}
                      onCheckedChange={(checked) =>
                        togglePage(checked === true)
                      }
                    />
                  </TableHead>
                  <TableHead>{labels.singular}</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Import</TableHead>
                  <TableHead>Draft</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Career</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Select ${record.code}`}
                        checked={selectedSet.has(record.code)}
                        disabled={!record.isAvailable}
                        onCheckedChange={(checked) =>
                          toggleStructure(record.code, checked === true)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <span className="block font-medium text-zinc-950">
                        {record.title}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                        {record.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.isAvailable ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                          <CheckCircle2
                            aria-hidden="true"
                            className="text-emerald-600"
                            size={14}
                          />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                          <XCircle
                            aria-hidden="true"
                            className="text-zinc-400"
                            size={14}
                          />
                          No longer listed
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge tone={statusTone(record.importStatus)}>
                        {statusLabel(record.importStatus)}
                      </Badge>
                      {record.latestImport ? (
                        <Link
                          className="mt-1 block text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
                          href={`/admin/imports/structures/runs/${record.latestImport.runId}/targets/${record.latestImport.targetId}`}
                        >
                          Run {record.latestImport.runNumber}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {record.draftSnapshotId ? (
                        <Badge tone="brand">
                          {record.publishedSnapshotId !== null &&
                          record.draftSnapshotId !== record.publishedSnapshotId
                            ? "Newer draft"
                            : "Draft"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.publishedSnapshotId ? (
                        <Badge tone="success">Published</Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ReviewStatus record={record} />
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600">
                      {record.academicCareer ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600 tabular-nums">
                      {structureDetails(record)}
                    </TableCell>
                    <TableCell className="text-right">
                      {shouldOpenLatestImport(record) && record.latestImport ? (
                        <Link
                          aria-label={`Open ${record.code} import details for run ${record.latestImport.runNumber}`}
                          className="inline-grid size-10 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                          href={`/admin/imports/structures/runs/${record.latestImport.runId}/targets/${record.latestImport.targetId}`}
                        >
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </Link>
                      ) : record.structurePublicId && record.structureYearId ? (
                        <Link
                          aria-label={`Open ${record.code} ${data.year.year} workspace`}
                          className="inline-grid size-10 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                          href={`/admin/programmes/${record.structurePublicId}?year=${data.year.year}`}
                        >
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </Link>
                      ) : (
                        <a
                          aria-label={`Open ${record.code} at ANU`}
                          className="inline-grid size-10 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                          href={record.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink aria-hidden="true" size={15} />
                        </a>
                      )}
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
