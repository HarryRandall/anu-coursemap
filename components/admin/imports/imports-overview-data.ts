import type { Database } from "@/types/database";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ImportItemRow =
  Database["public"]["Tables"]["catalogue_import_items"]["Row"];
type ReviewItemRow =
  Database["public"]["Tables"]["catalogue_review_items"]["Row"];
type SourceDocumentRow =
  Database["public"]["Tables"]["catalogue_source_documents"]["Row"];

export type ImportReviewStatus =
  "ready" | "needs-review" | "blocked" | "failed";

export type ImportReviewRow = {
  checkedAt: string;
  code: string;
  detail: string;
  href: string;
  issue?: string;
  sourceCount: number;
  sourceSummary: string;
  status: ImportReviewStatus;
  title: string;
  year: number;
};

export type ImportActivityResult =
  "changed" | "unchanged" | "review" | "failed";

export type ImportActivityRow = {
  code: string;
  href: string;
  pageCount: number;
  pageSummary: string;
  result: ImportActivityResult;
  stage: string;
  title: string;
  year: number;
};

export type HistoricalStatus = "new" | "in-review" | "resolved";

export type HistoricalChangeRow = {
  checkedAt: string;
  code: string;
  href: string;
  summary: string;
  status: HistoricalStatus;
  title: string;
  year: number;
};

export type ImportRunView = {
  addedCount: number;
  changedCount: number;
  checkedCount: number;
  completedAt: string | null;
  errorSummary: string | null;
  expectedCount: number | null;
  failedCount: number;
  id: string;
  parserVersion: string;
  scopeLabel: string;
  sourceName: string;
  sourcePageCount: number;
  startedAt: string;
  status: string;
  triggerKind: string;
  unchangedCount: number;
  year: number;
};

export type ImportsDashboardData = {
  activity: ImportActivityRow[];
  error: string | null;
  historical: HistoricalChangeRow[];
  historicalOpenCount: number;
  mode: "demo" | "live" | "unavailable";
  review: ImportReviewRow[];
  run: ImportRunView | null;
};

const DEMO_CHECKED_AT = "2026-08-20T02:21:00+10:00";

/** Static dashboard evidence used only by the explicit local demo mode. */
export const DEMO_IMPORTS_DASHBOARD_FIXTURE: ImportsDashboardData = {
  activity: [
    {
      code: "COMP1100",
      href: "/admin/courses/COMP1100",
      pageCount: 2,
      pageSummary: "Course page and class summary",
      result: "unchanged",
      stage: "Complete",
      title: "Programming as Problem Solving",
      year: 2026,
    },
    {
      code: "COMP2100",
      href: "/admin/courses/COMP2100",
      pageCount: 2,
      pageSummary: "Course page and class summary",
      result: "changed",
      stage: "Candidate ready",
      title: "Software Design Methodologies",
      year: 2026,
    },
    {
      code: "COMP3600",
      href: "/admin/courses/COMP3600",
      pageCount: 2,
      pageSummary: "Course page and class summary",
      result: "failed",
      stage: "Validation",
      title: "Algorithms",
      year: 2026,
    },
    {
      code: "COMP8430",
      href: "/admin/courses/COMP8430",
      pageCount: 2,
      pageSummary: "Course page and class summary",
      result: "review",
      stage: "Review",
      title: "Data Wrangling",
      year: 2026,
    },
  ],
  error: null,
  historical: [
    {
      checkedAt: "2026-08-16T02:24:00+10:00",
      code: "COMP2100",
      href: "/admin/courses/COMP2100",
      summary: "Assessment summary changed",
      status: "new",
      title: "Software Design Methodologies",
      year: 2025,
    },
    {
      checkedAt: "2026-08-16T02:27:00+10:00",
      code: "MATH1005",
      href: "/admin/courses/MATH1005",
      summary: "Offering text changed",
      status: "in-review",
      title: "Discrete Mathematical Models",
      year: 2024,
    },
    {
      checkedAt: "2026-08-16T02:31:00+10:00",
      code: "POLS1002",
      href: "/admin/courses/POLS1002",
      summary: "Source page missing",
      status: "new",
      title: "Introduction to Politics",
      year: 2023,
    },
    {
      checkedAt: "2026-08-09T02:19:00+10:00",
      code: "COMP3600",
      href: "/admin/courses/COMP3600",
      summary: "Convener wording changed",
      status: "resolved",
      title: "Algorithms",
      year: 2022,
    },
  ],
  historicalOpenCount: 3,
  mode: "demo",
  review: [
    {
      checkedAt: DEMO_CHECKED_AT,
      code: "COMP3600",
      detail: "7 fields changed",
      href: "/admin/courses/COMP3600",
      issue: "Nested prerequisite logic did not validate exactly",
      sourceCount: 2,
      sourceSummary: "Course page and class summary",
      status: "blocked",
      title: "Algorithms",
      year: 2026,
    },
    {
      checkedAt: "2026-08-20T02:19:00+10:00",
      code: "COMP8430",
      detail: "8 fields changed",
      href: "/admin/courses/COMP8430",
      sourceCount: 2,
      sourceSummary: "Course page and class summary",
      status: "ready",
      title: "Data Wrangling",
      year: 2026,
    },
    {
      checkedAt: "2026-08-20T02:17:00+10:00",
      code: "MATH1005",
      detail: "6 fields changed",
      href: "/admin/courses/MATH1005",
      sourceCount: 2,
      sourceSummary: "Course page and class summary",
      status: "ready",
      title: "Discrete Mathematical Models",
      year: 2026,
    },
  ],
  run: {
    addedCount: 0,
    changedCount: 2,
    checkedCount: 18,
    completedAt: null,
    errorSummary: null,
    expectedCount: 24,
    failedCount: 0,
    id: "run_26aug20_0215",
    parserVersion: "2.3.1",
    scopeLabel: "24-course pilot",
    sourceName: "ANU Programs and Courses",
    sourcePageCount: 42,
    startedAt: "2026-08-20T02:15:00+10:00",
    status: "running",
    triggerKind: "manual",
    unchangedCount: 15,
    year: 2026,
  },
};

