import "server-only";

import type { Database } from "@/types/database";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AcademicStructureImportKind =
  "programme" | "major" | "minor" | "specialisation";

type RunRow =
  Database["public"]["Tables"]["academic_structure_import_runs"]["Row"];
type TargetRow =
  Database["public"]["Tables"]["academic_structure_import_targets"]["Row"];
type ExtractionRow =
  Database["public"]["Tables"]["academic_structure_extractions"]["Row"];
type SnapshotRow =
  Database["public"]["Tables"]["academic_structure_snapshots"]["Row"];
type StructureYearRow =
  Database["public"]["Tables"]["academic_structure_years"]["Row"];
type StructureRow = Database["public"]["Tables"]["academic_structures"]["Row"];

export type AcademicStructureImportRunSummary = {
  id: string;
  runNumber: number;
  academicYear: number;
  structureKind: AcademicStructureImportKind;
  status: string;
  requestedModel: string;
  targetCount: number;
  processedCount: number;
  readyForReviewCount: number;
  acceptedCount: number;
  rejectedCount: number;
  failedCount: number;
  extractionCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorSummary: string | null;
  structureCodes: string[];
};

export type AcademicStructureImportRunPage = {
  records: AcademicStructureImportRunSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type AcademicStructureImportRunTarget = {
  id: string;
  code: string;
  title: string | null;
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
    latencyMilliseconds: number | null;
  } | null;
};

export type AcademicStructureImportRunDetail = {
  run: AcademicStructureImportRunSummary & {
    parserVersion: string;
    promptVersion: string;
    schemaVersion: string;
    heartbeatAt: string | null;
  };
  targets: AcademicStructureImportRunTarget[];
};

export type AcademicStructureImportArtifact = {
  id: string;
  kind: string;
  attemptNumber: number;
  mediaType: string;
  byteSize: number;
  contentSha256: string;
  createdAt: string;
};

export type AcademicStructureImportReviewItem =
  Database["public"]["Tables"]["academic_structure_review_items"]["Row"];

export type AcademicStructureImportRelationalData = {
  academic_structures: StructureRow[];
  academic_structure_years: StructureYearRow[];
  academic_structure_snapshots: SnapshotRow[];
  academic_structure_snapshot_sections: Array<
    Database["public"]["Tables"]["academic_structure_snapshot_sections"]["Row"]
  >;
  academic_structure_summary_fields: Array<
    Database["public"]["Tables"]["academic_structure_summary_fields"]["Row"]
  >;
  academic_structure_learning_outcomes: Array<
    Database["public"]["Tables"]["academic_structure_learning_outcomes"]["Row"]
  >;
  academic_structure_fees: Array<
    Database["public"]["Tables"]["academic_structure_fees"]["Row"]
  >;
  academic_structure_snapshot_relationships: Array<
    Database["public"]["Tables"]["academic_structure_snapshot_relationships"]["Row"]
  >;
  academic_structure_requirement_groups: Array<
    Database["public"]["Tables"]["academic_structure_requirement_groups"]["Row"]
  >;
  academic_structure_requirement_conditions: Array<
    Database["public"]["Tables"]["academic_structure_requirement_conditions"]["Row"]
  >;
  academic_structure_requirement_options: Array<
    Database["public"]["Tables"]["academic_structure_requirement_options"]["Row"]
  >;
  academic_structure_unmodelled_requirements: Array<
    Database["public"]["Tables"]["academic_structure_unmodelled_requirements"]["Row"]
  >;
  academic_structure_snapshot_evidence: Array<
    Database["public"]["Tables"]["academic_structure_snapshot_evidence"]["Row"]
  >;
  academic_structure_review_items: AcademicStructureImportReviewItem[];
};

