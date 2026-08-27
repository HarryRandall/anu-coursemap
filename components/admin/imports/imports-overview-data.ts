import type { Database } from "@/types/database";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ImportItemRow =
  Database["public"]["Tables"]["catalogue_import_items"]["Row"];
type ImportRunRow =
  Database["public"]["Tables"]["catalogue_import_runs"]["Row"];
type ReviewItemRow =
  Database["public"]["Tables"]["catalogue_review_items"]["Row"];
type SourceDocumentRow =
  Database["public"]["Tables"]["catalogue_source_documents"]["Row"];
type DiagnosticRow =
  Database["public"]["Tables"]["catalogue_import_diagnostics"]["Row"];

/**
 * A parser diagnostic: what the importer observed about the page, not what
 * changed in the catalogue. These belong to their run, not to a review queue --
 * nobody accepts or dismisses them.
 */
export type ImportDiagnostic = {
  courseCode: string | null;
  field: string | null;
  id: number;
  issueCode: string;
  severity: "warning" | "error";
  summary: string;
};

export type ImportRun = {
  adapter: string;
  /**
   * The codes the run touched, sorted. The list used to describe runs by
   * counts alone, which made every single-course row read "1 checked, 1
   * changed" and told a reader nothing about which course it was.
   */
  courseCodes: string[];
  diagnostics: ImportDiagnostic[];
  errorCount: number;
  addedCount: number;
  changedCount: number;
  checkedCount: number;
  completedAt: string | null;
  errorOutput: string | null;
  failedCount: number;
  id: string;
  sourcePageCount: number;
  startedAt: string;
  status: string;
  type: "Courses" | "Programmes";
  year: number;
};

export type ImportFlagStatus = "open" | "accepted" | "rejected" | "resolved";
export type ImportFlagCategory =
  "Discontinued" | "Units" | "Prerequisites" | "Code changed" | "Availability";

export type ImportFlag = {
  adapter: string;
  category: ImportFlagCategory;
  code: string;
  detectedAt: string;
  field: string;
  id: number;
  /** Null means the source removed the value. */
  newValue: string | null;
  /** Null means the source added it. */
  oldValue: string | null;
  sourcePageCount: number;
  sourceUrl: string;
  status: ImportFlagStatus;
  summary: string;
  year: number;
};

export type ImportsDashboardData = {
  catalogueYears: number[];
  error: string | null;
  flags: ImportFlag[];
  mode: "demo" | "live" | "unavailable";
  runs: ImportRun[];
};

const DEMO_ADAPTER = "anu-programs-courses-course-v2";

