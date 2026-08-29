import type { Database, Json } from "@/types/database";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { COURSE_SNAPSHOT_RELATIONAL_QUERY_SHAPE } from "@/lib/coursemap/course-import-query-shape";

export const COURSE_IMPORT_YEARS = Array.from(
  { length: 11 },
  (_, index) => 2020 + index,
);

export type CourseDirectoryStatus =
  | "all"
  | "directory"
  | "queued"
  | "processing"
  | "needs-review"
  | "draft"
  | "published"
  | "unchanged"
  | "failed";

export type AcademicYearOption = {
  id: number | null;
  year: number;
  importEnabled: boolean;
  sourceAvailability: "available" | "unavailable" | "unknown";
  availabilityCheckedAt: string | null;
  availabilityNote: string | null;
  directoryRefreshedAt: string | null;
};

export type CourseDirectoryRecord = {
  id: number;
  code: string;
  title: string;
  units: number | null;
  academicCareer: string | null;
  session: string | null;
  modeOfDelivery: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
  courseId: number | null;
  courseYearId: number | null;
  draftSnapshotId: number | null;
  publishedSnapshotId: number | null;
  latestImport: {
    runId: string;
    targetId: string;
    processingStatus: string;
    reviewStatus: string;
    changeKind: string | null;
    errorSummary: string | null;
    createdAt: string;
  } | null;
};

export type CourseDirectoryPage = {
  year: AcademicYearOption;
  records: CourseDirectoryRecord[];
  page: number;
  pageSize: number;
  total: number;
  activeRun: {
    id: string;
    status: string;
    targetCount: number;
    processedCount: number;
  } | null;
};

export type CourseImportRunSummary = {
  id: string;
  academicYear: number;
  status: string;
  requestedModel: string;
  targetCount: number;
  processedCount: number;
  readyForReviewCount: number;
  unchangedCount: number;
  failedCount: number;
  extractionCount: number;
  inputTokens: number;
  outputTokens: number;
  actualCostUsd: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorSummary: string | null;
  courseCodes: string[];
};

export type CourseImportRunPage = {
  records: CourseImportRunSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type CourseImportRunTarget = {
  id: string;
  courseCode: string;
  position: number;
  processingStatus: string;
  reviewStatus: string;
  changeKind: string | null;
  attemptCount: number;
  errorCode: string | null;
  errorSummary: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  extraction: {
    requestedModel: string;
    resolvedModel: string | null;
    validationStatus: string;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    costUsd: number;
    costSource: string;
    latencyMs: number | null;
  } | null;
};

export type CourseImportRunDetail = {
  run: CourseImportRunSummary & {
    parserVersion: string;
    promptVersion: string;
    schemaVersion: string;
    heartbeatAt: string | null;
  };
  targets: CourseImportRunTarget[];
};

export type CourseImportArtifact = {
  id: string;
  kind: string;
  attemptNumber: number;
  mediaType: string;
  byteSize: number;
  contentSha256: string;
  createdAt: string;
};

export type CourseImportReviewItem = {
  id: string;
  entityKind: string;
  entityKey: string;
  fieldPath: string;
  issueCode: string;
  importance: string;
  isBlocking: boolean;
  confidence: number | null;
  summary: string;
  oldValue: Json | null;
  newValue: Json | null;
  sourceLocator: string | null;
  sourceExcerpt: string | null;
  status: string;
  resolutionNote: string | null;
};

export type CourseImportTargetDetail = {
  run: {
    id: string;
    academicYear: number;
    status: string;
    requestedModel: string;
  };
  target: {
    id: string;
    courseCode: string;
    processingStatus: string;
    reviewStatus: string;
    changeKind: string | null;
    attemptCount: number;
    baselineDraftSnapshotId: number | null;
    baselinePublishedSnapshotId: number | null;
    candidateSnapshotId: number | null;
    currentDraftSnapshotId: number | null;
    currentPublishedSnapshotId: number | null;
    errorCode: string | null;
    errorSummary: string | null;
    createdAt: string;
    finishedAt: string | null;
  };
  candidateSnapshot:
    Database["public"]["Tables"]["course_snapshots"]["Row"] | null;
  sourceDocument:
    Database["public"]["Tables"]["course_source_documents"]["Row"] | null;
  stages: Array<Database["public"]["Tables"]["course_import_stages"]["Row"]>;
  artifacts: CourseImportArtifact[];
  extractions: Array<Database["public"]["Tables"]["course_extractions"]["Row"]>;
  reviewItems: CourseImportReviewItem[];
  relationalData: Record<string, unknown>;
};

type ImportTargetRow =
  Database["public"]["Tables"]["course_import_targets"]["Row"];
type ImportRunRow = Database["public"]["Tables"]["course_import_runs"]["Row"];
type ExtractionRow = Database["public"]["Tables"]["course_extractions"]["Row"];
type AdminDirectoryEntryRow =
  Database["public"]["Views"]["course_directory_admin_entries"]["Row"];

function assertCompleteDirectoryEntry(
  entry: AdminDirectoryEntryRow,
): asserts entry is AdminDirectoryEntryRow & {
  id: number;
  code: string;
  title: string;
  first_seen_at: string;
  last_seen_at: string;
  is_current: boolean;
} {
  if (
    entry.id === null ||
    entry.code === null ||
    entry.title === null ||
    entry.first_seen_at === null ||
    entry.last_seen_at === null ||
    entry.is_current === null
  ) {
    throw new Error("The course directory view returned an incomplete row.");
  }
}

function safePage(value: number | undefined) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 1;
}

function safeSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .slice(0, 120)
    .replace(/[^A-Za-z0-9 &-]/g, " ")
    .replace(/\s+/g, " ");
}

function normaliseAvailability(value: string) {
  return value === "available" || value === "unavailable" ? value : "unknown";
}

function defaultAcademicYear(year: number): AcademicYearOption {
  return {
    id: null,
    year,
    importEnabled: false,
    sourceAvailability: "unknown",
    availabilityCheckedAt: null,
    availabilityNote: null,
    directoryRefreshedAt: null,
  };
}

export async function loadAcademicYearOptions(): Promise<AcademicYearOption[]> {
  if (isDemoMode()) return COURSE_IMPORT_YEARS.map(defaultAcademicYear);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select(
      "id,year,is_import_enabled,source_availability,availability_checked_at,availability_note,directory_refreshed_at",
    )
    .gte("year", COURSE_IMPORT_YEARS[0]!)
    .lte("year", COURSE_IMPORT_YEARS.at(-1)!)
    .order("year", { ascending: false });
  if (error) throw error;

  const byYear = new Map((data ?? []).map((row) => [row.year, row]));
  return COURSE_IMPORT_YEARS.toReversed().map((year) => {
    const row = byYear.get(year);
    return row
      ? {
          id: row.id,
          year: row.year,
          importEnabled: row.is_import_enabled,
          sourceAvailability: normaliseAvailability(row.source_availability),
          availabilityCheckedAt: row.availability_checked_at,
          availabilityNote: row.availability_note,
          directoryRefreshedAt: row.directory_refreshed_at,
        }
      : defaultAcademicYear(year);
  });
}

