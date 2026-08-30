"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ExternalLink,
  Eye,
  History,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { readImportStream } from "@/components/admin/imports/import-stream";
import { AppShell } from "@/components/shell";
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
import { DirectorySelectionBar } from "@/components/admin/directory-selection-bar";
import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { SortMenu, type SortOption } from "@/components/ui/sort-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { YearPicker, type YearSelection } from "@/components/ui/year-picker";
import type {
  AcademicYearOption,
  CourseDirectoryPage,
  CourseDirectoryRecord,
  CourseDirectorySort,
} from "@/lib/coursemap/admin-course-imports";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Tone } from "@/lib/ui";

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SORT_OPTIONS: SortOption<CourseDirectorySort>[] = [
  { label: "Code, A to Z", value: "code-asc" },
  { descending: true, label: "Code, Z to A", value: "code-desc" },
  { label: "Name, A to Z", value: "title-asc" },
  { descending: true, label: "Name, Z to A", value: "title-desc" },
  { label: "Workflow status", value: "status" },
];

type CourseDirectoryRefreshResult = {
  status: "succeeded" | "failed";
  counts: {
    checked: number;
    failed: number;
  };
  warningCount: number;
  errorCount: number;
};

function courseDirectoryRefreshResult(
  value: unknown,
): CourseDirectoryRefreshResult | null {
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
    typeof result.errorCount !== "number"
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
  };
}

function shouldOpenLatestImport(record: CourseDirectoryRecord) {
  const latestImport = record.latestImport;
  if (!latestImport) return false;
  return (
    latestImport.reviewStatus === "pending" ||
    [
      "queued",
      "processing",
      "failed",
      "cancelled",
      "ready_for_review",
    ].includes(latestImport.processingStatus)
  );
}

function courseWorkflowStatus(record: CourseDirectoryRecord) {
  const latest = record.latestImport;
  if (latest?.processingStatus === "queued") return "queued";
  if (latest?.processingStatus === "processing") return "processing";
  if (
    latest?.processingStatus === "failed" ||
    latest?.processingStatus === "cancelled"
  ) {
    return "failed";
  }
  if (
    latest?.reviewStatus === "pending" ||
    latest?.processingStatus === "ready_for_review"
  ) {
    return "needs-review";
  }
  if (record.publishedSnapshotId !== null) return "published";
  if (record.draftSnapshotId !== null) return "draft";
  if (
    latest?.reviewStatus === "unchanged" ||
    latest?.changeKind === "unchanged"
  ) {
    return "unchanged";
  }
  return "directory";
}

function workflowTone(status: string): Tone {
  if (status === "failed") return "danger";
  if (status === "queued" || status === "processing") return "info";
  if (status === "needs-review") return "warning";
  if (status === "draft") return "brand";
  if (status === "published") return "success";
  return "neutral";
}