/** Static operator-console evidence used only by explicit local demo mode. */
export const DEMO_IMPORTS_DASHBOARD_FIXTURE: ImportsDashboardData = {
  catalogueYears: [2027, 2026, 2025, 2024],
  error: null,
  flags: [
    {
      adapter: DEMO_ADAPTER,
      category: "Availability",
      code: "MATH1013",
      detectedAt: "2026-08-24T14:32:00+10:00",
      field: "offering",
      id: 9001,
      newValue: null,
      oldValue: "First Semester, Second Semester",
      sourcePageCount: 1,
      sourceUrl: "https://programsandcourses.anu.edu.au/2027/course/MATH1013",
      status: "open",
      summary:
        "An existing offering was preserved after it disappeared from this source.",
      year: 2027,
    },
    {
      adapter: DEMO_ADAPTER,
      category: "Prerequisites",
      code: "COMP2620",
      detectedAt: "2026-08-24T09:15:00+10:00",
      field: "course.requisites.prerequisite",
      id: 9002,
      newValue: "Completion of COMP1600 and COMP2100",
      oldValue: "Completion of COMP1600",
      sourcePageCount: 1,
      sourceUrl: "https://programsandcourses.anu.edu.au/2027/course/COMP2620",
      status: "open",
      summary:
        "An existing structured prerequisite rule was preserved; the new raw source requires manual reconciliation.",
      year: 2027,
    },
    {
      adapter: DEMO_ADAPTER,
      category: "Prerequisites",
      code: "STAT2001",
      detectedAt: "2026-08-21T11:08:00+10:00",
      field: "course.requisites.incompatibility",
      id: 9003,
      newValue: null,
      oldValue: "Incompatible with STAT2008",
      sourcePageCount: 1,
      sourceUrl: "https://programsandcourses.anu.edu.au/2027/course/STAT2001",
      status: "open",
      summary:
        "An existing incompatibility rule was preserved after it disappeared from this source.",
      year: 2027,
    },
  ],
  mode: "demo",
  runs: [
    {
      adapter: DEMO_ADAPTER,
      addedCount: 0,
      changedCount: 1,
      checkedCount: 1,
      completedAt: "2026-08-26T14:32:02.100+10:00",
      courseCodes: ["MATH1013"],
      errorOutput: null,
      failedCount: 0,
      diagnostics: [],
      errorCount: 0,
      id: "demo-run-1",
      sourcePageCount: 1,
      startedAt: "2026-08-26T14:32:00+10:00",
      status: "succeeded",
      type: "Courses",
      year: 2027,
    },
    {
      adapter: "anu-programs-courses-programme-v1",
      addedCount: 4,
      changedCount: 8,
      checkedCount: 84,
      completedAt: "2026-08-24T09:15:41+10:00",
      courseCodes: ["COMP1110", "COMP1140", "COMP2100", "COMP2300"],
      errorOutput: null,
      failedCount: 0,
      diagnostics: [
        {
          courseCode: "COMP1110",
          field: "course.requisites.rawText",
          id: 8101,
          issueCode: "UNSTRUCTURED_REQUISITE_TEXT",
          severity: "warning",
          summary:
            "Requisite and incompatibility logic is preserved as source text and requires structured review.",
        },
      ],
      errorCount: 0,
      id: "demo-run-2",
      sourcePageCount: 84,
      startedAt: "2026-08-24T09:15:00+10:00",
      status: "succeeded",
      type: "Programmes",
      year: 2027,
    },
    {
      adapter: DEMO_ADAPTER,
      addedCount: 0,
      changedCount: 0,
      checkedCount: 3,
      completedAt: "2026-08-22T18:02:08+10:00",
      courseCodes: ["ARCH8037", "ARCH8038", "ARCH8039"],
      errorOutput: "failed after 3 pages",
      failedCount: 1,
      diagnostics: [
        {
          courseCode: "ARCH8037",
          field: "offering.sessions",
          id: 8102,
          issueCode: "INVALID_OFFERING_DATES",
          severity: "error",
          summary:
            "The First Semester offering has missing, malformed or out-of-scope dates.",
        },
      ],
      errorCount: 1,
      id: "demo-run-3",
      sourcePageCount: 3,
      startedAt: "2026-08-22T18:02:00+10:00",
      status: "failed",
      type: "Courses",
      year: 2027,
    },
  ],
};

/**
 * The import pages need the year list and nothing else. Reaching for the whole
 * dashboard would run the run history, its items and their diagnostics to fill
 * a four-option select.
 */
export async function loadCatalogueYears(): Promise<number[]> {
  if (isDemoMode()) return DEMO_IMPORTS_DASHBOARD_FIXTURE.catalogueYears;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("catalogue_years")
      .select("year")
      .order("year", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => row.year);
  } catch {
    const currentYear = new Date().getFullYear();
    return [currentYear + 1, currentYear];
  }
}

/**
 * Just the number the sidebar badge needs. The full dashboard load is far too
 * much work to run on every admin page purely to colour one nav item.
 */
export async function loadOpenChangeCount(): Promise<number> {
  if (isDemoMode()) {
    return DEMO_IMPORTS_DASHBOARD_FIXTURE.flags.filter(
      (flag) => flag.status === "open",
    ).length;
  }

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("catalogue_review_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    if (error) throw error;
    return count ?? 0;
  } catch {
    // A badge is not worth failing an admin page over.
    return 0;
  }
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
}

function courseCode(item: ImportItemRow, document?: SourceDocumentRow) {
  const value = item.target_key ?? document?.external_key ?? "";
  const normalised = value.toUpperCase();
  return /^[A-Z]{4}[0-9]{4}$/.test(normalised) ? normalised : null;
}

function flagValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((entry) => flagValue(entry)).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return JSON.stringify(value, null, 2);
}

function diagnosticSeverity(value: string): ImportDiagnostic["severity"] {
  return value === "error" ? "error" : "warning";
}

