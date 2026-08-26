"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  CircleAlert,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ImportCataloguePicker,
  type CatalogueEntry,
  type CataloguePickerKind,
} from "@/components/admin/imports/import-catalogue-picker";
import {
  ImportRunPanel,
  type ImportRunRow,
} from "@/components/admin/imports/import-run-panel";
import { ImportWizardSteps } from "@/components/admin/imports/import-wizard-steps";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";

const MAX_COURSES_PER_RUN = 100;
const MAX_PROGRAMMES_PER_RUN = 1;
const COURSE_CONCURRENCY = 4;

type Scope = "selected" | "all";

type Preview = {
  programmes: number | null;
  coursePages: number;
  existingCourses: number;
  newCourses: number;
  isLowerBound: boolean;
  comparison: "database" | "demo";
};

type CourseImportDetail = {
  code: string;
  title: string | null;
  units: number | null;
  linkedCourseCodes: string[];
  requisiteObserved: boolean;
  requisiteText: string | null;
  structuredRequisite: boolean;
  offeringCount: number;
  warningCount: number;
  errorCount: number;
};

type CourseImportResponse = {
  status: "succeeded" | "failed";
  counts: {
    added: number;
    changed: number;
    checked: number;
    failed: number;
    unchanged: number;
  };
  details?: CourseImportDetail[];
  error?: string;
};

const stepLabels = ["What to import", "Choose the pages", "Review and run"];

