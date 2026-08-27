import { fetchAnuCourseManifest } from "@/lib/catalogue-import/anu-programs-courses";
import type { CatalogueManifest } from "@/lib/catalogue-import/manifest";
import { assertSupportedCatalogueYear } from "@/lib/catalogue-import/catalogue-years";
import { parseRequisiteSummary } from "@/lib/coursemap/requisite-summary";
import { isDemoMode } from "@/lib/supabase/config";
import { importCatalogueManifest } from "@/scripts/catalogue/lib/importer.mjs";
import {
  createHostedCatalogueDatabaseClient,
  createLocalDatabaseClient,
} from "@/scripts/catalogue/lib/local-database.mjs";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;
export const MAX_WEB_COURSE_IMPORTS = 100;

/**
 * Per-course facts the admin import screen reports while a run is in flight,
 * so a reviewer sees what each page actually produced rather than a count.
 */
export type CourseImportDetail = {
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

export type CourseImportProgress = {
  action: "fetching" | "created" | "updated" | "unchanged" | "failed";
  code: string;
  index: number;
  message: string;
  total: number;
};

export type CourseImportResult = {
  status: "succeeded" | "failed";
  runId: string;
  counts: {
    added: number;
    changed: number;
    checked: number;
    failed: number;
    unchanged: number;
  };
  details: CourseImportDetail[];
};

function summariseManifest(manifest: CatalogueManifest): CourseImportDetail[] {
  return manifest.documents.map((document) => {
    const requisites = document.course.requisites;
    const rawRequisiteText = requisites.rawRequisiteText;
    return {
      code: document.course.code ?? document.externalKey,
      title: document.course.title,
      units: document.course.units,
      linkedCourseCodes: requisites.linkedCourseCodes,
      requisiteObserved: requisites.observed,
      requisiteText: rawRequisiteText,
      structuredRequisite:
        rawRequisiteText !== null &&
        parseRequisiteSummary(rawRequisiteText) !== null,
      offeringCount: document.offering ? 1 : 0,
      warningCount: document.diagnostics.filter(
        (diagnostic) => diagnostic.severity === "warning",
      ).length,
      errorCount: document.diagnostics.filter(
        (diagnostic) => diagnostic.severity === "error",
      ).length,
    };
  });
}

export class CatalogueImportConfigurationError extends Error {
  constructor() {
    super(
      "Configure COURSEMAP_IMPORT_DATABASE_URL before running imports on Vercel.",
    );
    this.name = "CatalogueImportConfigurationError";
  }
}

function normaliseCourseCodes(courseCodes: readonly string[]) {
  const codes = [
    ...new Set(courseCodes.map((code) => code.trim().toUpperCase())),
  ];
  if (
    codes.length === 0 ||
    codes.some((code) => !COURSE_CODE_PATTERN.test(code))
  ) {
    throw new TypeError("Choose one or more valid ANU course codes.");
  }
  if (codes.length > MAX_WEB_COURSE_IMPORTS) {
    throw new RangeError(
      `Select no more than ${MAX_WEB_COURSE_IMPORTS} course pages per run.`,
    );
  }
  return codes;
}

function configuredImportDatabaseUrl() {
  const connectionString = process.env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) throw new CatalogueImportConfigurationError();
  return connectionString;
}

/**
 * Fetch and import each selected course in turn so the browser can report a
 * concrete status for every page, matching the programme pull.
 */
export async function runSelectedCourseImport({
  catalogueYear,
  courseCodes,
  onProgress,
}: {
  catalogueYear: number;
  courseCodes: readonly string[];
  onProgress?: (progress: CourseImportProgress) => void | Promise<void>;
}): Promise<CourseImportResult> {
  assertSupportedCatalogueYear(catalogueYear);

  const codes = normaliseCourseCodes(courseCodes);
  const sql = isDemoMode()
    ? await createLocalDatabaseClient()
    : createHostedCatalogueDatabaseClient(configuredImportDatabaseUrl());

  const counts = {
    added: 0,
    changed: 0,
    checked: codes.length,
    failed: 0,
    unchanged: 0,
  };
  const details: CourseImportDetail[] = [];
  let runId = "";
  let status: "succeeded" | "failed" = "succeeded";

  try {
    for (let index = 0; index < codes.length; index += 1) {
      const code = codes[index]!;
      const position = index + 1;
      await onProgress?.({
        action: "fetching",
        code,
        index: position,
        message: "Fetching course page",
        total: codes.length,
      });

      try {
        const manifest = await fetchAnuCourseManifest({
          catalogueYear,
          courseCodes: [code],
          concurrency: 1,
        });
        const result = (await importCatalogueManifest(sql, manifest)) as Omit<
          CourseImportResult,
          "details"
        >;
        runId = result.runId;
        counts.added += result.counts.added;
        counts.changed += result.counts.changed;
        counts.failed += result.counts.failed;
        counts.unchanged += result.counts.unchanged;
        if (result.status === "failed") status = "failed";

        const action = result.counts.failed
          ? "failed"
          : result.counts.added
            ? "created"
            : result.counts.changed
              ? "updated"
              : "unchanged";
        details.push(...summariseManifest(manifest));
        await onProgress?.({
          action,
          code,
          index: position,
          message:
            action === "failed" ? "Course needs review" : "Course imported",
          total: codes.length,
        });
      } catch (error) {
        status = "failed";
        counts.failed += 1;
        await onProgress?.({
          action: "failed",
          code,
          index: position,
          message:
            error instanceof Error ? error.message : "Course import failed",
          total: codes.length,
        });
      }
    }

    if (!runId) {
      throw new Error("Course import failed before a run was recorded.");
    }

    return { counts, details, runId, status };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
