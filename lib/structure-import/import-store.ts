import { isDemoMode } from "../supabase/config.ts";
import {
  createHostedImportDatabaseClient,
  createLocalDatabaseClient,
} from "../../scripts/catalogue/lib/local-database.mjs";
import type { AcademicStructureKind } from "./contract.ts";

export type AcademicStructureImportStageName =
  | "source_fetch"
  | "html_capture"
  | "markdown_normalise"
  | "model_input_prepare"
  | "deterministic_extract"
  | "model_extract"
  | "schema_validate"
  | "domain_validate"
  | "database_project"
  | "snapshot_persist";

export type AcademicStructureImportLeaseFence = {
  targetId: string;
  messageId: string;
  workerId: string;
  expectedLockVersion: number;
};

export type AcademicStructureImportSql = Awaited<
  ReturnType<typeof createAcademicStructureImportDatabaseClient>
>;

export class AcademicStructureImportStoreError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AcademicStructureImportStoreError";
    this.code = code;
  }
}

export class AcademicStructureImportDatabaseConfigurationError extends Error {
  constructor() {
    super(
      "Configure COURSEMAP_IMPORT_DATABASE_URL before running durable imports on Vercel.",
    );
    this.name = "AcademicStructureImportDatabaseConfigurationError";
  }
}

function academicStructureImportLeaseLost() {
  return new AcademicStructureImportStoreError(
    "The academic structure import target lease is no longer current.",
    "IMPORT_TARGET_LEASE_LOST",
  );
}

function configuredImportDatabaseUrl() {
  const connectionString = process.env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new AcademicStructureImportDatabaseConfigurationError();
  }
  return connectionString;
}

export async function createAcademicStructureImportDatabaseClient() {
  return isDemoMode() || process.env.NODE_ENV === "development"
    ? createLocalDatabaseClient()
    : createHostedImportDatabaseClient(configuredImportDatabaseUrl());
}