export async function loadCourseDirectoryPage({
  year,
  page,
  query,
  status = "all",
  pageSize = 50,
}: {
  year: number;
  page?: number;
  query?: string;
  status?: CourseDirectoryStatus;
  pageSize?: number;
}): Promise<CourseDirectoryPage> {
  const currentPage = safePage(page);
  const currentPageSize = Math.min(100, Math.max(10, Math.floor(pageSize)));
  const years = await loadAcademicYearOptions();
  const selectedYear =
    years.find((option) => option.year === year) ?? years[0]!;

  if (isDemoMode() || selectedYear.id === null) {
    return {
      year: selectedYear,
      records: [],
      page: currentPage,
      pageSize: currentPageSize,
      total: 0,
      activeRun: null,
    };
  }

  const supabase = await createClient();
  const activeRunPromise = supabase
    .from("course_import_runs")
    .select("id,status,target_count,processed_count")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let entriesQuery = supabase
    .from("course_directory_admin_entries")
    .select("*", { count: "exact" })
    .eq("academic_year_id", selectedYear.id)
    .eq("is_current", true);
  const search = safeSearch(query);
  if (search) {
    entriesQuery = entriesQuery.or(
      `code.ilike.*${search}*,title.ilike.*${search}*`,
    );
  }
  if (status === "directory") {
    entriesQuery = entriesQuery
      .is("latest_target_id", null)
      .is("course_year_id", null);
  } else if (status === "draft") {
    entriesQuery = entriesQuery.not("draft_snapshot_id", "is", null);
  } else if (status === "published") {
    entriesQuery = entriesQuery.not("published_snapshot_id", "is", null);
  } else if (status === "needs-review") {
    entriesQuery = entriesQuery.eq("latest_review_status", "pending");
  } else if (status !== "all") {
    entriesQuery = entriesQuery.eq("latest_processing_status", status);
  }

  const start = (currentPage - 1) * currentPageSize;
  const [entriesResult, activeRunResult] = await Promise.all([
    entriesQuery.order("code").range(start, start + currentPageSize - 1),
    activeRunPromise,
  ]);
  if (entriesResult.error) throw entriesResult.error;
  if (activeRunResult.error) throw activeRunResult.error;

  const entries = entriesResult.data ?? [];

  return {
    year: selectedYear,
    page: currentPage,
    pageSize: currentPageSize,
    total: entriesResult.count ?? 0,
    activeRun: activeRunResult.data
      ? {
          id: activeRunResult.data.id,
          status: activeRunResult.data.status,
          targetCount: activeRunResult.data.target_count,
          processedCount: activeRunResult.data.processed_count,
        }
      : null,
    records: entries.map((entry) => {
      assertCompleteDirectoryEntry(entry);
      return {
        id: entry.id,
        code: entry.code,
        title: entry.title,
        units: entry.units,
        academicCareer: entry.academic_career,
        session: entry.session,
        modeOfDelivery: entry.mode_of_delivery,
        firstSeenAt: entry.first_seen_at,
        lastSeenAt: entry.last_seen_at,
        isCurrent: entry.is_current,
        courseId: entry.course_id,
        courseYearId: entry.course_year_id,
        draftSnapshotId: entry.draft_snapshot_id,
        publishedSnapshotId: entry.published_snapshot_id,
        latestImport: entry.latest_target_id
          ? {
              runId: entry.latest_run_id!,
              targetId: entry.latest_target_id,
              processingStatus: entry.latest_processing_status!,
              reviewStatus: entry.latest_review_status!,
              changeKind: entry.latest_change_kind,
              errorSummary: entry.latest_error_summary,
              createdAt: entry.latest_created_at!,
            }
          : null,
      };
    }),
  };
}

function runSummary(
  run: ImportRunRow,
  academicYear: number,
  courseCodes: string[],
): CourseImportRunSummary {
  return {
    id: run.id,
    academicYear,
    status: run.status,
    requestedModel: run.requested_model,
    targetCount: run.target_count,
    processedCount: run.processed_count,
    readyForReviewCount: run.ready_for_review_count,
    unchangedCount: run.unchanged_count,
    failedCount: run.failed_count,
    extractionCount: run.extraction_count,
    inputTokens: run.input_tokens,
    outputTokens: run.output_tokens,
    actualCostUsd: run.actual_cost_usd,
    createdAt: run.created_at,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    errorSummary: run.error_summary,
    courseCodes,
  };
}