function expectedCount(scope: string) {
  const separator = scope.indexOf(":");
  if (separator < 0) return null;
  const prefix = scope.slice(0, separator);
  if (prefix !== "course_codes" && prefix !== "programme_codes") return null;
  const values = scope
    .slice(separator + 1)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length || null;
}

function scopeLabel(scope: string) {
  const count = expectedCount(scope);
  if (scope.startsWith("course_codes:") && count) {
    return `${count}-course import`;
  }
  if (scope.startsWith("programme_codes:") && count) {
    return `${count}-programme import`;
  }
  if (scope.startsWith("university_calendar:")) return "Key dates import";
  return scope.replaceAll("_", " ");
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function newest(values: string[]) {
  return values.sort((left, right) => right.localeCompare(left))[0];
}

function courseCode(item: ImportItemRow, document?: SourceDocumentRow) {
  const value = item.target_key ?? document?.external_key ?? "";
  const normalised = value.toUpperCase();
  return /^[A-Z]{4}[0-9]{4}$/.test(normalised) ? normalised : null;
}

function reviewStatus(
  items: ImportItemRow[],
  reviews: ReviewItemRow[],
): ImportReviewStatus {
  if (items.some((item) => item.outcome === "failed")) return "failed";
  if (reviews.some((review) => review.status === "open")) {
    return "needs-review";
  }
  if (items.some((item) => item.outcome === "review")) {
    return "needs-review";
  }
  return "ready";
}

function activityResult(
  items: ImportItemRow[],
  reviews: ReviewItemRow[],
): ImportActivityResult {
  if (items.some((item) => item.outcome === "failed")) return "failed";
  if (
    items.some((item) => item.outcome === "review") ||
    reviews.some((review) => review.status === "open")
  ) {
    return "review";
  }
  if (
    items.some(
      (item) => item.outcome === "created" || item.outcome === "updated",
    )
  ) {
    return "changed";
  }
  return "unchanged";
}

function activityStage(result: ImportActivityResult) {
  switch (result) {
    case "failed":
      return "Failed";
    case "review":
      return "Review";
    case "changed":
      return "Candidate ready";
    default:
      return "Complete";
  }
}

export async function loadImportsDashboard(): Promise<ImportsDashboardData> {
  if (isDemoMode()) return DEMO_IMPORTS_DASHBOARD_FIXTURE;

  try {
    const supabase = await createClient();
    const runsResult = await supabase
      .from("catalogue_import_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(40);
    if (runsResult.error) throw runsResult.error;
    const runs = runsResult.data ?? [];
    if (runs.length === 0) {
      return {
        activity: [],
        error: null,
        historical: [],
        historicalOpenCount: 0,
        mode: "live",
        review: [],
        run: null,
      };
    }

    const runIds = runs.map((run) => run.id);
    const yearIds = uniqueNumbers(runs.map((run) => run.catalogue_year_id));
    const sourceIds = uniqueNumbers(runs.map((run) => run.source_id));
    const [yearsResult, sourcesResult, itemsResult] = await Promise.all([
      supabase.from("catalogue_years").select("id,year").in("id", yearIds),
      supabase.from("catalogue_sources").select("id,name").in("id", sourceIds),
      supabase
        .from("catalogue_import_items")
        .select("*")
        .in("run_id", runIds)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    if (yearsResult.error) throw yearsResult.error;
    if (sourcesResult.error) throw sourcesResult.error;
    if (itemsResult.error) throw itemsResult.error;

    const items = itemsResult.data ?? [];
    const itemIds = items.map((item) => item.id);
    const documentIds = uniqueNumbers(
      items.map((item) => item.source_document_id),
    );
    const [documentsResult, reviewsResult] = await Promise.all([
      documentIds.length
        ? supabase
            .from("catalogue_source_documents")
            .select("*")
            .in("id", documentIds)
        : Promise.resolve({ data: [], error: null }),
      itemIds.length
        ? supabase
            .from("catalogue_review_items")
            .select("*")
            .in("import_item_id", itemIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (documentsResult.error) throw documentsResult.error;
    if (reviewsResult.error) throw reviewsResult.error;

    const years = new Map(
      (yearsResult.data ?? []).map((row) => [row.id, row.year]),
    );
    const sources = new Map(
      (sourcesResult.data ?? []).map((row) => [row.id, row.name]),
    );
    const documents = new Map(
      ((documentsResult.data ?? []) as SourceDocumentRow[]).map((row) => [
        row.id,
        row,
      ]),
    );
    const reviews = (reviewsResult.data ?? []) as ReviewItemRow[];
    const reviewsByItem = new Map<number, ReviewItemRow[]>();
    for (const review of reviews) {
      const current = reviewsByItem.get(review.import_item_id) ?? [];
      current.push(review);
      reviewsByItem.set(review.import_item_id, current);
    }

    const courseCodes = uniqueStrings(
      items
        .map((item) => courseCode(item, documents.get(item.source_document_id)))
        .filter((code): code is string => Boolean(code)),
    );
    const courseTitleByKey = new Map<string, string>();
    if (courseCodes.length > 0) {
      const coursesResult = await supabase
        .from("courses")
        .select("id,code")
        .in("code", courseCodes);
      if (coursesResult.error) throw coursesResult.error;
      const courses = coursesResult.data ?? [];
      const courseById = new Map(courses.map((course) => [course.id, course]));
      const courseIds = courses.map((course) => course.id);
      if (courseIds.length > 0) {
        const versionsResult = await supabase
          .from("course_versions")
          .select("catalogue_year_id,course_id,title")
          .in("course_id", courseIds);
        if (versionsResult.error) throw versionsResult.error;
        for (const version of versionsResult.data ?? []) {
          const course = courseById.get(version.course_id);
          if (course) {
            courseTitleByKey.set(
              `${version.catalogue_year_id}:${course.code}`,
              version.title,
            );
          }
        }
      }
    }

    const runsById = new Map(runs.map((run) => [run.id, run]));
    const groupedItems = new Map<string, ImportItemRow[]>();
    for (const item of items) {
      const code = courseCode(item, documents.get(item.source_document_id));
      if (!code || item.target_kind !== "course") continue;
      const key = `${item.run_id}:${code}`;
      const current = groupedItems.get(key) ?? [];
      current.push(item);
      groupedItems.set(key, current);
    }

    const titleFor = (catalogueYearId: number, code: string) =>
      courseTitleByKey.get(`${catalogueYearId}:${code}`) ?? code;
    const currentYear = new Date().getFullYear();
    const reviewCandidates: ImportReviewRow[] = [];
    const activity: ImportActivityRow[] = [];
    const latestRun = runs[0];

    for (const group of groupedItems.values()) {
      const first = group[0];
      const run = runsById.get(first.run_id);
      if (!run) continue;
      const code = courseCode(first, documents.get(first.source_document_id));
      if (!code) continue;
      const year = years.get(run.catalogue_year_id) ?? currentYear;
      const groupReviews = group.flatMap(
        (item) => reviewsByItem.get(item.id) ?? [],
      );
      const groupDocuments = group
        .map((item) => documents.get(item.source_document_id))
        .filter((document): document is SourceDocumentRow => Boolean(document));
      const checkedAt = newest(group.map((item) => item.created_at));
      const result = activityResult(group, groupReviews);

      if (run.id === latestRun.id) {
        activity.push({
          code,
          href: `/admin/courses/${code}`,
          pageCount: uniqueNumbers(group.map((item) => item.source_document_id))
            .length,
          pageSummary:
            uniqueStrings(
              groupDocuments.map((document) =>
                document.entity_kind.replaceAll("_", " "),
              ),
            ).join(", ") || "Source page",
          result,
          stage: activityStage(result),
          title: titleFor(run.catalogue_year_id, code),
          year,
        });
      }

      if (
        year >= currentYear &&
        group.some((item) => !["unchanged", "skipped"].includes(item.outcome))
      ) {
        const openReview = groupReviews.find(
          (review) => review.status === "open",
        );
        const outcome = group.find(
          (item) => item.outcome !== "unchanged",
        )?.outcome;
        reviewCandidates.push({
          checkedAt,
          code,
          detail:
            outcome === "created"
              ? "New course"
              : outcome === "updated"
                ? "Course changed"
                : outcome === "failed"
                  ? "Import failed"
                  : "Review required",
          href: `/admin/courses/${code}`,
          issue: openReview?.summary,
          sourceCount: uniqueNumbers(
            group.map((item) => item.source_document_id),
          ).length,
          sourceSummary:
            uniqueStrings(
              groupDocuments.map((document) =>
                document.entity_kind.replaceAll("_", " "),
              ),
            ).join(", ") || "Source page",
          status: reviewStatus(group, groupReviews),
          title: titleFor(run.catalogue_year_id, code),
          year,
        });
      }
    }

    const latestReviewByCourse = new Map<string, ImportReviewRow>();
    for (const row of reviewCandidates.sort((left, right) =>
      right.checkedAt.localeCompare(left.checkedAt),
    )) {
      const key = `${row.year}:${row.code}`;
      if (!latestReviewByCourse.has(key)) latestReviewByCourse.set(key, row);
    }

    const historical: HistoricalChangeRow[] = reviews
      .map((review) => {
        const item = items.find(
          (candidate) => candidate.id === review.import_item_id,
        );
        if (!item || item.target_kind !== "course") return null;
        const run = runsById.get(item.run_id);
        if (!run) return null;
        const year = years.get(run.catalogue_year_id);
        if (!year || year >= currentYear) return null;
        const code = courseCode(item, documents.get(item.source_document_id));
        if (!code) return null;
        const status: HistoricalStatus =
          review.status === "open"
            ? review.assigned_to
              ? "in-review"
              : "new"
            : "resolved";
        return {
          checkedAt: review.created_at,
          code,
          href: `/admin/courses/${code}`,
          summary: review.summary,
          status,
          title: titleFor(run.catalogue_year_id, code),
          year,
        };
      })
      .filter((row): row is HistoricalChangeRow => Boolean(row))
      .sort((left, right) => right.checkedAt.localeCompare(left.checkedAt));

    const latestRunItems = items.filter((item) => item.run_id === latestRun.id);
    const runView: ImportRunView = {
      addedCount: latestRun.added_count,
      changedCount: latestRun.changed_count,
      checkedCount: latestRun.checked_count,
      completedAt: latestRun.completed_at,
      errorSummary: latestRun.error_summary,
      expectedCount: expectedCount(latestRun.scope),
      failedCount: latestRun.failed_count,
      id: latestRun.id,
      parserVersion: latestRun.parser_version,
      scopeLabel: scopeLabel(latestRun.scope),
      sourceName: sources.get(latestRun.source_id) ?? "Catalogue source",
      sourcePageCount: uniqueNumbers(
        latestRunItems.map((item) => item.source_document_id),
      ).length,
      startedAt: latestRun.started_at,
      status: latestRun.status,
      triggerKind: latestRun.trigger_kind,
      unchangedCount: latestRun.unchanged_count,
      year: years.get(latestRun.catalogue_year_id) ?? currentYear,
    };

    return {
      activity: activity.sort((left, right) =>
        left.code.localeCompare(right.code),
      ),
      error: null,
      historical,
      historicalOpenCount: historical.filter((row) => row.status !== "resolved")
        .length,
      mode: "live",
      review: [...latestReviewByCourse.values()],
      run: runView,
    };
  } catch {
    return {
      activity: [],
      error:
        "Import records could not be loaded. No catalogue status is being inferred.",
      historical: [],
      historicalOpenCount: 0,
      mode: "unavailable",
      review: [],
      run: null,
    };
  }
}