export type AcademicStructureImportTargetDetail = {
  run: {
    id: string;
    runNumber: number;
    academicYear: number;
    structureKind: AcademicStructureImportKind;
    status: string;
    requestedModel: string;
  };
  target: {
    id: string;
    code: string;
    title: string | null;
    processingStatus: string;
    reviewStatus: string;
    changeKind: string | null;
    attemptCount: number;
    baselineDraftSnapshotId: number | null;
    baselinePublishedSnapshotId: number | null;
    candidateSnapshotId: number | null;
    currentDraftSnapshotId: number | null;
    currentPublishedSnapshotId: number | null;
    structureId: number | null;
    structurePublicId: string | null;
    structureYearId: number | null;
    errorCode: string | null;
    errorSummary: string | null;
    createdAt: string;
    finishedAt: string | null;
  };
  candidateSnapshot: SnapshotRow | null;
  previousSnapshot: {
    row: SnapshotRow;
    label: string;
  } | null;
  sourcePage:
    | Database["public"]["Tables"]["academic_structure_source_pages"]["Row"]
    | null;
  stages: Array<
    Database["public"]["Tables"]["academic_structure_import_stages"]["Row"]
  >;
  artifacts: AcademicStructureImportArtifact[];
  extractions: ExtractionRow[];
  reviewItems: AcademicStructureImportReviewItem[];
  relationalData: AcademicStructureImportRelationalData;
};

function safePage(value: number | undefined) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 1;
}

function numberOrZero(value: number | null | undefined) {
  return value ?? 0;
}

function processedCount(run: RunRow) {
  return run.succeeded_count + run.failed_count + run.cancelled_count;
}

function latestExtractionByTarget(extractions: ExtractionRow[]) {
  const byTarget = new Map<string, ExtractionRow>();
  for (const extraction of extractions) {
    const current = byTarget.get(extraction.target_id);
    if (!current || extraction.extraction_number > current.extraction_number) {
      byTarget.set(extraction.target_id, extraction);
    }
  }
  return byTarget;
}

function summariseRun({
  run,
  academicYear,
  targets,
  extractionCount,
}: {
  run: RunRow;
  academicYear: number;
  targets: TargetRow[];
  extractionCount: number;
}): AcademicStructureImportRunSummary {
  return {
    id: run.id,
    runNumber: run.run_number,
    academicYear,
    structureKind: run.structure_kind as AcademicStructureImportKind,
    status: run.status,
    requestedModel: run.requested_model,
    targetCount: run.target_count,
    processedCount: processedCount(run),
    readyForReviewCount: targets.filter((target) =>
      ["needs_review", "unchanged"].includes(target.review_status),
    ).length,
    acceptedCount: run.accepted_count,
    rejectedCount: run.rejected_count,
    failedCount: run.failed_count,
    extractionCount,
    inputTokens: run.input_tokens,
    outputTokens: run.output_tokens,
    costUsd: Number(run.cost_usd),
    createdAt: run.created_at,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    errorSummary: run.error_summary,
    structureCodes: targets
      .sort((left, right) => left.position - right.position)
      .map((target) => target.structure_code),
  };
}