function flagCategory(field: string): ImportFlagCategory {
  const normalised = field.startsWith("course.")
    ? field.slice("course.".length)
    : field;
  if (normalised === "units" || normalised.startsWith("units.")) return "Units";
  if (normalised === "code" || normalised.startsWith("code.")) {
    return "Code changed";
  }
  if (
    normalised.startsWith("course.requisites") ||
    normalised.startsWith("requisites")
  ) {
    return "Prerequisites";
  }
  if (normalised.startsWith("offering")) return "Availability";
  return "Discontinued";
}

function compactSummary(summary: string) {
  const value = summary.trim().replace(/\s+/g, " ");
  return value.length > 72 ? `${value.slice(0, 69).trimEnd()}...` : value;
}

function validFlagStatus(status: string): status is ImportFlagStatus {
  return ["open", "accepted", "rejected", "resolved"].includes(status);
}

function runType(scope: string): ImportRun["type"] | null {
  if (scope.startsWith("course_codes:")) return "Courses";
  if (scope.startsWith("programme_codes:")) return "Programmes";
  return null;
}

function groupSourcePageCounts(items: ImportItemRow[]) {
  const pages = new Map<string, Set<number>>();
  for (const item of items) {
    const current = pages.get(item.run_id) ?? new Set<number>();
    current.add(item.source_document_id);
    pages.set(item.run_id, current);
  }
  return pages;
}

function groupCourseCodes(
  items: ImportItemRow[],
  documents: Map<number, SourceDocumentRow>,
) {
  const codes = new Map<string, Set<string>>();
  for (const item of items) {
    const code = courseCode(item, documents.get(item.source_document_id));
    if (!code) continue;
    const current = codes.get(item.run_id) ?? new Set<string>();
    current.add(code);
    codes.set(item.run_id, current);
  }
  return codes;
}