function describeImportedCourse(detail: CourseImportDetail | undefined) {
  if (!detail) return "Saved as a draft.";
  const parts: string[] = [];
  if (detail.units !== null) parts.push(`${detail.units} units`);
  if (detail.offeringCount > 0) parts.push("offerings saved");
  if (!detail.requisiteObserved) {
    parts.push("no requisite section found");
  } else if (detail.requisiteText === null) {
    parts.push("no requisites listed");
  } else if (detail.structuredRequisite) {
    parts.push(
      detail.linkedCourseCodes.length > 0
        ? `prerequisites mapped to ${detail.linkedCourseCodes.length} course${detail.linkedCourseCodes.length === 1 ? "" : "s"}`
        : "prerequisites mapped",
    );
  } else {
    parts.push("prerequisite wording needs review");
  }
  if (detail.warningCount > 0) {
    parts.push(
      `${detail.warningCount} warning${detail.warningCount === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" · ");
}

export function ImportWizard() {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<CataloguePickerKind>("courses");
  const [scope, setScope] = useState<Scope>("selected");
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [yearError, setYearError] = useState(false);
  const [selected, setSelected] = useState<CatalogueEntry[]>([]);
  const [previewState, setPreviewState] = useState<{
    data: Preview | null;
    error: string | null;
    key: string;
  }>({ data: null, error: null, key: "" });
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRunRow[]>([]);
  const [finished, setFinished] = useState(false);

  const limit =
    kind === "courses" ? MAX_COURSES_PER_RUN : MAX_PROGRAMMES_PER_RUN;
  const target =
    kind === "courses"
      ? scope === "all"
        ? "all-courses"
        : "courses"
      : scope === "all"
        ? "all"
        : "selected";
  const canContinue = year !== null && (scope === "all" || selected.length > 0);
  const canRun =
    !running &&
    year !== null &&
    scope === "selected" &&
    selected.length > 0 &&
    selected.length <= limit;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/catalogue/years");
        const payload = (await response.json()) as {
          years?: number[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Unavailable.");
        if (!active) return;
        setYears(payload.years ?? []);
        setYear((current) => current ?? payload.years?.[0] ?? null);
      } catch {
        if (active) setYearError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedCodes = selected.map((entry) => entry.code).join(",");
  const previewKey =
    step === 2 && year !== null
      ? `${year}|${target}|${scope === "all" ? "" : selectedCodes}`
      : "";
  // Derived so the stale estimate is dropped without a synchronous setState.
  const preview = previewState.key === previewKey ? previewState.data : null;
  const previewError =
    previewState.key === previewKey ? previewState.error : null;

  useEffect(() => {
    if (!previewKey || year === null) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ year: String(year), target });
    if (scope === "selected") {
      params.set(kind === "courses" ? "courses" : "programmes", selectedCodes);
    }

    fetch(`/api/admin/catalogue/preview?${params}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as Preview & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unavailable.");
        setPreviewState({ data: payload, error: null, key: previewKey });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setPreviewState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "The estimate could not be loaded.",
          key: previewKey,
        });
      });

    return () => controller.abort();
  }, [kind, previewKey, scope, selectedCodes, target, year]);

  const updateRow = useCallback(
    (code: string, patch: Partial<ImportRunRow>) => {
      setRows((current) =>
        current.map((row) => (row.code === code ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  function restart(nextKind: CataloguePickerKind) {
    setKind(nextKind);
    setScope("selected");
    setSelected([]);
    setRows([]);
    setFinished(false);
    setRunError(null);
  }

  async function runCourseImport() {
    if (!canRun || year === null) return;
    setRunning(true);
    setFinished(false);
    setRunError(null);
    setRows(
      selected.map((entry) => ({
        code: entry.code,
        detail: "Waiting for a free slot.",
        kind: "course",
        needsReview: false,
        phase: "queued",
        title: entry.name,
      })),
    );

    let firstError: string | null = null;
    let failures = 0;
    let next = 0;

    async function importOne(code: string) {
      updateRow(code, {
        phase: "fetching",
        detail: "Reading the ANU course page.",
      });
      try {
        const response = await fetch("/api/admin/catalogue/imports/courses", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            catalogueYear: year,
            courseCodes: [code],
          }),
        });
        updateRow(code, {
          phase: "saving",
          detail: "Saving the parsed draft.",
        });
        const payload = (await response.json()) as CourseImportResponse;
        if (!response.ok) throw new Error(payload.error ?? "Import failed.");

        const detail = payload.details?.find((item) => item.code === code);
        const phase =
          payload.counts.failed > 0
            ? "failed"
            : payload.counts.added > 0
              ? "created"
              : payload.counts.changed > 0
                ? "updated"
                : "unchanged";
        if (phase === "failed") failures += 1;
        updateRow(code, {
          detail:
            phase === "failed"
              ? "The ANU page was saved for review but could not be imported."
              : describeImportedCourse(detail),
          href: `/admin/courses/${code}`,
          needsReview: detail ? !detail.structuredRequisite : false,
          phase,
          title: detail?.title ?? undefined,
        });
      } catch (error) {
        const text =
          error instanceof Error ? error.message : "The import failed.";
        firstError ??= text;
        failures += 1;
        updateRow(code, { detail: text, phase: "failed" });
      }
    }

    async function worker() {
      for (;;) {
        const code = selected[next]?.code;
        next += 1;
        if (!code) return;
        await importOne(code);
      }
    }

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(COURSE_CONCURRENCY, selected.length) },
          () => worker(),
        ),
      );
      if (firstError) {
        setRunError(
          `${failures} page${failures === 1 ? "" : "s"} could not be imported. ${firstError}`,
        );
      }
      setFinished(true);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 pb-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          New import
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pull pages from ANU Programs and Courses into Coursemap as drafts.
        </p>
      </header>

      <ImportWizardSteps
        current={step}
        labels={stepLabels}
        onSelect={setStep}
      />

      {step === 0 ? (
        <Card>
          <CardHeader
            description="Course pages and programmes are read from different parts of the ANU catalogue."
            title="What do you want to import?"
          />
          <div className="px-5 pb-5">
            <RadioGroup
              aria-label="Import type"
              className="sm:grid-cols-2"
              onValueChange={(value) => {
                if (value === "courses" || value === "programmes")
                  restart(value);
              }}
              value={kind}
            >
              <RadioCard
                value="courses"
                title="Course pages"
                description="Course details, offerings and prerequisite rules for individual courses."
              />
              <RadioCard
                value="programmes"
                title="Programmes"
                description="Programme requirements and study options, plus the courses they reference."
              />
            </RadioGroup>
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-zinc-50 px-3.5 py-3 text-xs text-zinc-600">
              {kind === "courses" ? (
                <BookOpen aria-hidden="true" size={15} />
              ) : (
                <GraduationCap aria-hidden="true" size={15} />
              )}
              {kind === "courses"
                ? `Up to ${MAX_COURSES_PER_RUN} course pages per run.`
                : "One programme per run, so its requirement tree stays reviewable."}
            </div>
          </div>
          <div className="flex justify-end border-t border-zinc-100 px-5 py-4">
            <Button onClick={() => setStep(1)} variant="primary">
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader
            description={
              kind === "courses"
                ? "Search the ANU catalogue and add the course pages you want."
                : "Search the ANU catalogue and add the programme you want."
            }
            title={
              kind === "courses" ? "Choose course pages" : "Choose a programme"
            }
          />
          <div className="space-y-6 px-5 pb-5">
            <Field label="Catalogue year">
              {years.length === 0 && !yearError ? (
                <span aria-label="Loading catalogue years" role="status">
                  <Skeleton className="h-9 w-40" />
                </span>
              ) : (
                <Select
                  aria-label="Catalogue year"
                  className="sm:w-40"
                  disabled={year === null}
                  onChange={(value) => {
                    setYear(Number(value));
                    setSelected([]);
                  }}
                  options={years.map((item) => ({
                    value: item,
                    label: String(item),
                  }))}
                  placeholder="Catalogue unavailable"
                  value={year ?? 0}
                />
              )}
            </Field>

            {yearError ? (
              <Alert role="alert" tone="danger">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Catalogue years unavailable</AlertTitle>
                <AlertDescription>
                  Refresh the page to try loading the catalogue years again.
                </AlertDescription>
              </Alert>
            ) : null}

            <RadioGroup
              aria-label="How much to import"
              className="sm:grid-cols-2"
              onValueChange={(value) => {
                if (value === "selected" || value === "all") setScope(value);
              }}
              value={scope}
            >
              <RadioCard
                value="selected"
                title={
                  kind === "courses"
                    ? "Pick specific courses"
                    : "Pick a programme"
                }
                description="Search for what you need and import only that."
              />
              <RadioCard
                value="all"
                title={
                  kind === "courses" ? "Every course page" : "Every programme"
                }
                description={`Everything published for ${year ?? "this year"}. Estimate only for now.`}
              />
            </RadioGroup>

            {scope === "selected" ? (
              <ImportCataloguePicker
                kind={kind}
                limit={limit}
                onChange={setSelected}
                selected={selected}
                year={year}
              />
            ) : (
              <Alert role="note" tone="neutral">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Full catalogue runs are estimate only</AlertTitle>
                <AlertDescription>
                  Continue to see how many pages this covers. Running a full
                  catalogue import from the browser is not available yet, so use
                  a picked batch to import now.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex justify-between border-t border-zinc-100 px-5 py-4">
            <Button onClick={() => setStep(0)}>
              <ArrowLeft aria-hidden="true" size={15} /> Back
            </Button>
            <Button
              disabled={!canContinue}
              onClick={() => setStep(2)}
              variant="primary"
            >
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <Card>
            <CardHeader
              description={
                scope === "all"
                  ? `Every ${kind === "courses" ? "course page" : "programme"} published for ${year}.`
                  : `${selected.length} ${kind === "courses" ? "course page" : "programme"}${selected.length === 1 ? "" : "s"} from ${year}.`
              }
              title="Review this import"
            />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
              <StatTile
                label="Pages found"
                value={
                  preview ? (
                    `${preview.isLowerBound ? "At least " : ""}${preview.coursePages}`
                  ) : previewError ? (
                    <span className="text-sm font-medium text-zinc-500">
                      Unknown
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
                  ) : previewError ? (
                    <span className="text-sm font-medium text-zinc-500">
                      Unknown
                    </span>
                  ) : (
                    <Skeleton className="h-6 w-14" />
                  )
                }
              />
              <StatTile
                label="New to Coursemap"
                value={
                  preview ? (
                    preview.newCourses
                  ) : previewError ? (
                    <span className="text-sm font-medium text-zinc-500">
                      Unknown
                    </span>
                  ) : (
                    <Skeleton className="h-6 w-14" />
                  )
                }
              />
            </div>
            <ul className="grid gap-2 border-t border-zinc-100 px-5 py-4 text-sm text-zinc-700 sm:grid-cols-2">
              {(kind === "courses"
                ? [
                    "Course details and descriptions",
                    "Offerings and teaching periods",
                    "Prerequisite and incompatibility rules",
                    "A link back to the ANU source page",
                  ]
                : [
                    "Programme requirements and study options",
                    "Course pages the programme references",
                    "Original requirement wording kept for review",
                    "A link back to the ANU source page",
                  ]
              ).map((item) => (
                <li className="flex items-center gap-2" key={item}>
                  <Check
                    aria-hidden="true"
                    className="shrink-0 text-emerald-600"
                    size={15}
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
              Everything imported is saved as a draft. Nothing reaches students
              until an administrator publishes it.
            </p>
            <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Button disabled={running} onClick={() => setStep(1)}>
                <ArrowLeft aria-hidden="true" size={15} /> Back
              </Button>
              <div className="flex items-center gap-2">
                {finished ? (
                  <ButtonLink href="/admin/imports" variant="secondary">
                    Back to imports
                  </ButtonLink>
                ) : null}
                <Button
                  disabled={!canRun}
                  onClick={runCourseImport}
                  variant="primary"
                >
                  {running ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                      size={15}
                    />
                  ) : (
                    <RefreshCw aria-hidden="true" size={15} />
                  )}
                  {running
                    ? "Importing"
                    : finished
                      ? "Import again"
                      : "Start import"}
                </Button>
              </div>
            </div>
          </Card>

          {previewError ? (
            <Alert role="status" tone="neutral">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Estimate unavailable</AlertTitle>
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          ) : null}

          {kind === "programmes" && scope === "selected" ? (
            <Alert role="note" tone="neutral">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Programme imports run from the CLI</AlertTitle>
              <AlertDescription>
                Programme requirement trees are imported with the catalogue
                scripts. Use a course import here, or run the programme script
                and review the result on this page.
              </AlertDescription>
            </Alert>
          ) : null}

          {runError ? (
            <Alert role="alert" tone="danger">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Some pages need attention</AlertTitle>
              <AlertDescription>{runError}</AlertDescription>
            </Alert>
          ) : null}

          <ImportRunPanel rows={rows} />
        </div>
      ) : null}
    </div>
  );
}