export async function loadAcademicStructureImportRunPage({
  page: requestedPage,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<AcademicStructureImportRunPage> {
  const page = safePage(requestedPage);
  const safePageSize = Math.min(Math.max(Math.trunc(pageSize), 1), 50);
  if (isDemoMode()) {
    return { records: [], page, pageSize: safePageSize, total: 0 };
  }

  const supabase = await createClient();
  const from = (page - 1) * safePageSize;
  const { data, count, error } = await supabase
    .from("academic_structure_import_runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + safePageSize - 1);
  if (error) throw error;
  const runs = (data ?? []) as RunRow[];
  if (runs.length === 0) {
    return {
      records: [],
      page,
      pageSize: safePageSize,
      total: count ?? 0,
    };
  }

  const runIds = runs.map((run) => run.id);
  const yearIds = [...new Set(runs.map((run) => run.academic_year_id))];
  const [yearsResult, targetsResult] = await Promise.all([
    supabase.from("academic_years").select("id,year").in("id", yearIds),
    supabase
      .from("academic_structure_import_targets")
      .select("*")
      .in("run_id", runIds)
      .order("position"),
  ]);
  if (yearsResult.error) throw yearsResult.error;
  if (targetsResult.error) throw targetsResult.error;
  const targets = (targetsResult.data ?? []) as TargetRow[];
  const targetIds = targets.map((target) => target.id);
  const extractionsResult = targetIds.length
    ? await supabase
        .from("academic_structure_extractions")
        .select("target_id")
        .in("target_id", targetIds)
    : { data: [], error: null };
  if (extractionsResult.error) throw extractionsResult.error;

  const yearById = new Map(
    (yearsResult.data ?? []).map((year) => [year.id, year.year]),
  );
  const targetsByRun = new Map<string, TargetRow[]>();
  for (const target of targets) {
    targetsByRun.set(target.run_id, [
      ...(targetsByRun.get(target.run_id) ?? []),
      target,
    ]);
  }
  const extractionCountByTarget = new Map<string, number>();
  for (const extraction of extractionsResult.data ?? []) {
    extractionCountByTarget.set(
      extraction.target_id,
      (extractionCountByTarget.get(extraction.target_id) ?? 0) + 1,
    );
  }

  return {
    records: runs.map((run) => {
      const runTargets = targetsByRun.get(run.id) ?? [];
      return summariseRun({
        run,
        academicYear: yearById.get(run.academic_year_id) ?? 0,
        targets: runTargets,
        extractionCount: runTargets.reduce(
          (sum, target) => sum + (extractionCountByTarget.get(target.id) ?? 0),
          0,
        ),
      });
    }),
    page,
    pageSize: safePageSize,
    total: count ?? 0,
  };
}

export async function loadAcademicStructureImportRunDetail(
  runId: string,
): Promise<AcademicStructureImportRunDetail | null> {
  if (isDemoMode()) return null;
  const supabase = await createClient();
  const { data: runData, error: runError } = await supabase
    .from("academic_structure_import_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runError) throw runError;
  if (!runData) return null;
  const run = runData as RunRow;

  const [yearResult, targetsResult] = await Promise.all([
    supabase
      .from("academic_years")
      .select("year")
      .eq("id", run.academic_year_id)
      .single(),
    supabase
      .from("academic_structure_import_targets")
      .select("*")
      .eq("run_id", run.id)
      .order("position"),
  ]);
  if (yearResult.error) throw yearResult.error;
  if (targetsResult.error) throw targetsResult.error;
  const targets = (targetsResult.data ?? []) as TargetRow[];
  const targetIds = targets.map((target) => target.id);
  const directoryIds = targets.map((target) => target.directory_entry_id);
  const [extractionsResult, directoryResult] = await Promise.all([
    targetIds.length
      ? supabase
          .from("academic_structure_extractions")
          .select("*")
          .in("target_id", targetIds)
          .order("extraction_number", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    directoryIds.length
      ? supabase
          .from("academic_structure_directory_entries")
          .select("id,title")
          .in("id", directoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (extractionsResult.error) throw extractionsResult.error;
  if (directoryResult.error) throw directoryResult.error;
  const extractions = (extractionsResult.data ?? []) as ExtractionRow[];
  const extractionByTarget = latestExtractionByTarget(extractions);
  const titleByDirectoryId = new Map(
    (directoryResult.data ?? []).map((entry) => [entry.id, entry.title]),
  );

  return {
    run: {
      ...summariseRun({
        run,
        academicYear: yearResult.data.year,
        targets,
        extractionCount: extractions.length,
      }),
      parserVersion: run.parser_version,
      promptVersion: run.prompt_version,
      schemaVersion: run.schema_version,
      heartbeatAt: run.heartbeat_at,
    },
    targets: targets.map((target) => {
      const extraction = extractionByTarget.get(target.id) ?? null;
      return {
        id: target.id,
        code: target.structure_code,
        title: titleByDirectoryId.get(target.directory_entry_id) ?? null,
        position: target.position,
        processingStatus: target.processing_status,
        reviewStatus: target.review_status,
        changeKind: target.change_kind,
        attemptCount: target.attempt_count,
        errorCode: target.error_code,
        errorSummary: target.error_summary,
        createdAt: target.created_at,
        startedAt: target.started_at,
        finishedAt: target.finished_at,
        extraction: extraction
          ? {
              requestedModel: extraction.requested_model,
              resolvedModel: extraction.resolved_model,
              validationStatus: extraction.validation_status,
              inputTokens: numberOrZero(extraction.input_tokens),
              cachedInputTokens: numberOrZero(extraction.cached_input_tokens),
              outputTokens: numberOrZero(extraction.output_tokens),
              reasoningTokens: numberOrZero(extraction.reasoning_tokens),
              costUsd: numberOrZero(extraction.cost_usd),
              latencyMilliseconds: extraction.latency_milliseconds,
            }
          : null,
      };
    }),
  };
}

function emptyRelationalData(): AcademicStructureImportRelationalData {
  return {
    academic_structures: [],
    academic_structure_years: [],
    academic_structure_snapshots: [],
    academic_structure_snapshot_sections: [],
    academic_structure_summary_fields: [],
    academic_structure_learning_outcomes: [],
    academic_structure_fees: [],
    academic_structure_snapshot_relationships: [],
    academic_structure_requirement_groups: [],
    academic_structure_requirement_conditions: [],
    academic_structure_requirement_options: [],
    academic_structure_unmodelled_requirements: [],
    academic_structure_snapshot_evidence: [],
    academic_structure_review_items: [],
  };
}

async function loadSnapshotRelationalData({
  snapshot,
  structure,
  structureYear,
}: {
  snapshot: SnapshotRow | null;
  structure: StructureRow | null;
  structureYear: StructureYearRow | null;
}): Promise<AcademicStructureImportRelationalData> {
  const relationalData = emptyRelationalData();
  if (structure) relationalData.academic_structures = [structure];
  if (structureYear) relationalData.academic_structure_years = [structureYear];
  if (!snapshot) return relationalData;
  relationalData.academic_structure_snapshots = [snapshot];

  const supabase = await createClient();
  const results = await Promise.all([
    supabase
      .from("academic_structure_snapshot_sections")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_summary_fields")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position")
      .order("value_position"),
    supabase
      .from("academic_structure_learning_outcomes")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_fees")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_snapshot_relationships")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_requirement_groups")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_requirement_conditions")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_requirement_options")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_unmodelled_requirements")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("academic_structure_snapshot_evidence")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .order("position"),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  const [
    sections,
    summaryFields,
    learningOutcomes,
    fees,
    relationships,
    requirementGroups,
    requirementConditions,
    requirementOptions,
    unmodelledRequirements,
    evidence,
  ] = results;

  return {
    ...relationalData,
    academic_structure_snapshot_sections: sections.data ?? [],
    academic_structure_summary_fields: summaryFields.data ?? [],
    academic_structure_learning_outcomes: learningOutcomes.data ?? [],
    academic_structure_fees: fees.data ?? [],
    academic_structure_snapshot_relationships: relationships.data ?? [],
    academic_structure_requirement_groups: requirementGroups.data ?? [],
    academic_structure_requirement_conditions: requirementConditions.data ?? [],
    academic_structure_requirement_options: requirementOptions.data ?? [],
    academic_structure_unmodelled_requirements:
      unmodelledRequirements.data ?? [],
    academic_structure_snapshot_evidence: evidence.data ?? [],
  };
}

export async function loadAcademicStructureImportTargetDetail({
  runId,
  targetId,
}: {
  runId: string;
  targetId: string;
}): Promise<AcademicStructureImportTargetDetail | null> {
  if (isDemoMode()) return null;
  const supabase = await createClient();
  const { data: targetData, error: targetError } = await supabase
    .from("academic_structure_import_targets")
    .select("*")
    .eq("id", targetId)
    .eq("run_id", runId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!targetData) return null;
  const target = targetData as TargetRow;

  const [
    runResult,
    yearResult,
    directoryResult,
    stagesResult,
    artifactsResult,
    extractionsResult,
    reviewItemsResult,
  ] = await Promise.all([
    supabase
      .from("academic_structure_import_runs")
      .select("id,run_number,status,structure_kind,requested_model")
      .eq("id", runId)
      .single(),
    supabase
      .from("academic_years")
      .select("year")
      .eq("id", target.academic_year_id)
      .single(),
    supabase
      .from("academic_structure_directory_entries")
      .select("title")
      .eq("id", target.directory_entry_id)
      .single(),
    supabase
      .from("academic_structure_import_stages")
      .select("*")
      .eq("target_id", target.id)
      .order("position"),
    supabase
      .from("academic_structure_import_artifacts")
      .select("*")
      .eq("target_id", target.id)
      .order("attempt_number", { ascending: false }),
    supabase
      .from("academic_structure_extractions")
      .select("*")
      .eq("target_id", target.id)
      .order("extraction_number", { ascending: false }),
    supabase
      .from("academic_structure_review_items")
      .select("*")
      .eq("target_id", target.id)
      .order("created_at"),
  ]);
  const requiredResults = [
    runResult,
    yearResult,
    directoryResult,
    stagesResult,
    artifactsResult,
    extractionsResult,
    reviewItemsResult,
  ];
  const failed = requiredResults.find((result) => result.error);
  if (failed?.error) throw failed.error;
  if (!runResult.data || !yearResult.data || !directoryResult.data) {
    throw new Error(
      "The academic structure import returned incomplete metadata.",
    );
  }
  const runMetadata = runResult.data;
  const academicYear = yearResult.data.year;
  const directoryTitle = directoryResult.data.title;

  const [
    snapshotResult,
    structureYearResult,
    sourcePageResult,
    structureResult,
  ] = await Promise.all([
    target.candidate_snapshot_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("academic_structure_snapshots")
          .select("*")
          .eq("id", target.candidate_snapshot_id)
          .single(),
    target.structure_year_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("academic_structure_years")
          .select("*")
          .eq("id", target.structure_year_id)
          .single(),
    target.source_page_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("academic_structure_source_pages")
          .select("*")
          .eq("id", target.source_page_id)
          .single(),
    target.structure_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("academic_structures")
          .select("*")
          .eq("id", target.structure_id)
          .single(),
  ]);
  const secondaryResults = [
    snapshotResult,
    structureYearResult,
    sourcePageResult,
    structureResult,
  ];
  const secondaryFailure = secondaryResults.find((result) => result.error);
  if (secondaryFailure?.error) throw secondaryFailure.error;

  const candidateSnapshot = snapshotResult.data as SnapshotRow | null;
  const structureYear = structureYearResult.data as StructureYearRow | null;
  const structure = structureResult.data as StructureRow | null;
  const previousChoices = [
    {
      id: target.baseline_draft_snapshot_id,
      label: "Draft when the import started",
    },
    {
      id: target.baseline_published_snapshot_id,
      label: "Published snapshot when the import started",
    },
    { id: structureYear?.draft_snapshot_id ?? null, label: "Current draft" },
    {
      id: structureYear?.published_snapshot_id ?? null,
      label: "Current published snapshot",
    },
  ];
  const previousChoice = previousChoices.find(
    (choice) =>
      choice.id !== null && choice.id !== target.candidate_snapshot_id,
  );
  const previousSnapshotId = previousChoice?.id ?? null;
  const previousSnapshotResult =
    previousSnapshotId !== null
      ? await supabase
          .from("academic_structure_snapshots")
          .select("*")
          .eq("id", previousSnapshotId)
          .single()
      : { data: null, error: null };
  if (previousSnapshotResult.error) throw previousSnapshotResult.error;

  const relationalData = await loadSnapshotRelationalData({
    snapshot: candidateSnapshot,
    structure,
    structureYear,
  });
  relationalData.academic_structure_review_items = reviewItemsResult.data ?? [];

  return {
    run: {
      id: runMetadata.id,
      runNumber: runMetadata.run_number,
      academicYear,
      structureKind: runMetadata.structure_kind as AcademicStructureImportKind,
      status: runMetadata.status,
      requestedModel: runMetadata.requested_model,
    },
    target: {
      id: target.id,
      code: target.structure_code,
      title: directoryTitle,
      processingStatus: target.processing_status,
      reviewStatus: target.review_status,
      changeKind: target.change_kind,
      attemptCount: target.attempt_count,
      baselineDraftSnapshotId: target.baseline_draft_snapshot_id,
      baselinePublishedSnapshotId: target.baseline_published_snapshot_id,
      candidateSnapshotId: target.candidate_snapshot_id,
      currentDraftSnapshotId: structureYear?.draft_snapshot_id ?? null,
      currentPublishedSnapshotId: structureYear?.published_snapshot_id ?? null,
      structureId: target.structure_id,
      structurePublicId: structure?.public_id ?? null,
      structureYearId: target.structure_year_id,
      errorCode: target.error_code,
      errorSummary: target.error_summary,
      createdAt: target.created_at,
      finishedAt: target.finished_at,
    },
    candidateSnapshot,
    previousSnapshot:
      previousChoice && previousSnapshotResult.data
        ? {
            row: previousSnapshotResult.data as SnapshotRow,
            label: previousChoice.label,
          }
        : null,
    sourcePage: sourcePageResult.data,
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
    extractions: (extractionsResult.data ?? []) as ExtractionRow[],
    reviewItems: reviewItemsResult.data ?? [],
    relationalData,
  };
}
