"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  DataList,
  DataListActions,
  DataListContent,
  DataListDescription,
  DataListIcon,
  DataListItem,
  DataListMeta,
  DataListTitle,
} from "@/components/ui/data-list";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";

type Preview = {
  programmes: number | null;
  coursePages: number;
  existingCourses: number;
  newCourses: number;
  isLowerBound: boolean;
  comparison: "database" | "demo";
};

type ImportResult = {
  status: "succeeded" | "failed";
  runId: string;
  counts: {
    added: number;
    changed: number;
    checked: number;
    failed: number;
    unchanged: number;
  };
};

type ActivityRow = {
  action: "created" | "updated" | "unchanged" | "failed" | "fetching";
  code: string;
  kind: "programme" | "course";
  message: string;
  sourceUrl?: string;
};

const activityPresentation = {
  created: {
    iconClass: "border-emerald-100 bg-emerald-50 text-emerald-700",
    label: "Created",
    tone: "success",
  },
  updated: {
    iconClass: "border-emerald-100 bg-emerald-50 text-emerald-700",
    label: "Updated",
    tone: "success",
  },
  unchanged: {
    iconClass: "border-zinc-200 bg-zinc-50 text-zinc-600",
    label: "Unchanged",
    tone: "neutral",
  },
  failed: {
    iconClass: "border-rose-100 bg-rose-50 text-rose-700",
    label: "Failed",
    tone: "danger",
  },
  fetching: {
    iconClass: "border-brand-100 bg-brand-50 text-brand-700",
    label: "Fetching",
    tone: "brand",
  },
} satisfies Record<
  ActivityRow["action"],
  {
    iconClass: string;
    label: string;
    tone: "brand" | "danger" | "neutral" | "success";
  }
>;

const MAX_WEB_COURSE_IMPORTS = 100;
const COURSE_SYNC_CONCURRENCY = 4;

export default function AdminSyncPreviewPage() {
  return (
    <Suspense fallback={<SyncPreviewSkeleton />}>
      <SyncPreview />
    </Suspense>
  );
}

