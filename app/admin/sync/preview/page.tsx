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
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

const MAX_WEB_COURSE_IMPORTS = 100;
const COURSE_SYNC_CONCURRENCY = 4;

export default function AdminSyncPreviewPage() {
  return (
    <Suspense
      fallback={
        <AppShell admin>
          <div className="w-full" />
        </AppShell>
      }
    >
      <SyncPreview />
    </Suspense>
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

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-zinc-500">Course pages found</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {preview
                ? `${preview.isLowerBound ? "at least " : ""}${preview.coursePages}`
                : "…"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-zinc-500">Already in Coursemap</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {preview ? preview.existingCourses : "…"}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-zinc-500">New course pages</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">
              {preview ? preview.newCourses : "…"}
            </p>
          </Card>
        </div>

        {preview?.isLowerBound && (
          <p className="mt-4 text-sm text-zinc-500">
            The ANU search endpoint returns its first 500 course results. Full
            discovery runs before an all-programmes sync.
          </p>
        )}
        {preview?.comparison === "demo" && (
          <p className="mt-4 text-sm text-zinc-500">
            Local demo comparison against the catalogue bundled with this app.
          </p>
        )}
        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <CircleAlert size={16} /> {error}
          </div>
        )}
        {!hasCatalogueYear && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <CircleAlert size={16} /> Choose a catalogue year before previewing
            an import.
          </div>
        )}
        {importError && (
          <div
            role="alert"
            className="mt-6 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <CircleAlert size={16} /> {importError}
          </div>
        )}
        {importResult && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
            <p role="status">
              Import {importResult.status}. {importResult.counts.added} added,{" "}
              {importResult.counts.changed} changed and{" "}
              {importResult.counts.unchanged} unchanged. Imported records remain
              drafts until an administrator publishes them.
            </p>
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
        )}
        {activityRows.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">
                  Import activity
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {programmeRunComplete
                    ? "Completed. Each imported page remains linked to its ANU source."
                    : "Updates appear as each page is saved."}
                </p>
              </div>
              <span className="text-xs font-medium text-zinc-500">
                {activityRows.length} pages
              </span>
            </div>
            <div className="divide-y divide-zinc-100">
              {activityRows.map((row) => (
                <div
                  key={`${row.kind}-${row.code}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  {row.action === "fetching" ? (
                    <LoaderCircle
                      size={15}
                      className="shrink-0 animate-spin text-violet-600"
                    />
                  ) : row.action === "failed" ? (
                    <CircleAlert size={15} className="shrink-0 text-rose-600" />
                  ) : (
                    <Check size={15} className="shrink-0 text-emerald-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold text-zinc-900">
                      {row.code}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {row.message}
                    </p>
                  </div>
                  <span className="hidden text-xs text-zinc-400 capitalize sm:block">
                    {row.kind}
                  </span>
                  {row.sourceUrl && (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
                    >
                      Source <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

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
              <p className="text-sm text-zinc-500">
                Run selected course pages in batches of {MAX_WEB_COURSE_IMPORTS}
                .
              </p>
            )}
          {target === "selected" && selectedProgrammeCodes.length !== 1 && (
            <p className="text-sm text-zinc-500">
              Choose one programme to run it locally. Multiple programmes can
              still be reviewed together.
            </p>
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
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {importing
              ? "Syncing"
              : programmeRunComplete
                ? "Sync again"
                : "Sync now"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
