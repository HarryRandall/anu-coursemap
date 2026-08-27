import {
  fetchAnuProgrammeDocument,
  type AnuProgrammeDocument,
} from "@/lib/catalogue-import/anu-programme";
import { fetchAnuCourseManifest } from "@/lib/catalogue-import/anu-programs-courses";
import { assertSupportedCatalogueYear } from "@/lib/catalogue-import/catalogue-years";
import { isDemoMode } from "@/lib/supabase/config";
import { importCatalogueManifest } from "@/scripts/catalogue/lib/importer.mjs";
import { importProgrammeDocument } from "@/scripts/catalogue/lib/programme-importer.mjs";
import {
  createHostedCatalogueDatabaseClient,
  createLocalDatabaseClient,
} from "@/scripts/catalogue/lib/local-database.mjs";
import { CatalogueImportConfigurationError } from "./run-selected-course-import";

const PROGRAMME_CODE_PATTERN = /^[A-Z0-9-]+$/;

export type ProgrammeImportProgress = {
  action: "created" | "updated" | "unchanged" | "failed" | "fetching";
  code: string;
  index?: number;
  kind: "programme" | "course";
  message: string;
  sourceUrl?: string;
  total?: number;
};

export type ProgrammeImportResult = {
  courseCounts: {
    added: number;
    changed: number;
    failed: number;
    unchanged: number;
  };
  programme: {
    action: "created" | "updated" | "unchanged";
    code: string;
    runId: string;
    sourceUrl: string;
  };
};

function configuredImportDatabaseUrl() {
  const connectionString = process.env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) throw new CatalogueImportConfigurationError();
  return connectionString;
}

function normaliseProgrammeCodes(programmeCodes: readonly string[]) {
  const codes = [
    ...new Set(programmeCodes.map((code) => code.trim().toUpperCase())),
  ];
  if (codes.length !== 1 || !PROGRAMME_CODE_PATTERN.test(codes[0] ?? "")) {
    throw new TypeError("Choose one ANU programme to run at a time.");
  }
  return codes;
}

async function loadProgramme(catalogueYear: number, code: string) {
  return fetchAnuProgrammeDocument({ catalogueYear, programmeCode: code });
}

/**
 * A local, deliberately serial runner. Fetches course documents before each
 * small import so the browser can report a concrete status for every page.
 */
export async function runSelectedProgrammeImport({
  catalogueYear,
  programmeCodes,
  onProgress,
}: {
  catalogueYear: number;
  programmeCodes: readonly string[];
  onProgress: (progress: ProgrammeImportProgress) => void | Promise<void>;
}): Promise<ProgrammeImportResult> {
  assertSupportedCatalogueYear(catalogueYear);
  const [programmeCode] = normaliseProgrammeCodes(programmeCodes);
  const programme: AnuProgrammeDocument = await loadProgramme(
    catalogueYear,
    programmeCode,
  );
  const sql = isDemoMode()
    ? await createLocalDatabaseClient()
    : createHostedCatalogueDatabaseClient(configuredImportDatabaseUrl());

  try {
    const courseTotal = programme.courseCodes.length;
    await onProgress({
      action: "fetching",
      code: programme.code,
      kind: "programme",
      message: "Saving programme structure and requirement text",
      sourceUrl: programme.canonicalUrl,
      total: courseTotal,
    });
    const programmeResult = await importProgrammeDocument(sql, programme);
    await onProgress({
      action: programmeResult.action,
      code: programme.code,
      kind: "programme",
      message: "Programme imported",
      sourceUrl: programme.canonicalUrl,
      total: courseTotal,
    });

    const courseCounts = { added: 0, changed: 0, failed: 0, unchanged: 0 };
    for (const [offset, courseCode] of programme.courseCodes.entries()) {
      const index = offset + 1;
      await onProgress({
        action: "fetching",
        code: courseCode,
        index,
        kind: "course",
        message: "Fetching course page",
        total: courseTotal,
      });
      try {
        const manifest = await fetchAnuCourseManifest({
          catalogueYear,
          courseCodes: [courseCode],
          concurrency: 1,
        });
        const result = await importCatalogueManifest(sql, manifest);
        const action = result.counts.added
          ? "created"
          : result.counts.changed
            ? "updated"
            : result.counts.failed
              ? "failed"
              : "unchanged";
        courseCounts.added += result.counts.added;
        courseCounts.changed += result.counts.changed;
        courseCounts.failed += result.counts.failed;
        courseCounts.unchanged += result.counts.unchanged;
        await onProgress({
          action,
          code: courseCode,
          index,
          kind: "course",
          message:
            action === "failed" ? "Course needs review" : "Course imported",
          sourceUrl: `https://programsandcourses.anu.edu.au/${catalogueYear}/course/${courseCode}`,
          total: courseTotal,
        });
      } catch (error) {
        courseCounts.failed += 1;
        await onProgress({
          action: "failed",
          code: courseCode,
          index,
          kind: "course",
          message:
            error instanceof Error ? error.message : "Course import failed",
          total: courseTotal,
        });
      }
    }

    return {
      courseCounts,
      programme: {
        action: programmeResult.action,
        code: programme.code,
        runId: programmeResult.runId,
        sourceUrl: programmeResult.sourceUrl,
      },
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