function SyncPreviewSkeleton() {
  return (
    <AppShell admin>
      <div aria-busy="true" className="w-full">
        <span className="sr-only" role="status">
          Loading sync preview.
        </span>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-5 h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {[
            "Course pages found",
            "Already in Coursemap",
            "New course pages",
          ].map((label) => (
            <StatTile
              key={label}
              label={label}
              value={<Skeleton className="h-6 w-14" />}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function SyncPreview() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? "";
  const hasCatalogueYear = /^\d{4}$/.test(year);
  const target = ["all", "all-courses", "courses"].includes(
    searchParams.get("target") ?? "",
  )
    ? (searchParams.get("target") as "all" | "all-courses" | "courses")
    : "selected";
  const programmes = searchParams.get("programmes") ?? "";
  const courses = searchParams.get("courses") ?? "";
  const selectedCourseCodes = courses
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{4}\d{4}$/.test(code));
  const selectedProgrammeCodes = programmes
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z0-9-]+$/.test(code));
  const editHref =
    target === "courses" || target === "all-courses"
      ? "/admin/sync/courses"
      : "/admin/sync";
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [programmeRunComplete, setProgrammeRunComplete] = useState(false);
  const canRunSelectedCourses =
    target === "courses" &&
    hasCatalogueYear &&
    selectedCourseCodes.length > 0 &&
    selectedCourseCodes.length <= MAX_WEB_COURSE_IMPORTS &&
    !importing;
  const canRunSelectedProgramme =
    target === "selected" &&
    hasCatalogueYear &&
    selectedProgrammeCodes.length === 1 &&
    !importing;
  const courseRunComplete =
    target === "courses" &&
    !importing &&
    importResult !== null &&
    activityRows.length > 0 &&
    activityRows.every((row) => row.action !== "fetching");
  const activityComplete =
    !importing && (programmeRunComplete || courseRunComplete);
  const previewUnavailable = error !== null || !hasCatalogueYear;
  const pendingActivityCount = activityRows.filter(
    (row) => row.action === "fetching",
  ).length;

  useEffect(() => {
    if (!hasCatalogueYear) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ year, target, programmes, courses });

    fetch(`/api/admin/catalogue/preview?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as Preview & { error?: string };
        if (!response.ok)
          throw new Error(payload.error ?? "Preview unavailable.");
        setPreview(payload);
      })
      .catch((caughtError) => {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        )
          return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Preview unavailable.",
        );
      });

    return () => controller.abort();
  }, [courses, hasCatalogueYear, programmes, target, year]);

  async function runImport() {
    if (!canRunSelectedCourses) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    const totals = {
      added: 0,
      changed: 0,
      checked: 0,
      failed: 0,
      unchanged: 0,
    };
    let nextIndex = 0;
    let firstError: string | null = null;
    setActivityRows(
      selectedCourseCodes.map((code) => ({
        action: "fetching",
        code,
        kind: "course",
        message: "Fetching ANU source page",
      })),
    );

    async function syncOneCourse(code: string) {
      try {
        const response = await fetch("/api/admin/catalogue/imports/courses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            catalogueYear: Number(year),
            courseCodes: [code],
          }),
        });
        const payload = (await response.json()) as ImportResult & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Course import failed.");
        for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
          totals[key] += payload.counts[key];
        }
        const action =
          payload.counts.failed > 0
            ? "failed"
            : payload.counts.added > 0
              ? "created"
              : payload.counts.changed > 0
                ? "updated"
                : "unchanged";
        setActivityRows((rows) =>
          rows.map((row) =>
            row.code === code
              ? {
                  ...row,
                  action,
                  message:
                    payload.counts.failed > 0
                      ? "Saved source facts for review"
                      : "Imported and queued ambiguous facts for review",
                }
              : row,
          ),
        );
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Course import failed.";
        firstError ??= message;
        totals.failed += 1;
        setActivityRows((rows) =>
          rows.map((row) =>
            row.code === code ? { ...row, action: "failed", message } : row,
          ),
        );
      }
    }

    async function worker() {
      for (;;) {
        const code = selectedCourseCodes[nextIndex];
        nextIndex += 1;
        if (!code) return;
        await syncOneCourse(code);
      }
    }

    try {
      await Promise.all(
        Array.from(
          {
            length: Math.min(
              COURSE_SYNC_CONCURRENCY,
              selectedCourseCodes.length,
            ),
          },
          () => worker(),
        ),
      );
      setImportResult({
        status: totals.failed > 0 ? "failed" : "succeeded",
        runId: "website-batch",
        counts: totals,
      });
      if (firstError) {
        setImportError(
          `${totals.failed} course page${totals.failed === 1 ? "" : "s"} need attention. ${firstError}`,
        );
      }
    } finally {
      setImporting(false);
    }
  }

  async function runProgrammeImport() {
    if (!canRunSelectedProgramme) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    setProgrammeRunComplete(false);
    setActivityRows([]);

    try {
      const response = await fetch("/api/admin/catalogue/imports/programmes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          catalogueYear: Number(year),
          programmeCodes: selectedProgrammeCodes,
        }),
      });
      if (!response.ok || !response.body) {
        throw new Error("Programme import could not be started.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      for (;;) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const events = pending.split("\n\n");
        pending = events.pop() ?? "";
        for (const current of events) {
          const line = current
            .split("\n")
            .find((item) => item.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as
            | {
                type: "progress";
                action: ActivityRow["action"];
                code: string;
                kind: ActivityRow["kind"];
                message: string;
                sourceUrl?: string;
              }
            | { type: "complete" }
            | { type: "error"; message: string };
          if (event.type === "progress") {
            setActivityRows((rows) => {
              const row: ActivityRow = event;
              const index = rows.findIndex(
                (item) => item.code === row.code && item.kind === row.kind,
              );
              return index < 0
                ? [...rows, row]
                : rows.map((item, itemIndex) =>
                    itemIndex === index ? row : item,
                  );
            });
          } else if (event.type === "complete") {
            setProgrammeRunComplete(true);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
        if (done) break;
      }
    } catch (caughtError) {
      setImportError(
        caughtError instanceof Error
          ? caughtError.message
          : "Programme import failed.",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppShell admin>
      <div className="w-full">
        <Link
          href={editHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} /> Edit sync
        </Link>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          Review sync
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {target === "all"
            ? `All programmes from ${year}`
            : target === "all-courses"
              ? `All course pages from ${year}`
              : target === "courses"
                ? `${courses.split(",").length} selected course${courses.includes(",") ? "s" : ""} from ${year}`
                : `${programmes.split(",").length} selected programme${programmes.includes(",") ? "s" : ""} from ${year}`}
        </p>

        <div
          aria-busy={hasCatalogueYear && !preview && !error}
          className="mt-10 grid gap-3 lg:grid-cols-3"
        >
          {hasCatalogueYear && !preview && !error ? (
            <span className="sr-only" role="status">
              Loading sync preview.
            </span>
          ) : null}
          <StatTile
            label="Course pages found"
            value={
              preview ? (
                `${preview.isLowerBound ? "At least " : ""}${preview.coursePages}`
              ) : previewUnavailable ? (
                <span className="text-sm font-medium text-zinc-500">
                  Unavailable
                </span>
              ) : (
                <Skeleton className="h-6 w-14" />
              )
            }
          />
          <StatTile
            label="Already in Coursemap"
            value={
              preview ? (
                preview.existingCourses
              ) : previewUnavailable ? (
                <span className="text-sm font-medium text-zinc-500">
                  Unavailable
                </span>
              ) : (
                <Skeleton className="h-6 w-14" />
              )
            }
          />
          <StatTile
            label="New course pages"
            value={
              preview ? (
                preview.newCourses
              ) : previewUnavailable ? (
                <span className="text-sm font-medium text-zinc-500">
                  Unavailable
                </span>
              ) : (
                <Skeleton className="h-6 w-14" />
              )
            }
          />
        </div>

        {preview?.isLowerBound || preview?.comparison === "demo" ? (
          <div className="mt-4 space-y-2">
            {preview.isLowerBound ? (
              <Alert role="note" tone="neutral">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>
                  The ANU search endpoint returns its first 500 course results.
                  Full discovery runs before an all-programmes sync.
                </AlertDescription>
              </Alert>
            ) : null}
            {preview.comparison === "demo" ? (
              <Alert role="note" tone="neutral">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>
                  Local demo comparison against the catalogue bundled with this
                  app.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <Alert className="mt-6" role="alert" tone="danger">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {!hasCatalogueYear ? (
          <Alert className="mt-6" role="alert" tone="danger">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Catalogue year required</AlertTitle>
            <AlertDescription>
              Choose a catalogue year before previewing an import.
            </AlertDescription>
          </Alert>
        ) : null}
        {importError ? (
          <Alert className="mt-6" role="alert" tone="danger">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Sync needs attention</AlertTitle>
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        ) : null}
        {importResult ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Alert
              className="flex-1"
              tone={importResult.status === "succeeded" ? "success" : "danger"}
            >
              {importResult.status === "succeeded" ? (
                <Check aria-hidden="true" />
              ) : (
                <CircleAlert aria-hidden="true" />
              )}
              <AlertTitle>Import {importResult.status}</AlertTitle>
              <AlertDescription>
                {importResult.counts.added} added, {importResult.counts.changed}{" "}
                changed and {importResult.counts.unchanged} unchanged. Imported
                records remain drafts until an administrator publishes them.
              </AlertDescription>
            </Alert>
            <ButtonLink
              href={
                target === "courses" || target === "all-courses"
                  ? "/admin/courses"
                  : "/admin/programmes"
              }
              size="sm"
              variant="secondary"
            >
              Review and publish
            </ButtonLink>
          </div>
        ) : null}
        {activityRows.length > 0 ? (
          <Card className="mt-6 overflow-hidden">
            <CardHeader
              action={
                <div className="flex items-center gap-2">
                  <Badge tone={activityComplete ? "success" : "neutral"}>
                    {activityRows.length} pages
                  </Badge>
                  <span aria-live="polite" className="sr-only">
                    {activityComplete
                      ? `Import activity complete for ${activityRows.length} pages.`
                      : `${pendingActivityCount} of ${activityRows.length} pages still fetching.`}
                  </span>
                </div>
              }
              className="border-b border-zinc-100"
              description={
                activityComplete
                  ? "Completed. Each imported page remains linked to its ANU source."
                  : "Updates appear as each page is saved."
              }
              title="Import activity"
            />
            <DataList>
              {activityRows.map((row) => {
                const presentation = activityPresentation[row.action];
                return (
                  <DataListItem key={`${row.kind}-${row.code}`}>
                    <DataListIcon className={presentation.iconClass}>
                      {row.action === "fetching" ? (
                        <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                      ) : row.action === "failed" ? (
                        <CircleAlert />
                      ) : (
                        <Check />
                      )}
                    </DataListIcon>
                    <DataListContent>
                      <DataListMeta>
                        <Badge tone={presentation.tone}>
                          {presentation.label}
                        </Badge>
                        <Badge tone="neutral">{row.kind}</Badge>
                      </DataListMeta>
                      <DataListTitle className="font-mono">
                        {row.code}
                      </DataListTitle>
                      <DataListDescription className="line-clamp-2 whitespace-normal">
                        {row.message}
                      </DataListDescription>
                    </DataListContent>
                    {row.sourceUrl ? (
                      <DataListActions>
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
                        >
                          Source
                          <span className="sr-only"> (opens in a new tab)</span>
                          <ExternalLink aria-hidden="true" size={12} />
                        </a>
                      </DataListActions>
                    ) : null}
                  </DataListItem>
                );
              })}
            </DataList>
          </Card>
        ) : null}

        <section className="mt-10 border-t border-zinc-200 pt-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            What will sync
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
            {target !== "courses" && target !== "all-courses" && (
              <p className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600" /> Programme
                structures and rules
              </p>
            )}
            <p className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />
              {target === "courses" || target === "all-courses"
                ? "Course details and offerings"
                : "Required and elective course pages"}
            </p>
            {target !== "courses" && target !== "all-courses" && (
              <p className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600" /> Original
                programme requirements retained for review
              </p>
            )}
            <p className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" /> Prerequisite
              relationships
            </p>
          </div>
        </section>

        <div className="mt-10 flex flex-col items-end gap-3">
          {target === "courses" &&
            selectedCourseCodes.length > MAX_WEB_COURSE_IMPORTS && (
              <Alert className="max-w-2xl" tone="warning">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>
                  Run selected course pages in batches of{" "}
                  {MAX_WEB_COURSE_IMPORTS}.
                </AlertDescription>
              </Alert>
            )}
          {target === "selected" && selectedProgrammeCodes.length !== 1 && (
            <Alert className="max-w-2xl" tone="neutral">
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                Choose one programme to run it locally. Multiple programmes can
                still be reviewed together.
              </AlertDescription>
            </Alert>
          )}
          <Button
            disabled={!canRunSelectedCourses && !canRunSelectedProgramme}
            onClick={canRunSelectedProgramme ? runProgrammeImport : runImport}
            title={
              canRunSelectedCourses || canRunSelectedProgramme
                ? "Fetch, validate and import this selected catalogue scope."
                : undefined
            }
          >
            {importing ? (
              <LoaderCircle
                size={16}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <RefreshCw aria-hidden="true" size={16} />
            )}
            {importing
              ? "Syncing"
              : activityComplete
                ? "Sync again"
                : "Sync now"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