export async function loadImportsDashboard(): Promise<ImportsDashboardData> {
  if (isDemoMode()) return DEMO_IMPORTS_DASHBOARD_FIXTURE;

  try {
    const supabase = await createClient();
    const [runsResult, yearsResult, sourcesResult, reviewsResult] =
      await Promise.all([
        supabase
          .from("catalogue_import_runs")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(200),
        supabase
          .from("catalogue_years")
          .select("id,year")
          .order("year", { ascending: false }),
        supabase.from("catalogue_sources").select("id,name,kind,base_url"),
        supabase
          .from("catalogue_review_items")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    if (runsResult.error) throw runsResult.error;
    if (yearsResult.error) throw yearsResult.error;
    if (sourcesResult.error) throw sourcesResult.error;
    if (reviewsResult.error) throw reviewsResult.error;

    const allRuns = (runsResult.data ?? []) as ImportRunRow[];
    const eligibleRuns = allRuns.filter((run) => runType(run.scope) !== null);
    const recentRuns = eligibleRuns.slice(0, 20);
    const reviews = (reviewsResult.data ?? []) as ReviewItemRow[];
    const recentRunIds = recentRuns.map((run) => run.id);
    const reviewItemIds = reviews.map((review) => review.import_item_id);

    let recentItems: ImportItemRow[] = [];
    if (recentRunIds.length > 0) {
      const result = await supabase
        .from("catalogue_import_items")
        .select("*")
        .in("run_id", recentRunIds)
        .limit(5000);
      if (result.error) throw result.error;
      recentItems = (result.data ?? []) as ImportItemRow[];
    }

    let diagnosticRows: DiagnosticRow[] = [];
    let reviewItems: ImportItemRow[] = [];
    if (reviewItemIds.length > 0) {
      const result = await supabase
        .from("catalogue_import_items")
        .select("*")
        .in("id", reviewItemIds);
      if (result.error) throw result.error;
      reviewItems = (result.data ?? []) as ImportItemRow[];
    }

    const recentItemIds = recentItems.map((item) => item.id);
    if (recentItemIds.length > 0) {
      const result = await supabase
        .from("catalogue_import_diagnostics")
        .select("*")
        .in("import_item_id", recentItemIds)
        .order("severity", { ascending: true })
        .limit(2000);
      if (result.error) throw result.error;
      diagnosticRows = (result.data ?? []) as DiagnosticRow[];
    }

    const itemsById = new Map<number, ImportItemRow>();
    [...recentItems, ...reviewItems].forEach((item) =>
      itemsById.set(item.id, item),
    );
    const items = [...itemsById.values()];
    const documentIds = uniqueNumbers(
      items.map((item) => item.source_document_id),
    );
    let sourceDocuments: SourceDocumentRow[] = [];
    if (documentIds.length > 0) {
      const result = await supabase
        .from("catalogue_source_documents")
        .select("*")
        .in("id", documentIds);
      if (result.error) throw result.error;
      sourceDocuments = (result.data ?? []) as SourceDocumentRow[];
    }

    const years = new Map(
      (yearsResult.data ?? []).map((year) => [year.id, year.year]),
    );
    const sources = new Map(
      (sourcesResult.data ?? []).map((source) => [source.id, source]),
    );
    const runsById = new Map(allRuns.map((run) => [run.id, run]));
    const documents = new Map(
      sourceDocuments.map((document) => [document.id, document]),
    );
    const pageCounts = groupSourcePageCounts(items);
    const codesByRun = groupCourseCodes(recentItems, documents);

    const diagnosticsByRun = new Map<string, ImportDiagnostic[]>();
    for (const row of diagnosticRows) {
      const item = itemsById.get(row.import_item_id);
      if (!item) continue;
      const existing = diagnosticsByRun.get(item.run_id) ?? [];
      existing.push({
        courseCode: courseCode(item, documents.get(item.source_document_id)),
        field: row.field,
        id: row.id,
        issueCode: row.issue_code,
        severity: diagnosticSeverity(row.severity),
        summary: row.summary,
      });
      diagnosticsByRun.set(item.run_id, existing);
    }

    const runs: ImportRun[] = recentRuns.flatMap((run) => {
      const type = runType(run.scope);
      if (!type) return [];
      const diagnostics = diagnosticsByRun.get(run.id) ?? [];
      return [
        {
          adapter: run.parser_version,
          courseCodes: [...(codesByRun.get(run.id) ?? [])].sort(),
          diagnostics,
          errorCount: diagnostics.filter((entry) => entry.severity === "error")
            .length,
          addedCount: run.added_count,
          changedCount: run.changed_count,
          checkedCount: run.checked_count,
          completedAt: run.completed_at,
          errorOutput: run.error_summary,
          failedCount: run.failed_count,
          id: run.id,
          sourcePageCount: pageCounts.get(run.id)?.size ?? 0,
          startedAt: run.started_at,
          status: run.status,
          type,
          year: years.get(run.catalogue_year_id) ?? new Date().getFullYear(),
        },
      ];
    });

    const flags: ImportFlag[] = reviews.flatMap((review) => {
      const item = itemsById.get(review.import_item_id);
      if (!item || !item.target_kind?.startsWith("course")) return [];
      const run = runsById.get(item.run_id);
      const document = documents.get(item.source_document_id);
      const code = courseCode(item, document);
      if (!run || !code || !validFlagStatus(review.status)) return [];

      // catalogue_review_items only holds catalogue changes now, and the
      // database rejects a row that cannot state at least one side of the
      // change. There is nothing left to guess at or fall back to.
      return [
        {
          adapter: run.parser_version,
          category: flagCategory(review.field),
          code,
          detectedAt: review.created_at,
          field: review.field,
          id: review.id,
          newValue: flagValue(review.new_value),
          oldValue: flagValue(review.old_value),
          sourcePageCount: pageCounts.get(run.id)?.size ?? 1,
          sourceUrl:
            document?.canonical_url ??
            sources.get(run.source_id)?.base_url ??
            "",
          status: review.status,
          summary: compactSummary(review.summary),
          year: years.get(run.catalogue_year_id) ?? new Date().getFullYear(),
        },
      ];
    });

    return {
      catalogueYears: (yearsResult.data ?? []).map((year) => year.year),
      error: null,
      flags,
      mode: "live",
      runs,
    };
  } catch (cause) {
    // The reason matters: an RLS denial, a missing column after a migration and
    // a dropped connection all used to collapse into the same sentence, which
    // made the admin page unfixable from what it showed.
    const detail =
      cause instanceof Error
        ? cause.message
        : typeof cause === "string"
          ? cause
          : "Unknown error";
    console.error("loadImportsDashboard failed", cause);
    const currentYear = new Date().getFullYear();
    return {
      catalogueYears: [currentYear + 1, currentYear],
      error: `Import records could not be loaded: ${detail}. No catalogue status is being inferred.`,
      flags: [],
      mode: "unavailable",
      runs: [],
    };
  }
}
