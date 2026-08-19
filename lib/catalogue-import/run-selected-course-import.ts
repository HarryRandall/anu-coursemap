import { fetchAnuCourseManifest } from "@/lib/catalogue-import/anu-programs-courses";
import { assertSupportedCatalogueYear } from "@/lib/catalogue-import/catalogue-years";
import { isDemoMode } from "@/lib/supabase/config";
import { importCatalogueManifest } from "@/scripts/catalogue/lib/importer.mjs";
import {
  createHostedCatalogueDatabaseClient,
  createLocalDatabaseClient,
} from "@/scripts/catalogue/lib/local-database.mjs";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;
export const MAX_WEB_COURSE_IMPORTS = 100;

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
};

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
    return await importCatalogueManifest(sql, manifest);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