export async function withAcademicStructureImportDatabaseClient<T>(
  callback: (sql: AcademicStructureImportSql) => Promise<T>,
) {
  const sql = await createAcademicStructureImportDatabaseClient();
  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function recordAcademicStructureImportDispatch({
  runId,
  dispatched,
  failedTargetIds,
  errorSummary = "The queue did not accept this target.",
}: {
  runId: string;
  dispatched: Array<{ targetId: string; messageId: string | null }>;
  failedTargetIds: readonly string[];
  errorSummary?: string;
}) {
  const sql = await createAcademicStructureImportDatabaseClient();
  try {
    await sql.begin(async (tx) => {
      const [lockedRun] = await tx`
        select id
        from public.academic_structure_import_runs
        where id = ${runId}
        for update
      `;
      if (!lockedRun) {
        throw new AcademicStructureImportStoreError(
          "The academic structure import run no longer exists.",
          "P0002",
        );
      }

      for (const target of dispatched) {
        await tx`
          update public.academic_structure_import_targets
          set
            dispatched_at = coalesce(dispatched_at, now()),
            queue_message_id = coalesce(queue_message_id, ${target.messageId}),
            dispatch_error = null,
            updated_at = now()
          where id = ${target.targetId}
            and run_id = ${runId}
            and processing_status = ${"queued"}
        `;
      }

      if (failedTargetIds.length > 0) {
        await tx`
          update public.academic_structure_import_targets
          set
            processing_status = ${"failed"},
            review_status = ${"not_required"},
            dispatch_error = ${errorSummary},
            error_code = ${"QUEUE_DISPATCH_FAILED"},
            error_summary = ${errorSummary},
            finished_at = statement_timestamp(),
            updated_at = now()
          where run_id = ${runId}
            and id = any(${tx.array([...failedTargetIds])}::uuid[])
            and processing_status = ${"queued"}
        `;
        await tx`
          select private.refresh_academic_structure_import_run(${runId}::uuid)
        `;
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

export type ClaimedAcademicStructureImportTarget = {
  runId: string;
  targetId: string;
  academicYear: number;
  academicYearId: number;
  structureKind: AcademicStructureKind;
  structureCode: string;
  requestedModel: string;
  initiatedBy: string | null;
  parserVersion: string;
  promptVersion: string;
  schemaVersion: string;
  sourceId: number;
  sourceBaseUrl: string;
  directoryEntryId: number;
  structureId: number | null;
  structureYearId: number | null;
  baselineDraftSnapshotId: number | null;
  baselinePublishedSnapshotId: number | null;
  attemptCount: number;
  lockVersion: number;
  leaseExpiresAt: string;
};

export async function recoverStaleAcademicStructureImportTarget(
  sql: AcademicStructureImportSql,
  { runId, targetId }: { runId: string; targetId: string },
) {
  const [row] = await sql`
    select private.recover_stale_academic_structure_import_target(
      ${runId}::uuid,
      ${targetId}::uuid
    ) as recovered
  `;
  return row?.recovered === true;
}

export async function getAcademicStructureImportTargetStatus(
  sql: AcademicStructureImportSql,
  { runId, targetId }: { runId: string; targetId: string },
) {
  const [row] = await sql`
    select processing_status, attempt_count, error_code, error_summary
    from public.academic_structure_import_targets
    where id = ${targetId}
      and run_id = ${runId}
  `;
  return row
    ? {
        processingStatus: String(row.processing_status),
        attemptCount: Number(row.attempt_count),
        errorCode: row.error_code === null ? null : String(row.error_code),
        errorSummary:
          row.error_summary === null ? null : String(row.error_summary),
      }
    : null;
}

export async function claimAcademicStructureImportTarget(
  sql: AcademicStructureImportSql,
  {
    runId,
    targetId,
    messageId,
    workerId,
    leaseSeconds = 600,
  }: {
    runId: string;
    targetId: string;
    messageId: string;
    workerId: string;
    leaseSeconds?: number;
  },
): Promise<ClaimedAcademicStructureImportTarget> {
  const [row] = await sql`
    select *
    from private.claim_academic_structure_import_target(
      ${runId}::uuid,
      ${targetId}::uuid,
      ${messageId}::text,
      ${workerId}::uuid,
      ${leaseSeconds}::integer
    )
  `;
  if (!row) {
    throw new Error("The academic structure import target was not claimed.");
  }
  return {
    runId: String(row.run_id),
    targetId: String(row.target_id),
    academicYear: Number(row.academic_year),
    academicYearId: Number(row.academic_year_id),
    structureKind: String(row.structure_kind) as AcademicStructureKind,
    structureCode: String(row.structure_code),
    requestedModel: String(row.requested_model),
    initiatedBy: row.initiated_by === null ? null : String(row.initiated_by),
    parserVersion: String(row.parser_version),
    promptVersion: String(row.prompt_version),
    schemaVersion: String(row.schema_version),
    sourceId: Number(row.source_id),
    sourceBaseUrl: String(row.source_base_url),
    directoryEntryId: Number(row.directory_entry_id),
    structureId: nullableNumber(row.structure_id),
    structureYearId: nullableNumber(row.structure_year_id),
    baselineDraftSnapshotId: nullableNumber(row.baseline_draft_snapshot_id),
    baselinePublishedSnapshotId: nullableNumber(
      row.baseline_published_snapshot_id,
    ),
    attemptCount: Number(row.attempt_count),
    lockVersion: Number(row.lock_version),
    leaseExpiresAt: new Date(row.lease_expires_at).toISOString(),
  };
}

export async function startAcademicStructureImportStage(
  sql: AcademicStructureImportSql,
  {
    targetId,
    stageName,
    messageId,
    workerId,
    expectedLockVersion,
  }: AcademicStructureImportLeaseFence & {
    stageName: AcademicStructureImportStageName;
  },
) {
  const [stage] = await sql`
    with active_lease as materialized (
      select targets.id
      from public.academic_structure_import_targets as targets
      where targets.id = ${targetId}
        and targets.processing_status = ${"running"}
        and targets.queue_message_id = ${messageId}
        and targets.worker_id = ${workerId}
        and targets.lock_version = ${expectedLockVersion}
        and targets.lease_expires_at > statement_timestamp()
      for update
    )
    update public.academic_structure_import_stages as stages
    set
      status = ${"running"},
      attempt_count = stages.attempt_count + 1,
      started_at = statement_timestamp(),
      completed_at = null,
      error_code = null,
      error_summary = null,
      updated_at = now()
    where stages.target_id = ${targetId}
      and stages.stage_name = ${stageName}
      and stages.target_id in (select active_lease.id from active_lease)
    returning stages.id
  `;
  if (!stage) throw academicStructureImportLeaseLost();
  return String(stage.id);
}

export async function finishAcademicStructureImportStage(
  sql: AcademicStructureImportSql,
  {
    targetId,
    stageName,
    messageId,
    workerId,
    expectedLockVersion,
  }: AcademicStructureImportLeaseFence & {
    stageName: AcademicStructureImportStageName;
  },
) {
  const result = await sql`
    with active_lease as materialized (
      select targets.id
      from public.academic_structure_import_targets as targets
      where targets.id = ${targetId}
        and targets.processing_status = ${"running"}
        and targets.queue_message_id = ${messageId}
        and targets.worker_id = ${workerId}
        and targets.lock_version = ${expectedLockVersion}
        and targets.lease_expires_at > statement_timestamp()
      for update
    )
    update public.academic_structure_import_stages as stages
    set
      status = ${"succeeded"},
      completed_at = statement_timestamp(),
      updated_at = now()
    where stages.target_id = ${targetId}
      and stages.stage_name = ${stageName}
      and stages.status = ${"running"}
      and stages.target_id in (select active_lease.id from active_lease)
  `;
  if (result.count !== 1) {
    throw academicStructureImportLeaseLost();
  }
}

export async function skipAcademicStructureImportStage(
  sql: AcademicStructureImportSql,
  {
    targetId,
    stageName,
    messageId,
    workerId,
    expectedLockVersion,
  }: AcademicStructureImportLeaseFence & {
    stageName: AcademicStructureImportStageName;
  },
) {
  const result = await sql`
    with active_lease as materialized (
      select targets.id
      from public.academic_structure_import_targets as targets
      where targets.id = ${targetId}
        and targets.processing_status = ${"running"}
        and targets.queue_message_id = ${messageId}
        and targets.worker_id = ${workerId}
        and targets.lock_version = ${expectedLockVersion}
        and targets.lease_expires_at > statement_timestamp()
      for update
    )
    update public.academic_structure_import_stages as stages
    set
      status = ${"skipped"},
      completed_at = statement_timestamp(),
      updated_at = now()
    where stages.target_id = ${targetId}
      and stages.stage_name = ${stageName}
      and stages.status in (${"pending"}, ${"running"})
      and stages.target_id in (select active_lease.id from active_lease)
  `;
  if (result.count !== 1) {
    throw academicStructureImportLeaseLost();
  }
}

export async function failAcademicStructureImportStage(
  sql: AcademicStructureImportSql,
  {
    targetId,
    stageName,
    messageId,
    workerId,
    expectedLockVersion,
    errorCode,
    errorSummary,
  }: AcademicStructureImportLeaseFence & {
    stageName: AcademicStructureImportStageName;
    errorCode: string;
    errorSummary: string;
  },
) {
  const result = await sql`
    with active_lease as materialized (
      select targets.id
      from public.academic_structure_import_targets as targets
      where targets.id = ${targetId}
        and targets.processing_status = ${"running"}
        and targets.queue_message_id = ${messageId}
        and targets.worker_id = ${workerId}
        and targets.lock_version = ${expectedLockVersion}
        and targets.lease_expires_at > statement_timestamp()
      for update
    )
    update public.academic_structure_import_stages as stages
    set
      status = ${"failed"},
      completed_at = statement_timestamp(),
      error_code = ${errorCode},
      error_summary = ${errorSummary},
      updated_at = now()
    where stages.target_id = ${targetId}
      and stages.stage_name = ${stageName}
      and stages.status = ${"running"}
      and stages.target_id in (select active_lease.id from active_lease)
  `;
  if (result.count !== 1) throw academicStructureImportLeaseLost();
}

export type AcademicStructureImportArtifactRecord = {
  id: string;
  targetId: string;
  kind: AcademicStructureImportArtifactKind;
  attemptNumber: number;
  mediaType: string;
  contentSha256: string;
  byteSize: number;
  storageBucket: string;
  storagePath: string;
};

export type AcademicStructureImportArtifactKind =
  | "raw_html"
  | "normalised_markdown"
  | "model_input"
  | "deterministic_output"
  | "model_request"
  | "model_response"
  | "validated_json"
  | "validation_report"
  | "database_projection"
  | "change_set";

export type AcademicStructureImportArtifactLocator = {
  bucket: string;
  path: string;
  mediaType: string;
  contentSha256: string;
  byteSize: number;
};

export async function recordAcademicStructureImportArtifact(
  sql: AcademicStructureImportSql,
  {
    targetId,
    stageId,
    kind,
    attemptNumber,
    mediaType,
    contentSha256,
    byteSize,
    storageBucket,
    storagePath,
    messageId,
    workerId,
    expectedLockVersion,
  }: Omit<AcademicStructureImportArtifactRecord, "id" | "targetId"> & {
    targetId: string;
    stageId: string | null;
  } & Omit<AcademicStructureImportLeaseFence, "targetId">,
): Promise<AcademicStructureImportArtifactRecord> {
  await sql`
    with active_lease as materialized (
      select targets.id
      from public.academic_structure_import_targets as targets
      where targets.id = ${targetId}
        and targets.processing_status = ${"running"}
        and targets.queue_message_id = ${messageId}
        and targets.worker_id = ${workerId}
        and targets.lock_version = ${expectedLockVersion}
        and targets.lease_expires_at > statement_timestamp()
      for update
    )
    insert into public.academic_structure_import_artifacts (
      target_id,
      stage_id,
      artifact_kind,
      attempt_number,
      media_type,
      content_sha256,
      byte_size,
      storage_bucket,
      storage_path
    )
    select
      active_lease.id,
      ${stageId},
      ${kind},
      ${attemptNumber},
      ${mediaType},
      ${contentSha256},
      ${byteSize},
      ${storageBucket},
      ${storagePath}
    from active_lease
    on conflict (target_id, artifact_kind, attempt_number) do nothing
  `;
  const [row] = await sql`
    select artifacts.*
    from public.academic_structure_import_artifacts as artifacts
    join public.academic_structure_import_targets as targets
      on targets.id = artifacts.target_id
    where artifacts.target_id = ${targetId}
      and artifacts.artifact_kind = ${kind}
      and artifacts.attempt_number = ${attemptNumber}
      and targets.processing_status = ${"running"}
      and targets.queue_message_id = ${messageId}
      and targets.worker_id = ${workerId}
      and targets.lock_version = ${expectedLockVersion}
      and targets.lease_expires_at > statement_timestamp()
  `;
  if (!row) throw academicStructureImportLeaseLost();
  if (
    String(row.content_sha256) !== contentSha256 ||
    String(row.storage_bucket) !== storageBucket ||
    String(row.storage_path) !== storagePath
  ) {
    throw new Error(
      `Import artefact ${kind} conflicts with an earlier attempt record.`,
    );
  }
  return {
    id: String(row.id),
    targetId: String(row.target_id),
    kind: String(row.artifact_kind) as AcademicStructureImportArtifactKind,
    attemptNumber: Number(row.attempt_number),
    mediaType: String(row.media_type),
    contentSha256: String(row.content_sha256),
    byteSize: Number(row.byte_size),
    storageBucket: String(row.storage_bucket),
    storagePath: String(row.storage_path),
  };
}

export async function findAcademicStructureImportArtifact(
  sql: AcademicStructureImportSql,
  {
    targetId,
    kind,
    attemptNumber,
  }: {
    targetId: string;
    kind: AcademicStructureImportArtifactKind;
    attemptNumber: number;
  },
): Promise<(AcademicStructureImportArtifactLocator & { id: string }) | null> {
  const [row] = await sql`
    select id, storage_bucket, storage_path, media_type, content_sha256, byte_size
    from public.academic_structure_import_artifacts
    where target_id = ${targetId}
      and artifact_kind = ${kind}
      and attempt_number = ${attemptNumber}
    limit 1
  `;
  return row
    ? {
        id: String(row.id),
        bucket: String(row.storage_bucket),
        path: String(row.storage_path),
        mediaType: String(row.media_type),
        contentSha256: String(row.content_sha256),
        byteSize: Number(row.byte_size),
      }
    : null;
}

export async function recordAcademicStructureSourcePage(
  sql: AcademicStructureImportSql,
  {
    sourceId,
    academicYearId,
    structureKind,
    structureCode,
    canonicalUrl,
    contentSha256,
    httpStatus,
    httpEtag,
    sourceLastModified,
    fetchedAt,
    byteSize,
    storageBucket,
    storagePath,
  }: {
    sourceId: number;
    academicYearId: number;
    structureKind: AcademicStructureKind;
    structureCode: string;
    canonicalUrl: string;
    contentSha256: string;
    httpStatus: number;
    httpEtag: string | null;
    sourceLastModified: string | null;
    fetchedAt: string;
    byteSize: number;
    storageBucket: string;
    storagePath: string;
  },
) {
  await sql`
    insert into public.academic_structure_source_pages (
      source_id,
      academic_year_id,
      page_kind,
      structure_kind,
      external_key,
      canonical_url,
      media_type,
      content_sha256,
      byte_size,
      http_status,
      http_etag,
      source_last_modified,
      fetched_at,
      storage_bucket,
      storage_path
    ) values (
      ${sourceId},
      ${academicYearId},
      ${"structure"},
      ${structureKind},
      ${structureCode},
      ${canonicalUrl},
      ${"text/html"},
      ${contentSha256},
      ${byteSize},
      ${httpStatus},
      ${httpEtag},
      ${sourceLastModified},
      ${fetchedAt},
      ${storageBucket},
      ${storagePath}
    )
    on conflict (
      source_id,
      academic_year_id,
      page_kind,
      external_key,
      content_sha256
    ) do nothing
  `;
  const [row] = await sql`
    select id
    from public.academic_structure_source_pages
    where source_id = ${sourceId}
      and academic_year_id = ${academicYearId}
      and page_kind = ${"structure"}
      and structure_kind = ${structureKind}
      and external_key = ${structureCode}
      and content_sha256 = ${contentSha256}
  `;
  if (!row) {
    throw new Error(
      "The immutable academic structure source page was not recorded.",
    );
  }
  return Number(row.id);
}

export type RecordedAcademicStructureExtraction = {
  id: string;
  targetId: string;
  extractionNumber: number;
  requestedModel: string;
  resolvedModel: string | null;
  requestArtifactId: string;
  responseArtifactId: string;
  validationStatus: "valid" | "invalid";
};

export async function recordAcademicStructureExtraction(
  sql: AcademicStructureImportSql,
  {
    targetId,
    extractionNumber,
    requestedModel,
    resolvedModel,
    generationId,
    promptVersion,
    schemaVersion,
    requestArtifactId,
    responseArtifactId,
    finishReason,
    inputTokens,
    outputTokens,
    cachedInputTokens,
    reasoningTokens,
    costUsd,
    latencyMilliseconds,
    validationStatus,
    validationSummary,
    completedAt,
    messageId,
    workerId,
    expectedLockVersion,
  }: {
    targetId: string;
    extractionNumber: number;
    requestedModel: string;
    resolvedModel: string | null;
    generationId: string | null;
    promptVersion: string;
    schemaVersion: string;
    requestArtifactId: string;
    responseArtifactId: string;
    finishReason: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    cachedInputTokens: number | null;
    reasoningTokens: number | null;
    costUsd: number | null;
    latencyMilliseconds: number | null;
    validationStatus: "valid" | "invalid";
    validationSummary: string | null;
    completedAt: string;
  } & Omit<AcademicStructureImportLeaseFence, "targetId">,
): Promise<RecordedAcademicStructureExtraction> {
  await sql`
    with requested_run as materialized (
      select targets.run_id
      from public.academic_structure_import_targets as targets
      where targets.id = ${targetId}
    ), locked_run as materialized (
      select runs.id
      from public.academic_structure_import_runs as runs
      join requested_run on requested_run.run_id = runs.id
      for update of runs
    ), active_lease as materialized (
      select targets.id, targets.run_id
      from public.academic_structure_import_targets as targets
      join locked_run on locked_run.id = targets.run_id
      where targets.id = ${targetId}
        and targets.processing_status = ${"running"}
        and targets.queue_message_id = ${messageId}
        and targets.worker_id = ${workerId}
        and targets.lock_version = ${expectedLockVersion}
        and targets.lease_expires_at > statement_timestamp()
      for update
    ), recorded_extraction as (
      insert into public.academic_structure_extractions (
        target_id,
        extraction_number,
        requested_model,
        resolved_model,
        generation_id,
        prompt_version,
        schema_version,
        request_artifact_id,
        response_artifact_id,
        finish_reason,
        input_tokens,
        output_tokens,
        cached_input_tokens,
        reasoning_tokens,
        cost_usd,
        latency_milliseconds,
        validation_status,
        validation_summary,
        completed_at
      )
      select
        active_lease.id,
        ${extractionNumber},
        ${requestedModel},
        ${resolvedModel},
        ${generationId},
        ${promptVersion},
        ${schemaVersion},
        ${requestArtifactId},
        ${responseArtifactId},
        ${finishReason},
        ${inputTokens},
        ${outputTokens},
        ${cachedInputTokens},
        ${reasoningTokens},
        ${costUsd},
        ${latencyMilliseconds},
        ${validationStatus},
        ${validationSummary},
        ${completedAt}
      from active_lease
      on conflict (target_id, extraction_number) do nothing
      returning id, target_id, input_tokens, output_tokens, cost_usd
    ), updated_run as (
      update public.academic_structure_import_runs as runs
      set
        input_tokens = runs.input_tokens + coalesce(recorded_extraction.input_tokens, 0),
        output_tokens = runs.output_tokens + coalesce(recorded_extraction.output_tokens, 0),
        cost_usd = runs.cost_usd + coalesce(recorded_extraction.cost_usd, 0),
        updated_at = now()
      from recorded_extraction
      join active_lease on active_lease.id = recorded_extraction.target_id
      where runs.id = active_lease.run_id
      returning runs.id
    )
    select recorded_extraction.id
    from recorded_extraction
    where exists (select 1 from updated_run)
  `;

  const [row] = await sql`
    select extractions.*
    from public.academic_structure_extractions as extractions
    join public.academic_structure_import_targets as targets
      on targets.id = extractions.target_id
    where extractions.target_id = ${targetId}
      and extractions.extraction_number = ${extractionNumber}
      and targets.processing_status = ${"running"}
      and targets.queue_message_id = ${messageId}
      and targets.worker_id = ${workerId}
      and targets.lock_version = ${expectedLockVersion}
      and targets.lease_expires_at > statement_timestamp()
  `;
  if (!row) throw academicStructureImportLeaseLost();
  if (
    String(row.request_artifact_id) !== requestArtifactId ||
    (row.response_artifact_id === null
      ? responseArtifactId !== null
      : String(row.response_artifact_id) !== responseArtifactId) ||
    String(row.requested_model) !== requestedModel ||
    String(row.prompt_version) !== promptVersion ||
    String(row.schema_version) !== schemaVersion ||
    String(row.validation_status) !== validationStatus
  ) {
    throw new Error(
      "The extraction conflicts with an earlier academic structure import attempt.",
    );
  }

  const storedValidationStatus = String(row.validation_status);
  if (
    storedValidationStatus !== "valid" &&
    storedValidationStatus !== "invalid"
  ) {
    throw new Error("The stored extraction has an invalid status.");
  }
  return {
    id: String(row.id),
    targetId: String(row.target_id),
    extractionNumber: Number(row.extraction_number),
    requestedModel: String(row.requested_model),
    resolvedModel:
      row.resolved_model === null ? null : String(row.resolved_model),
    requestArtifactId: String(row.request_artifact_id),
    responseArtifactId: String(row.response_artifact_id),
    validationStatus: storedValidationStatus,
  };
}

export type AcademicStructureReviewItemInput = {
  fieldKey: string;
  itemKind:
    | "missing"
    | "ambiguous"
    | "conflict"
    | "unsupported"
    | "invalid"
    | "evidence_missing"
    | "manual_review";
  severity: "info" | "warning" | "error";
  message: string;
  sourceText: string | null;
};

export async function recordAcademicStructureReviewItems(
  sql: AcademicStructureImportSql,
  {
    targetId,
    snapshotId,
    items,
  }: {
    targetId: string;
    snapshotId: number | null;
    items: readonly AcademicStructureReviewItemInput[];
  },
) {
  const ids: string[] = [];
  for (const item of items) {
    await sql`
      insert into public.academic_structure_review_items (
        target_id,
        snapshot_id,
        field_key,
        item_kind,
        severity,
        message,
        source_text
      )
      select
        ${targetId},
        ${snapshotId},
        ${item.fieldKey},
        ${item.itemKind},
        ${item.severity},
        ${item.message},
        ${item.sourceText}
      where not exists (
        select 1
        from public.academic_structure_review_items
        where target_id = ${targetId}
          and snapshot_id is not distinct from ${snapshotId}
          and field_key = ${item.fieldKey}
          and item_kind = ${item.itemKind}
          and severity = ${item.severity}
          and message = ${item.message}
          and source_text is not distinct from ${item.sourceText}
      )
    `;
    const [row] = await sql`
      select id
      from public.academic_structure_review_items
      where target_id = ${targetId}
        and snapshot_id is not distinct from ${snapshotId}
        and field_key = ${item.fieldKey}
        and item_kind = ${item.itemKind}
        and severity = ${item.severity}
        and message = ${item.message}
        and source_text is not distinct from ${item.sourceText}
      order by created_at
      limit 1
    `;
    if (!row)
      throw new Error("The academic structure review item was not recorded.");
    ids.push(String(row.id));
  }
  return ids;
}

export async function releaseAcademicStructureImportTargetForRetry(
  sql: AcademicStructureImportSql,
  {
    runId,
    targetId,
    messageId,
    workerId,
    expectedLockVersion,
    errorCode,
    errorSummary,
  }: {
    runId: string;
    targetId: string;
    messageId: string;
    workerId: string;
    expectedLockVersion: number;
    errorCode: string;
    errorSummary: string;
  },
) {
  const result = await sql`
    update public.academic_structure_import_targets
    set
      lease_expires_at = statement_timestamp(),
      heartbeat_at = statement_timestamp(),
      lock_version = lock_version + 1,
      error_code = ${errorCode},
      error_summary = ${errorSummary},
      updated_at = now()
    where id = ${targetId}
      and run_id = ${runId}
      and processing_status = ${"running"}
      and queue_message_id = ${messageId}
      and worker_id = ${workerId}
      and lock_version = ${expectedLockVersion}
      and lease_expires_at > statement_timestamp()
  `;
  if (result.count !== 1) {
    throw academicStructureImportLeaseLost();
  }
}

export async function finishAcademicStructureImportTarget(
  sql: AcademicStructureImportSql,
  {
    runId,
    targetId,
    messageId,
    workerId,
    expectedLockVersion,
    processingStatus,
    changeKind,
    structureId,
    structureYearId,
    sourcePageId,
    candidateSnapshotId,
    errorCode = null,
    errorSummary = null,
  }: {
    runId: string;
    targetId: string;
    messageId: string;
    workerId: string;
    expectedLockVersion: number;
    processingStatus: "succeeded" | "failed" | "cancelled";
    changeKind: "new" | "changed" | "unchanged" | null;
    structureId: number | null;
    structureYearId: number | null;
    sourcePageId: number | null;
    candidateSnapshotId: number | null;
    errorCode?: string | null;
    errorSummary?: string | null;
  },
) {
  const [row] = await sql`
    select completed.*
    from private.finish_academic_structure_import_target(
      ${runId}::uuid,
      ${targetId}::uuid,
      ${messageId}::text,
      ${workerId}::uuid,
      ${expectedLockVersion}::integer,
      ${processingStatus}::text,
      ${changeKind}::text,
      ${structureId}::bigint,
      ${structureYearId}::bigint,
      ${sourcePageId}::bigint,
      ${candidateSnapshotId}::bigint,
      ${errorCode}::text,
      ${errorSummary}::text
    ) as completed
  `;
  if (!row) {
    throw new Error("The academic structure import target was not completed.");
  }
  return row;
}