function workflowLabel(status: string) {
  if (status === "needs-review") return "Needs review";
  if (status === "directory") return "Not imported";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function WorkflowStatus({ record }: { record: CourseDirectoryRecord }) {
  const status = courseWorkflowStatus(record);
  const details = [
    record.draftSnapshotId !== null ? "Draft" : null,
    record.publishedSnapshotId !== null ? "Published" : null,
    record.units === null ? null : `${record.units} units`,
  ].filter((value): value is string => value !== null);

  return (
    <div className="min-w-36 space-y-1">
      <Badge tone={workflowTone(status)}>{workflowLabel(status)}</Badge>
      {details.length > 0 || record.latestImport ? (
        <span className="block text-xs text-zinc-500">
          {details.join(" · ")}
          {record.latestImport ? (
            <>
              {details.length > 0 ? " · " : null}Imported{" "}
              {readable(record.latestImport.processingStatus)}
            </>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function AdminCourseDirectory({
  canImport,
  data,
  importModel,
  modelOptions,
  queueEnabled,
  searchParams,
  years,
}: {
  canImport: boolean;
  data: CourseDirectoryPage;
  importModel: string;
  modelOptions: string[];
  queueEnabled: boolean;
  searchParams: Record<string, string | undefined>;
  years: AcademicYearOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  // Bumping this replays the selection bar's "already full" rebuff, which
  // keeps the refusal on the control instead of in a toast.
  const [limitSignal, setLimitSignal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allPageSelected =
    data.records.length > 0 &&
    data.records.every((record) => selectedSet.has(record.code));
  const somePageSelected = data.records.some((record) =>
    selectedSet.has(record.code),
  );

  function chooseYear(year: YearSelection) {
    const params = new URLSearchParams();
    params.set("year", String(year));
    router.replace(`/admin/courses?${params}`);
  }

  const currentSort =
    (searchParams.sort as CourseDirectorySort | undefined) ?? "code-asc";

  function chooseSort(value: CourseDirectorySort) {
    const params = new URLSearchParams();
    for (const [key, parameter] of Object.entries(searchParams)) {
      if (parameter) params.set(key, parameter);
    }
    if (value === "code-asc") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? "/admin/courses?" + query : "/admin/courses", {
      scroll: false,
    });
  }

  function toggleCourse(code: string, checked: boolean) {
    setSelected((current) => {
      if (!checked) return current.filter((value) => value !== code);
      if (current.includes(code)) return current;
      if (current.length >= 10) {
        setLimitSignal((signal) => signal + 1);
        return current;
      }
      return [...current, code];
    });
  }

  function togglePage(checked: boolean) {
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
      setLimitSignal((signal) => signal + 1);
    }
  }

  async function refreshDirectory() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/course-directory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ academicYear: data.year.year }),
      });
      let result: CourseDirectoryRefreshResult | null = null;
      await readImportStream(response, (event) => {
        if (event.type === "complete") {
          result = courseDirectoryRefreshResult(event.result);
        }
      });
      router.refresh();
      if (!result) {
        throw new Error("The course directory returned no completion result.");
      }
      const completed: CourseDirectoryRefreshResult = result;
      if (completed.status === "failed") {
        const failureCount = completed.errorCount || completed.counts.failed;
        if (completed.counts.checked === 0) {
          toast.warning("ANU returned no usable course directory data.", {
            description: `Existing ${data.year.year} entries were preserved.`,
          });
        } else {
          toast.error(
            `The ${data.year.year} directory check found ${failureCount} error${failureCount === 1 ? "" : "s"}.`,
            {
              description:
                "Usable rows were saved and missing existing entries were preserved.",
            },
          );
        }
      } else if (completed.warningCount > 0) {
        toast.warning(
          `${data.year.year} course directory refreshed with ${completed.warningCount} warning${completed.warningCount === 1 ? "" : "s"}.`,
          { description: "No detailed courses were imported." },
        );
      } else {
        toast.success(`${data.year.year} course directory refreshed.`, {
          description: "No detailed courses were imported.",
        });
      }
    } catch (error) {
      router.refresh();
      const message =
        error instanceof Error
          ? error.message
          : "The course directory could not be refreshed.";
      const unavailable =
        /(?:HTTP\s+(?:404|410)|no course directory|no .*data)/iu.test(message);
      if (unavailable) {
        toast.warning(
          `ANU has no course directory data for ${data.year.year}.`,
          { description: "Existing entries were preserved." },
        );
      } else {
        toast.error("The course directory could not be refreshed.", {
          description: message,
        });
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function startImport(requestedModel: string) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/course-imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          academicYear: data.year.year,
          courseCodes: selected,
          requestedModel,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        runId?: string;
      } | null;
      if (!response.ok) {
        if (payload?.runId) {
          router.push("/admin/courses/imports");
          return;
        }
        throw new Error(
          payload?.error ?? "The course import could not be queued.",
        );
      }
      if (!payload?.runId) {
        throw new Error("The import run ID was not returned.");
      }
      router.push("/admin/courses/imports");
    } catch (error) {
      toast.error("The course import could not be queued.", {
        description: error instanceof Error ? error.message : undefined,
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
              : !importModel
                ? "No import model is configured in the admin dashboard."
                : null;

  return (
    <AppShell admin fill>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4">
        <h1 className="sr-only">Courses</h1>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href="/admin/courses/imports" size="md">
              <History aria-hidden="true" size={15} />
              Imports
            </ButtonLink>
            {data.year.sourceAvailability === "unavailable" ? (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"
                title={
                  data.year.availabilityNote ??
                  `ANU lists no course directory for ${data.year.year}.`
                }
              >
                <TriangleAlert aria-hidden="true" size={14} />
                No ANU data
              </span>
            ) : null}
            {data.activeRun ? (
              <Link
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900 hover:bg-brand-100"
                href="/admin/courses/imports"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={13}
                />
                Import {data.activeRun.status} · {data.activeRun.processedCount}
                /{data.activeRun.targetCount}
              </Link>
            ) : null}
          </div>
          <YearPicker
            allowAll
            onChange={chooseYear}
            value={data.allYears ? "all" : data.year.year}
            years={years.map((year) => year.year)}
          />
        </div>

        <ConfirmDialog
          confirmLabel="Refresh directory"
          description={`Pulls the current list of course codes and titles from ANU for ${data.year.year}. Nothing is imported and no drafts or published content change.`}
          onConfirm={refreshDirectory}
          onOpenChange={setRefreshDialogOpen}
          open={refreshDialogOpen}
          title={"Refresh " + data.year.year + " course directory?"}
        />

        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <FilterBar
              filters={[
                {
                  key: "status",
                  label: "Status",
                  allLabel: "All courses",
                  negatable: true,
                  options: [
                    { label: "Not imported", value: "directory" },
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
              searchPlaceholder="Search courses by code or title"
            />
          </div>
          <SortMenu
            defaultValue="code-asc"
            onChange={chooseSort}
            options={SORT_OPTIONS}
            value={currentSort}
          />
          <Tooltip
            content={
              data.allYears
                ? "Choose a single year to refresh its directory"
                : refreshing
                  ? "Refreshing..."
                  : "Refresh the course directory"
            }
          >
            <Button
              aria-label={"Refresh the course directory"}
              className="size-10 shrink-0"
              disabled={!canImport || refreshing || data.allYears}
              onClick={() => setRefreshDialogOpen(true)}
              size="icon"
            >
              <RefreshCw
                aria-hidden="true"
                className={
                  refreshing ? "animate-spin motion-reduce:animate-none" : ""
                }
                size={16}
              />
            </Button>
          </Tooltip>
        </div>

        <DataTableShell
          viewport
          footer={
            <Pagination
              alwaysShowControls
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
            <Table className="min-w-[920px]">
              <TableCaption>Course directory and workflow status</TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {data.allYears ? null : (
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
                  )}
                  <TableHead>Course</TableHead>
                  {data.allYears ? <TableHead>Year</TableHead> : null}
                  <TableHead>Workflow</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record) => (
                  <TableRow
                    className={
                      selectedSet.has(record.code)
                        ? "bg-brand-50/50"
                        : undefined
                    }
                    key={record.id}
                  >
                    {data.allYears ? null : (
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${record.code}`}
                          checked={selectedSet.has(record.code)}
                          onCheckedChange={(checked) =>
                            toggleCourse(record.code, checked === true)
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="block font-medium text-zinc-950">
                        {record.title}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                        {record.code}
                      </span>
                    </TableCell>
                    {data.allYears ? (
                      <TableCell className="text-sm text-zinc-600 tabular-nums">
                        {record.year}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <WorkflowStatus record={record} />
                    </TableCell>
                    <TableCell className="text-xs text-zinc-600">
                      {[
                        record.academicCareer,
                        record.session,
                        record.modeOfDelivery,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {record.draftSnapshotId !== null &&
                        record.coursePublicId &&
                        record.courseYearId ? (
                          <ButtonLink
                            href={`/admin/courses/${record.coursePublicId}?year=${data.year.year}`}
                            size="sm"
                            title={`View ${record.code} draft`}
                          >
                            <Eye aria-hidden="true" size={14} />
                            Draft
                          </ButtonLink>
                        ) : null}
                        {record.publishedSnapshotId !== null ? (
                          <ButtonLink
                            href={`/courses/${record.code}?year=${data.year.year}`}
                            size="sm"
                            title={`View ${record.code} published course`}
                          >
                            <ExternalLink aria-hidden="true" size={14} />
                            Published
                          </ButtonLink>
                        ) : null}
                        {shouldOpenLatestImport(record) &&
                        record.latestImport ? (
                          <Tooltip content="Review latest import">
                            <ButtonLink
                              aria-label={`Review ${record.code} import`}
                              href={`/admin/courses/imports/${record.latestImport.targetId}`}
                              size="icon-sm"
                            >
                              <ArrowUpRight aria-hidden="true" size={15} />
                            </ButtonLink>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableShell>

        <DirectorySelectionBar
          canManageModel={canImport}
          disabledReason={importDisabledReason}
          importModel={importModel}
          limitSignal={limitSignal}
          modelOptions={modelOptions}
          onClear={() => setSelected([])}
          onImport={(model) => void startImport(model)}
          selected={selected.length}
          submitting={submitting}
        />
      </div>
    </AppShell>
  );
}