export async function loadCourseImportRunPage({
  page,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<CourseImportRunPage> {
  const currentPage = safePage(page);
  const currentPageSize = Math.min(100, Math.max(10, Math.floor(pageSize)));
  if (isDemoMode()) {
    return {
      records: [],
      page: currentPage,
      pageSize: currentPageSize,
      total: 0,
    };
  }

  const supabase = await createClient();
  const start = (currentPage - 1) * currentPageSize;
  const { data, count, error } = await supabase
    .from("course_import_runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + currentPageSize - 1);
  if (error) throw error;
  const runs = (data ?? []) as ImportRunRow[];
  if (runs.length === 0) {
    return {
      records: [],
      page: currentPage,
      pageSize: currentPageSize,
      total: count ?? 0,
    };
  }

  const [yearsResult, targetsResult] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id,year")
      .in("id", [...new Set(runs.map((run) => run.academic_year_id))]),
    supabase
      .from("course_import_targets")
      .select("run_id,course_code,position")
      .in(
        "run_id",
        runs.map((run) => run.id),
      )
      .order("position"),
  ]);
  if (yearsResult.error) throw yearsResult.error;
  if (targetsResult.error) throw targetsResult.error;
  const yearById = new Map(
    (yearsResult.data ?? []).map((row) => [row.id, row.year]),
  );
  const codesByRun = new Map<string, string[]>();
  for (const target of targetsResult.data ?? []) {
    const codes = codesByRun.get(target.run_id) ?? [];
    codes.push(target.course_code);
    codesByRun.set(target.run_id, codes);
  }

  return {
    records: runs.map((run) =>
      runSummary(
        run,
        yearById.get(run.academic_year_id) ?? 0,
        codesByRun.get(run.id) ?? [],
      ),
    ),
    page: currentPage,
    pageSize: currentPageSize,
    total: count ?? 0,
  };
}

export async function loadCourseImportRunDetail(
  runId: string,
): Promise<CourseImportRunDetail | null> {
  if (isDemoMode()) return null;
  const supabase = await createClient();
  const { data: runData, error: runError } = await supabase
    .from("course_import_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runError) throw runError;
  if (!runData) return null;
  const run = runData as ImportRunRow;

  const [yearResult, targetsResult] = await Promise.all([
    supabase
      .from("academic_years")
      .select("year")
      .eq("id", run.academic_year_id)
      .single(),
    supabase
      .from("course_import_targets")
      .select("*")
      .eq("run_id", run.id)
      .order("position"),
  ]);
  if (yearResult.error) throw yearResult.error;
  if (targetsResult.error) throw targetsResult.error;
  const targets = (targetsResult.data ?? []) as ImportTargetRow[];
  const { data: extractionData, error: extractionError } = targets.length
    ? await supabase
        .from("course_extractions")
        .select("*")
        .in(
          "target_id",
          targets.map((target) => target.id),
        )
        .order("extraction_number", { ascending: false })
    : { data: [], error: null };
  if (extractionError) throw extractionError;
  const extractionByTarget = new Map<string, ExtractionRow>();
  for (const extraction of (extractionData ?? []) as ExtractionRow[]) {
    if (!extractionByTarget.has(extraction.target_id)) {
      extractionByTarget.set(extraction.target_id, extraction);
    }
  }

  return {
    run: {
      ...runSummary(
        run,
        yearResult.data.year,
        targets.map((target) => target.course_code),
      ),
      parserVersion: run.parser_version,
      promptVersion: run.prompt_version,
      schemaVersion: run.schema_version,
      heartbeatAt: run.heartbeat_at,
    },
    targets: targets.map((target) => {
      const extraction = extractionByTarget.get(target.id) ?? null;
      return {
        id: target.id,
        courseCode: target.course_code,
        position: target.position,
        processingStatus: target.processing_status,
        reviewStatus: target.review_status,
        changeKind: target.change_kind,
        attemptCount: target.attempt_count,
        errorCode: target.error_code,
        errorSummary: target.error_summary,
        createdAt: target.created_at,
        startedAt: target.claimed_at,
        finishedAt: target.finished_at,
        extraction: extraction
          ? {
              requestedModel: extraction.requested_model,
              resolvedModel: extraction.resolved_model,
              validationStatus: extraction.validation_status,
              inputTokens: extraction.input_tokens,
              cachedInputTokens: extraction.cached_input_tokens,
              outputTokens: extraction.output_tokens,
              reasoningTokens: extraction.reasoning_tokens,
              costUsd: extraction.cost_usd,
              costSource: extraction.cost_source,
              latencyMs: extraction.latency_ms,
            }
          : null,
      };
    }),
  };
}

async function snapshotRelationalData(
  snapshotId: number,
): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const [
    fees,
    areas,
    related,
    attributes,
    unitOptions,
    offerings,
    learningOutcomes,
    assessments,
    rules,
    evidence,
  ] = await Promise.all([
    supabase
      .from("course_fees")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order("position"),
    supabase
      .from("course_areas_of_interest")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order("position"),
    supabase
      .from("course_related_courses")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order("position"),
    supabase
      .from("course_attributes")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order("position"),
    supabase
      .from("course_unit_options")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order("position"),
    supabase
      .from("course_offerings")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order(COURSE_SNAPSHOT_RELATIONAL_QUERY_SHAPE.offeringOrder),
    supabase
      .from("course_learning_outcomes")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order("position"),
    supabase
      .from("course_assessment_items")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order("position"),
    supabase
      .from("course_rules")
      .select("*")
      .eq("course_snapshot_id", snapshotId),
    supabase
      .from("course_snapshot_field_evidence")
      .select("*")
      .eq("course_snapshot_id", snapshotId)
      .order(COURSE_SNAPSHOT_RELATIONAL_QUERY_SHAPE.fieldEvidenceOrder),
  ]);
  const results = [
    fees,
    areas,
    related,
    attributes,
    unitOptions,
    offerings,
    learningOutcomes,
    assessments,
    rules,
    evidence,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const offeringIds = (offerings.data ?? []).map((row) => row.id);
  const assessmentIds = (assessments.data ?? []).map((row) => row.id);
  const ruleIds = (rules.data ?? []).map((row) => row.id);
  const [sessions, assessmentOutcomes, groups, conditions, references] =
    await Promise.all([
      offeringIds.length
        ? supabase
            .from("offering_sessions")
            .select("*")
            .in("course_offering_id", offeringIds)
            .order("position")
        : Promise.resolve({ data: [], error: null }),
      assessmentIds.length
        ? supabase
            .from("course_assessment_outcomes")
            .select("*")
            .in("assessment_item_id", assessmentIds)
        : Promise.resolve({ data: [], error: null }),
      ruleIds.length
        ? supabase
            .from("course_rule_groups")
            .select("*")
            .in("course_rule_id", ruleIds)
            .order("position")
        : Promise.resolve({ data: [], error: null }),
      ruleIds.length
        ? supabase
            .from("course_rule_conditions")
            .select("*")
            .in("course_rule_id", ruleIds)
            .order("position")
        : Promise.resolve({ data: [], error: null }),
      ruleIds.length
        ? supabase
            .from("course_rule_course_references")
            .select("*")
            .in("course_rule_id", ruleIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  const childResults = [
    sessions,
    assessmentOutcomes,
    groups,
    conditions,
    references,
  ];
  const childFailed = childResults.find((result) => result.error);
  if (childFailed?.error) throw childFailed.error;

  const conditionIds = (conditions.data ?? []).map((row) => row.id);
  const conditionCourses = conditionIds.length
    ? await supabase
        .from("course_rule_condition_courses")
        .select("*")
        .in(
          COURSE_SNAPSHOT_RELATIONAL_QUERY_SHAPE.conditionCoursesForeignKey,
          conditionIds,
        )
        .order("position")
    : { data: [], error: null };
  if (conditionCourses.error) throw conditionCourses.error;

  return {
    fees: fees.data ?? [],
    areasOfInterest: areas.data ?? [],
    relatedCourses: related.data ?? [],
    attributes: attributes.data ?? [],
    unitOptions: unitOptions.data ?? [],
    offerings: offerings.data ?? [],
    offeringSessions: sessions.data ?? [],
    learningOutcomes: learningOutcomes.data ?? [],
    assessmentItems: assessments.data ?? [],
    assessmentOutcomes: assessmentOutcomes.data ?? [],
    rules: rules.data ?? [],
    ruleGroups: groups.data ?? [],
    ruleConditions: conditions.data ?? [],
    ruleConditionCourses: conditionCourses.data ?? [],
    ruleCourseReferences: references.data ?? [],
    fieldEvidence: evidence.data ?? [],
  };
}

export async function loadCourseImportTargetDetail({
  runId,
  targetId,
}: {
  runId: string;
  targetId: string;
}): Promise<CourseImportTargetDetail | null> {
  if (isDemoMode()) return null;
  const supabase = await createClient();
  const { data: targetData, error: targetError } = await supabase
    .from("course_import_targets")
    .select("*")
    .eq("id", targetId)
    .eq("run_id", runId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!targetData) return null;
  const target = targetData as ImportTargetRow;

  const [
    runResult,
    yearResult,
    stagesResult,
    artifactsResult,
    extractionsResult,
    reviewResult,
  ] = await Promise.all([
    supabase
      .from("course_import_runs")
      .select("id,status,requested_model")
      .eq("id", runId)
      .single(),
    supabase
      .from("academic_years")
      .select("year")
      .eq("id", target.academic_year_id)
      .single(),
    supabase
      .from("course_import_stages")
      .select("*")
      .eq("target_id", targetId)
      .order("position"),
    supabase
      .from("course_import_artifacts")
      .select("*")
      .eq("target_id", targetId)
      .order("attempt_number", { ascending: false }),
    supabase
      .from("course_extractions")
      .select("*")
      .eq("target_id", targetId)
      .order("extraction_number", { ascending: false }),
    supabase
      .from("course_review_items")
      .select("*")
      .eq("target_id", targetId)
      .order("created_at"),
  ]);
  const requiredResults = [
    runResult,
    yearResult,
    stagesResult,
    artifactsResult,
    extractionsResult,
    reviewResult,
  ];
  const failed = requiredResults.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const [snapshotResult, courseYearResult, sourceResult] = await Promise.all([
    target.candidate_snapshot_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("course_snapshots")
          .select("*")
          .eq("id", target.candidate_snapshot_id)
          .single(),
    target.course_year_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("course_years")
          .select("draft_snapshot_id,published_snapshot_id")
          .eq("id", target.course_year_id)
          .single(),
    target.source_document_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("course_source_documents")
          .select("*")
          .eq("id", target.source_document_id)
          .single(),
  ]);
  const secondaryResults = [snapshotResult, courseYearResult, sourceResult];
  const secondaryFailed = secondaryResults.find((result) => result.error);
  if (secondaryFailed?.error) throw secondaryFailed.error;

  const relationalData = target.candidate_snapshot_id
    ? await snapshotRelationalData(target.candidate_snapshot_id)
    : {};

  return {
    run: {
      id: runResult.data!.id,
      academicYear: yearResult.data!.year,
      status: runResult.data!.status,
      requestedModel: runResult.data!.requested_model,
    },
    target: {
      id: target.id,
      courseCode: target.course_code,
      processingStatus: target.processing_status,
      reviewStatus: target.review_status,
      changeKind: target.change_kind,
      attemptCount: target.attempt_count,
      baselineDraftSnapshotId: target.baseline_draft_snapshot_id,
      baselinePublishedSnapshotId: target.baseline_published_snapshot_id,
      candidateSnapshotId: target.candidate_snapshot_id,
      currentDraftSnapshotId: courseYearResult.data?.draft_snapshot_id ?? null,
      currentPublishedSnapshotId:
        courseYearResult.data?.published_snapshot_id ?? null,
      errorCode: target.error_code,
      errorSummary: target.error_summary,
      createdAt: target.created_at,
      finishedAt: target.finished_at,
    },
    candidateSnapshot: snapshotResult.data,
    sourceDocument: sourceResult.data,
    stages: stagesResult.data ?? [],
    artifacts: (artifactsResult.data ?? []).map((artifact) => ({
      id: artifact.id,
      kind: artifact.artifact_kind,
      attemptNumber: artifact.attempt_number,
      mediaType: artifact.media_type,
      byteSize: artifact.byte_size,
      contentSha256: artifact.content_sha256,
      createdAt: artifact.created_at,
    })),
    extractions: extractionsResult.data ?? [],
    reviewItems: (reviewResult.data ?? []).map((item) => ({
      id: item.id,
      entityKind: item.entity_kind,
      entityKey: item.entity_key,
      fieldPath: item.field_path,
      issueCode: item.issue_code,
      importance: item.importance,
      isBlocking: item.is_blocking,
      confidence: item.confidence,
      summary: item.summary,
      oldValue: item.old_value,
      newValue: item.new_value,
      sourceLocator: item.source_locator,
      sourceExcerpt: item.source_excerpt,
      status: item.status,
      resolutionNote: item.resolution_note,
    })),
    relationalData,
  };
}
