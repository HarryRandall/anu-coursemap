"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  History,
  LoaderCircle,
  RefreshCw,
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
  AcademicYearOption,
  CourseDirectoryPage,
  CourseDirectoryRecord,
} from "@/lib/coursemap/admin-course-imports";
import type { Tone } from "@/lib/ui";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Australia/Sydney",
});

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function importTone(status: string): Tone {
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "queued" || status === "processing") return "info";
  if (status === "ready_for_review") return "warning";
  if (status === "unchanged") return "neutral";
  return "success";
}

function availabilityTone(
  value: AcademicYearOption["sourceAvailability"],
): Tone {
  if (value === "available") return "success";
  if (value === "unavailable") return "danger";
  return "neutral";
}

function ReviewStatus({ record }: { record: CourseDirectoryRecord }) {
  const status = record.latestImport?.reviewStatus;
  if (!status || status === "not_ready" || status === "not_required") {
    return <span className="text-xs text-zinc-400">None</span>;
  }
  return (
    <Badge
      tone={
        status === "pending"
          ? "warning"
          : status === "accepted"
            ? "success"
            : "danger"
      }
    >
      {readable(status)}
    </Badge>
  );
}

export function AdminCourseDirectory({
  canImport,
  data,
  directoryRefreshEnabled,
  modelOptions,
  queueEnabled,
  searchParams,
  years,
}: {
  canImport: boolean;
  data: CourseDirectoryPage;
  directoryRefreshEnabled: boolean;
  modelOptions: string[];
  queueEnabled: boolean;
  searchParams: Record<string, string | undefined>;
  years: AcademicYearOption[];
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

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allPageSelected =
    data.records.length > 0 &&
    data.records.every((record) => selectedSet.has(record.code));
  const somePageSelected = data.records.some((record) =>
    selectedSet.has(record.code),
  );

  function chooseYear(year: number) {
    const params = new URLSearchParams();
    params.set("year", String(year));
    router.replace(`/admin/courses?${params}`);
  }

  function toggleCourse(code: string, checked: boolean) {
    setNotice(null);
    setSelected((current) => {
      if (!checked) return current.filter((value) => value !== code);
      if (current.includes(code)) return current;
      if (current.length >= 10) {
        setNotice({
          tone: "warning",
          text: "A testing run can contain no more than 10 courses.",
        });
        return current;
      }
      return [...current, code];
    });
  }

  function togglePage(checked: boolean) {
    setNotice(null);
    if (!checked) {
      const pageCodes = new Set(data.records.map((record) => record.code));
      setSelected((current) => current.filter((code) => !pageCodes.has(code)));
      return;
    }
    setSelected((current) =>
      [
        ...new Set([...current, ...data.records.map((record) => record.code)]),
      ].slice(0, 10),
    );
    if (data.records.length + selected.length > 10) {
      setNotice({
        tone: "warning",
        text: "Selected the first available courses up to the 10-course testing limit.",
      });
    }
  }

  async function refreshDirectory() {
    setRefreshing(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/catalogue/imports/directory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogueYear: data.year.year,
          target: "courses",
        }),
      });
      await readImportStream(response, () => undefined);
      setNotice({
        tone: "success",
        text: `${data.year.year} course directory refreshed. No detailed courses were imported.`,
      });
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : "The course directory could not be refreshed.",
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function startImport() {
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/catalogue/imports/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          academicYear: data.year.year,
          courseCodes: selected,
          requestedModel: model,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        runId?: string;
      } | null;
      if (!response.ok) {
        if (payload?.runId) {
          router.push(`/admin/imports/runs/${payload.runId}`);
          return;
        }
        throw new Error(
          payload?.error ?? "The course import could not be queued.",
        );
      }
      if (!payload?.runId) {
        throw new Error("The import run ID was not returned.");
      }
      router.push(`/admin/imports/runs/${payload.runId}`);
    } catch (error) {
      setNotice({
        tone: "danger",
        text:
          error instanceof Error
            ? error.message
            : "The course import could not be queued.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const importDisabledReason = !canImport
    ? "Course import permission is required."
    : !queueEnabled
      ? "Background course imports are not enabled in this deployment."
      : data.activeRun
        ? "Wait for the active import run to finish before starting another."
        : !data.year.importEnabled
          ? "This academic year is not enabled for imports."
          : data.year.sourceAvailability === "unavailable"
            ? "ANU has no directory data for this academic year."
            : selected.length === 0
              ? "Select at least one course."
              : !model
                ? "No OpenRouter model is configured."
                : null;

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Courses</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-32">
              <Select
                aria-label="Academic year"
                onChange={chooseYear}
                options={years.map((year) => ({
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
            {data.year.directoryRefreshedAt ? (
              <span className="text-xs text-zinc-500">
                Refreshed{" "}
                {dateFormatter.format(new Date(data.year.directoryRefreshedAt))}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/admin/imports/runs" size="md">
              <History aria-hidden="true" size={15} />
              Import runs
            </ButtonLink>
            <Button
              disabled={!canImport || !directoryRefreshEnabled || refreshing}
              onClick={() => void refreshDirectory()}
              size="md"
              title={
                directoryRefreshEnabled
                  ? "Fetch code and title rows only"
                  : "Directory refresh is not enabled in this deployment"
              }
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

        {!queueEnabled || !directoryRefreshEnabled ? (
          <Alert tone="warning">
            <AlertDescription>
              {!directoryRefreshEnabled
                ? "Directory refresh is disabled until COURSEMAP_COURSE_DIRECTORY_ENTRIES_ENABLED is configured. "
                : ""}
              {!queueEnabled
                ? "Detailed imports are disabled until COURSEMAP_QUEUE_IMPORTS_ENABLED is configured."
                : ""}
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
                href={`/admin/imports/runs/${data.activeRun.id}`}
              >
                One import is {data.activeRun.status}
              </Link>{" "}
              ({data.activeRun.processedCount} of {data.activeRun.targetCount}{" "}
              processed).
            </AlertDescription>
          </Alert>
        ) : null}

        {notice ? (
          <Alert tone={notice.tone}>
            <AlertDescription>{notice.text}</AlertDescription>
          </Alert>
        ) : null}

        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              allLabel: "All directory courses",
              options: [
                { label: "Directory only", value: "directory" },
                { label: "Queued", value: "queued" },
                { label: "Processing", value: "processing" },
                { label: "Needs review", value: "needs-review" },
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
                { label: "Unchanged", value: "unchanged" },
                { label: "Failed", value: "failed" },
              ],
            },
          ]}
          searchPlaceholder="Search all courses by code or title"
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
              title={importDisabledReason ?? "Queue selected courses"}
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
              itemName="courses"
              page={data.page}
              pageSize={data.pageSize}
              pathname="/admin/courses"
              searchParams={searchParams}
              total={data.total}
            />
          }
        >
          {data.records.length === 0 ? (
            <DataTableEmpty
              description={
                data.year.directoryRefreshedAt
                  ? "Clear the search or choose a different status."
                  : "Refresh this year's directory to load course codes and titles without importing details."
              }
              title="No directory courses"
            />
          ) : (
            <Table className="min-w-[980px]">
              <TableCaption>Course directory and snapshot status</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      aria-label="Select courses on this page"
                      checked={
                        allPageSelected
                          ? true
                          : somePageSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        togglePage(checked === true)
                      }
                    />
                  </TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Directory</TableHead>
                  <TableHead>Import</TableHead>
                  <TableHead>Draft</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="text-right">Units</TableHead>
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
                        onCheckedChange={(checked) =>
                          toggleCourse(record.code, checked === true)
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
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                        <CheckCircle2
                          aria-hidden="true"
                          className="text-emerald-600"
                          size={14}
                        />
                        Current
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.latestImport ? (
                        <Badge
                          tone={importTone(
                            record.latestImport.processingStatus,
                          )}
                        >
                          {readable(record.latestImport.processingStatus)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">
                          Not imported
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.draftSnapshotId ? (
                        <Badge tone="brand">Draft</Badge>
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
                    <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                      {record.units ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.latestImport ? (
                        <Link
                          aria-label={`Open ${record.code} import details`}
                          className="inline-grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
                          href={`/admin/imports/runs/${record.latestImport.runId}/targets/${record.latestImport.targetId}`}
                        >
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </Link>
                      ) : null}
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
