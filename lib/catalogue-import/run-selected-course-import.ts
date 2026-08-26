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
 * Fetch, validate and import a selected-course scope. The website issues
 * bounded one-course requests, so each serverless request stays short while
 * a user can select up to one hundred pages in one sync.
 */
export async function runSelectedCourseImport({
  catalogueYear,
  courseCodes,
}: {
  catalogueYear: number;
  courseCodes: readonly string[];
}): Promise<CourseImportResult> {
  assertSupportedCatalogueYear(catalogueYear);

  const codes = normaliseCourseCodes(courseCodes);
  const manifest = await fetchAnuCourseManifest({
    catalogueYear,
    courseCodes: codes,
    concurrency: Math.min(4, codes.length),
  });
  const sql = isDemoMode()
    ? await createLocalDatabaseClient()
    : createHostedCatalogueDatabaseClient(configuredImportDatabaseUrl());

  try {
    const result = (await importCatalogueManifest(sql, manifest)) as Omit<
      CourseImportResult,
      "details"
    >;
    return { ...result, details: summariseManifest(manifest) };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
