import type { CourseImportArtifactLocator } from "./artifact-store.ts";
import { isDemoMode } from "../supabase/config.ts";
import {
  createHostedImportDatabaseClient,
  createLocalDatabaseClient,
} from "../../scripts/catalogue/lib/local-database.mjs";

export type CourseImportStageName =
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

export type CourseImportSql = Awaited<
  ReturnType<typeof createCourseImportDatabaseClient>
>;

export class CourseImportStoreError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CourseImportStoreError";
    this.code = code;
  }
}

export class CourseImportDatabaseConfigurationError extends Error {
  constructor() {
    super(
      "Configure COURSEMAP_IMPORT_DATABASE_URL before running durable imports on Vercel.",
    );
    this.name = "CourseImportDatabaseConfigurationError";
  }
}

function configuredImportDatabaseUrl() {
  const connectionString = process.env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) throw new CourseImportDatabaseConfigurationError();
  return connectionString;
}

export async function createCourseImportDatabaseClient() {
  return isDemoMode()
    ? createLocalDatabaseClient()
    : createHostedImportDatabaseClient(configuredImportDatabaseUrl());
}

export async function recordCourseImportDispatch({
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
  const sql = await createCourseImportDatabaseClient();
  try {
    await sql.begin(async (tx) => {
      const [lockedRun] = await tx`
        select id
        from public.course_import_runs
        where id = ${runId}
        for update
      `;
      if (!lockedRun) {
        throw new CourseImportStoreError(
          "The course import run no longer exists.",
          "P0002",
        );
      }
      for (const target of dispatched) {
        await tx`
          update public.course_import_targets
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
          update public.course_import_targets
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

        await tx`select private.refresh_course_import_run(${runId}::uuid)`;
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export type ClaimedCourseImportTarget = {
  runId: string;
  targetId: string;
  academicYear: number;
  academicYearId: number;
  courseCode: string;
  requestedModel: string;
  initiatedBy: string | null;
  parserVersion: string;
  promptVersion: string;
  schemaVersion: string;
  sourceId: number;
  sourceBaseUrl: string;
  directoryEntryId: number;
  courseId: number | null;
  courseYearId: number | null;
  baselineDraftSnapshotId: number | null;
  baselinePublishedSnapshotId: number | null;
  attemptCount: number;
  lockVersion: number;
  leaseExpiresAt: string;
};

export type CourseImportArtifactRecord = {
  id: string;
  targetId: string;
  kind: string;
  attemptNumber: number;
  mediaType: string;
  contentSha256: string;
  byteSize: number;
  storageBucket: string;
  storagePath: string;
};

export type ReusableCourseExtraction = {
  id: string;
  targetId: string;
  validationStatus: "pending" | "valid" | "invalid";
  responseArtifact: CourseImportArtifactLocator;
};

export type CourseExtractionReservation = {
  id: string;
  targetId: string;
  extractionNumber: number;
  requestArtifactId: string;
  responseArtifactId: string | null;
  created: boolean;
};

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

export async function withCourseImportDatabaseClient<T>(
  callback: (sql: CourseImportSql) => Promise<T>,
) {
  const sql = await createCourseImportDatabaseClient();
  try {
    return await callback(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function recoverStaleCourseImportTarget(
  sql: CourseImportSql,
  { runId, targetId }: { runId: string; targetId: string },
) {
  const [row] = await sql`
    select private.recover_stale_course_import_target(
      ${runId}::uuid,
      ${targetId}::uuid
    ) as recovered
  `;
  return row?.recovered === true;
}

export async function getCourseImportTargetStatus(
  sql: CourseImportSql,
  { runId, targetId }: { runId: string; targetId: string },
) {
  const [row] = await sql`
    select processing_status, attempt_count, error_code, error_summary
    from public.course_import_targets
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

export async function claimCourseImportTarget(
  sql: CourseImportSql,
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
): Promise<ClaimedCourseImportTarget> {
  const [row] = await sql`
    select *
    from private.claim_course_import_target(
      ${runId}::uuid,
      ${targetId}::uuid,
      ${messageId}::text,
      ${workerId}::uuid,
      ${leaseSeconds}::integer
    )
  `;
  if (!row) throw new Error("The course import target was not claimed.");
  return {
    runId: String(row.run_id),
    targetId: String(row.target_id),
    academicYear: Number(row.academic_year),
    academicYearId: Number(row.academic_year_id),
    courseCode: String(row.course_code),
    requestedModel: String(row.requested_model),
    initiatedBy: row.initiated_by === null ? null : String(row.initiated_by),
    parserVersion: String(row.parser_version),
    promptVersion: String(row.prompt_version),
    schemaVersion: String(row.schema_version),
    sourceId: Number(row.source_id),
    sourceBaseUrl: String(row.source_base_url),
    directoryEntryId: Number(row.directory_entry_id),
    courseId: nullableNumber(row.course_id),
    courseYearId: nullableNumber(row.course_year_id),
    baselineDraftSnapshotId: nullableNumber(row.baseline_draft_snapshot_id),
    baselinePublishedSnapshotId: nullableNumber(
      row.baseline_published_snapshot_id,
    ),
    attemptCount: Number(row.attempt_count),
    lockVersion: Number(row.lock_version),
    leaseExpiresAt: new Date(row.lease_expires_at).toISOString(),
  };
}

export async function startCourseImportStage(
  sql: CourseImportSql,
  {
    targetId,
    stageName,
  }: { targetId: string; stageName: CourseImportStageName },
) {
  const [stage] = await sql`
    update public.course_import_stages
    set
      status = ${"running"},
      attempt_count = attempt_count + 1,
      started_at = statement_timestamp(),
      completed_at = null,
      error_code = null,
      error_summary = null
    where target_id = ${targetId}
      and stage_name = ${stageName}
    returning id
  `;
  if (!stage) throw new Error(`Import stage ${stageName} was not found.`);
  return String(stage.id);
}

export async function finishCourseImportStage(
  sql: CourseImportSql,
  {
    targetId,
    stageName,
  }: {
    targetId: string;
    stageName: CourseImportStageName;
  },
) {
  const result = await sql`
    update public.course_import_stages
    set status = ${"succeeded"}, completed_at = statement_timestamp()
    where target_id = ${targetId}
      and stage_name = ${stageName}
      and status = ${"running"}
  `;
  if (result.count !== 1) {
    throw new Error(`Import stage ${stageName} was not running.`);
  }
}

export async function failCourseImportStage(
  sql: CourseImportSql,
  {
    targetId,
    stageName,
    errorCode,
    errorSummary,
  }: {
    targetId: string;
    stageName: CourseImportStageName;
    errorCode: string;
    errorSummary: string;
  },
) {
  await sql`
    update public.course_import_stages
    set
      status = ${"failed"},
      completed_at = statement_timestamp(),
      error_code = ${errorCode},
      error_summary = ${errorSummary}
    where target_id = ${targetId}
      and stage_name = ${stageName}
      and status = ${"running"}
  `;
}

export async function recordCourseImportArtifact(
  sql: CourseImportSql,
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
  }: Omit<CourseImportArtifactRecord, "id" | "targetId"> & {
    targetId: string;
    stageId: string | null;
  },
): Promise<CourseImportArtifactRecord> {
  await sql`
    insert into public.course_import_artifacts (
      target_id,
      stage_id,
      artifact_kind,
      attempt_number,
      media_type,
      content_sha256,
      byte_size,
      storage_bucket,
      storage_path
    ) values (
      ${targetId},
      ${stageId},
      ${kind},
      ${attemptNumber},
      ${mediaType},
      ${contentSha256},
      ${byteSize},
      ${storageBucket},
      ${storagePath}
    )
    on conflict (target_id, artifact_kind, attempt_number) do nothing
  `;
  const [row] = await sql`
    select *
    from public.course_import_artifacts
    where target_id = ${targetId}
      and artifact_kind = ${kind}
      and attempt_number = ${attemptNumber}
  `;
  if (
    !row ||
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
    kind: String(row.artifact_kind),
    attemptNumber: Number(row.attempt_number),
    mediaType: String(row.media_type),
    contentSha256: String(row.content_sha256),
    byteSize: Number(row.byte_size),
    storageBucket: String(row.storage_bucket),
    storagePath: String(row.storage_path),
  };
}

export async function recordCourseSourcePage(
  sql: CourseImportSql,
  {
    sourceId,
    academicYearId,
    courseCode,
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
    courseCode: string;
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
    insert into public.course_source_pages (
      source_id,
      academic_year_id,
      page_kind,
      external_key,
      canonical_url,
      media_type,
      content_sha256,
      http_status,
      http_etag,
      source_last_modified,
      fetched_at,
      byte_size,
      storage_bucket,
      storage_path
    ) values (
      ${sourceId},
      ${academicYearId},
      ${"course_page"},
      ${courseCode},
      ${canonicalUrl},
      ${"text/html"},
      ${contentSha256},
      ${httpStatus},
      ${httpEtag},
      ${sourceLastModified},
      ${fetchedAt},
      ${byteSize},
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
    from public.course_source_pages
    where source_id = ${sourceId}
      and academic_year_id = ${academicYearId}
      and page_kind = ${"course_page"}
      and external_key = ${courseCode}
      and content_sha256 = ${contentSha256}
  `;
  if (!row)
    throw new Error("The immutable course source page was not recorded.");
  return Number(row.id);
}

function reusableCourseExtraction(row: Record<string, unknown>) {
  const validationStatus = String(row.validation_status);
  if (
    validationStatus !== "pending" &&
    validationStatus !== "valid" &&
    validationStatus !== "invalid"
  ) {
    throw new Error("The stored course extraction has an invalid status.");
  }
  return {
    id: String(row.id),
    targetId: String(row.target_id),
    validationStatus,
    responseArtifact: {
      bucket: String(
        row.storage_bucket,
      ) as CourseImportArtifactLocator["bucket"],
      path: String(row.storage_path),
      mediaType: String(row.media_type),
      contentSha256: String(row.content_sha256),
      byteSize: Number(row.byte_size),
    },
  } satisfies ReusableCourseExtraction;
}

export async function findReusableCourseExtraction(
  sql: CourseImportSql,
  {
    targetId,
    extractionFingerprint,
  }: { targetId: string; extractionFingerprint: string },
): Promise<ReusableCourseExtraction | null> {
  const [row] = await sql`
    select
      extractions.id,
      extractions.target_id,
      extractions.validation_status,
      artifacts.storage_bucket,
      artifacts.storage_path,
      artifacts.media_type,
      artifacts.content_sha256,
      artifacts.byte_size
    from public.course_extractions as extractions
    join public.course_import_artifacts as artifacts
      on artifacts.id = extractions.response_artifact_id
     and artifacts.target_id = extractions.target_id
    where extractions.extraction_fingerprint = ${extractionFingerprint}
      and (
        extractions.target_id = ${targetId}
        or extractions.reused_from_extraction_id is null
      )
    order by
      (extractions.target_id = ${targetId}) desc,
      extractions.created_at desc
    limit 1
  `;
  return row ? reusableCourseExtraction(row) : null;
}

export async function findReusableCourseModelResponse(
  sql: CourseImportSql,
  {
    targetId,
    requestArtifactId,
  }: { targetId: string; requestArtifactId: string },
): Promise<(CourseImportArtifactLocator & { id: string }) | null> {
  const [row] = await sql`
    select
      responses.id,
      responses.storage_bucket,
      responses.storage_path,
      responses.media_type,
      responses.content_sha256,
      responses.byte_size
    from public.course_import_artifacts as requests
    join public.course_import_artifacts as responses
      on responses.target_id = requests.target_id
     and responses.attempt_number = requests.attempt_number
     and responses.artifact_kind = ${"model_response"}
    where requests.target_id = ${targetId}
      and requests.id = ${requestArtifactId}
      and requests.artifact_kind = ${"model_request"}
    limit 1
  `;
  return row
    ? {
        id: String(row.id),
        bucket: String(
          row.storage_bucket,
        ) as CourseImportArtifactLocator["bucket"],
        path: String(row.storage_path),
        mediaType: String(row.media_type),
        contentSha256: String(row.content_sha256),
        byteSize: Number(row.byte_size),
      }
    : null;
}

export async function reserveCourseExtraction(
  sql: CourseImportSql,
  {
    targetId,
    extractionNumber,
    requestedModel,
    extractionFingerprint,
    promptVersion,
    schemaVersion,
    requestArtifactId,
    startedAt,
  }: {
    targetId: string;
    extractionNumber: number;
    requestedModel: string;
    extractionFingerprint: string;
    promptVersion: string;
    schemaVersion: string;
    requestArtifactId: string;
    startedAt: string;
  },
): Promise<CourseExtractionReservation> {
  const inserted = await sql`
    insert into public.course_extractions (
      target_id,
      extraction_number,
      requested_model,
      extraction_fingerprint,
      prompt_version,
      schema_version,
      request_artifact_id,
      started_at
    ) values (
      ${targetId},
      ${extractionNumber},
      ${requestedModel},
      ${extractionFingerprint},
      ${promptVersion},
      ${schemaVersion},
      ${requestArtifactId},
      ${startedAt}
    )
    on conflict (target_id, extraction_fingerprint) do nothing
    returning id
  `;

  const [reservation] = await sql`
    select
      id,
      target_id,
      extraction_number,
      request_artifact_id,
      response_artifact_id
    from public.course_extractions
    where target_id = ${targetId}
      and extraction_fingerprint = ${extractionFingerprint}
    limit 1
  `;
  if (!reservation) {
    throw new Error("The OpenRouter extraction was not reserved.");
  }
  return {
    id: String(reservation.id),
    targetId: String(reservation.target_id),
    extractionNumber: Number(reservation.extraction_number),
    requestArtifactId: String(reservation.request_artifact_id),
    responseArtifactId:
      reservation.response_artifact_id === null
        ? null
        : String(reservation.response_artifact_id),
    created: inserted.length === 1,
  };
}

export async function attachCourseExtractionResponse(
  sql: CourseImportSql,
  {
    reservationId,
    targetId,
    responseArtifactId,
    resolvedModel,
    reusedFromExtractionId,
    providerRequestId,
    finishReason,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    costUsd,
    costSource,
    latencyMs,
  }: {
    reservationId: string;
    targetId: string;
    responseArtifactId: string;
    resolvedModel: string | null;
    reusedFromExtractionId: string | null;
    providerRequestId: string | null;
    finishReason: string | null;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    costUsd: number;
    costSource: "provider" | "calculated" | "cache" | "unknown";
    latencyMs: number | null;
  },
): Promise<ReusableCourseExtraction> {
  await sql`
    update public.course_extractions
    set
      resolved_model = ${resolvedModel},
      reused_from_extraction_id = ${reusedFromExtractionId},
      response_artifact_id = ${responseArtifactId},
      provider_request_id = ${providerRequestId},
      finish_reason = ${finishReason},
      input_tokens = ${inputTokens},
      cached_input_tokens = ${cachedInputTokens},
      output_tokens = ${outputTokens},
      reasoning_tokens = ${reasoningTokens},
      cost_usd = ${costUsd},
      cost_source = ${costSource},
      latency_ms = ${latencyMs}
    where id = ${reservationId}
      and target_id = ${targetId}
      and validation_status = ${"pending"}
      and response_artifact_id is null
  `;

  const [recorded] = await sql`
    select extraction_fingerprint
    from public.course_extractions
    where id = ${reservationId}
      and target_id = ${targetId}
      and response_artifact_id is not null
  `;
  if (!recorded) throw new Error("The OpenRouter response was not recorded.");
  const extraction = await findReusableCourseExtraction(sql, {
    targetId,
    extractionFingerprint: String(recorded.extraction_fingerprint),
  });
  if (!extraction) throw new Error("The OpenRouter response was not reusable.");
  return extraction;
}

export async function completeCourseExtraction(
  sql: CourseImportSql,
  {
    targetId,
    extractionId,
    validatedArtifactId,
    validationStatus,
    schemaValid,
    domainValid,
    warningCount,
    errorCount,
    completedAt,
    errorSummary,
  }: {
    targetId: string;
    extractionId: string;
    validatedArtifactId: string;
    validationStatus: "valid" | "invalid";
    schemaValid: boolean;
    domainValid: boolean;
    warningCount: number;
    errorCount: number;
    completedAt: string;
    errorSummary: string | null;
  },
) {
  const result = await sql`
    update public.course_extractions
    set
      validated_artifact_id = ${validatedArtifactId},
      validation_status = ${validationStatus},
      schema_valid = ${schemaValid},
      domain_valid = ${domainValid},
      warning_count = ${warningCount},
      error_count = ${errorCount},
      completed_at = ${completedAt},
      error_summary = ${errorSummary}
    where id = ${extractionId}
      and target_id = ${targetId}
      and validation_status = ${"pending"}
  `;
  if (result.count === 1) return;

  const [existing] = await sql`
    select validation_status
    from public.course_extractions
    where id = ${extractionId}
      and target_id = ${targetId}
  `;
  if (
    existing &&
    (existing.validation_status === "valid" ||
      existing.validation_status === "invalid")
  ) {
    return;
  }
  throw new Error("The OpenRouter extraction was not completed.");
}

export async function releaseCourseImportTargetForRetry(
  sql: CourseImportSql,
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
    update public.course_import_targets
    set
      lease_expires_at = statement_timestamp(),
      heartbeat_at = statement_timestamp(),
      lock_version = lock_version + 1,
      error_code = ${errorCode},
      error_summary = ${errorSummary}
    where id = ${targetId}
      and run_id = ${runId}
      and processing_status = ${"processing"}
      and queue_message_id = ${messageId}
      and worker_id = ${workerId}
      and lock_version = ${expectedLockVersion}
  `;
  if (result.count !== 1) {
    throw new Error("The course import target retry lease was not released.");
  }
}

export async function finishCourseImportTarget(
  sql: CourseImportSql,
  {
    runId,
    targetId,
    messageId,
    workerId,
    expectedLockVersion,
    processingStatus,
    changeKind,
    courseId,
    courseYearId,
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
    processingStatus: "ready_for_review" | "unchanged" | "failed" | "cancelled";
    changeKind: "new" | "changed" | "unchanged" | null;
    courseId: number | null;
    courseYearId: number | null;
    sourcePageId: number | null;
    candidateSnapshotId: number | null;
    errorCode?: string | null;
    errorSummary?: string | null;
  },
) {
  const [row] = await sql`
    select completed.*
    from private.finish_course_import_target(
      ${runId}::uuid,
      ${targetId}::uuid,
      ${messageId}::text,
      ${workerId}::uuid,
      ${expectedLockVersion}::integer,
      ${processingStatus}::text,
      ${changeKind}::text,
      ${courseId}::bigint,
      ${courseYearId}::bigint,
      ${sourcePageId}::bigint,
      ${candidateSnapshotId}::bigint,
      ${errorCode}::text,
      ${errorSummary}::text
    ) as completed
  `;
  if (!row) throw new Error("The course import target was not completed.");
  return row;
}
