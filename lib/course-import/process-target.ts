import { randomUUID } from "node:crypto";
import {
  CourseImportArtifactConfigurationError,
  readCourseImportArtifact,
  storeCourseImportArtifact,
} from "./artifact-store.ts";
import { stableFingerprint, stableStringify } from "./canonical.ts";
import {
  COURSE_EXTRACTION_JSON_SCHEMA,
  validateCourseExtraction,
} from "./contract.ts";
import { extractDeterministicCourse } from "./deterministic.ts";
import {
  type CourseImportStageName,
  attachCourseExtractionResponse,
  claimCourseImportTarget,
  completeCourseExtraction,
  failCourseImportStage,
  findReusableCourseExtraction,
  findReusableCourseModelResponse,
  finishCourseImportStage,
  finishCourseImportTarget,
  getCourseImportTargetStatus,
  recordCourseImportArtifact,
  recordCourseSourcePage,
  recoverStaleCourseImportTarget,
  reserveCourseExtraction,
  releaseCourseImportTargetForRetry,
  startCourseImportStage,
  withCourseImportDatabaseClient,
} from "./import-store.ts";
import {
  buildCourseModelInput,
  convertCourseHtmlToMarkdown,
} from "./markdown.ts";
import { mergeCourseExtractions } from "./merge.ts";
import {
  canonicaliseCourseModelExtraction,
  courseModelCanonicalisationReviewItem,
} from "./model-canonical.ts";
import {
  OpenRouterConfigurationError,
  OpenRouterRequestError,
  buildOpenRouterCourseRequestBody,
  extractCourseWithOpenRouter,
  restoreOpenRouterCourseExtraction,
} from "./openrouter.ts";
import { persistCourseSnapshotCandidate } from "./persist-snapshot.ts";
import {
  COURSE_IMPORT_PARSER_VERSION,
  COURSE_IMPORT_PROMPT_VERSION,
  COURSE_SNAPSHOT_SCHEMA_VERSION,
  buildCourseExtractionSystemPrompt,
  buildCourseExtractionUserPrompt,
} from "./prompt.ts";
import { buildCourseSnapshotProjection } from "./project-snapshot.ts";
import { CourseSourceError, fetchAnuCoursePage } from "./source.ts";

const TERMINAL_TARGET_STATUSES = new Set([
  "ready_for_review",
  "unchanged",
  "failed",
  "cancelled",
]);

class CourseImportPaidOutcomeUncertainError extends Error {
  constructor(cause: unknown) {
    super(
      "An OpenRouter request may have reached the provider, but its response was not durably recorded. Coursemap will not issue an automatic second paid call.",
      { cause },
    );
    this.name = "CourseImportPaidOutcomeUncertainError";
  }
}

class CourseImportVersionMismatchError extends TypeError {
  readonly code = "IMPORT_VERSION_UNSUPPORTED";

  constructor() {
    super(
      "The queued course import was created for a different pipeline version. Start a new import with the deployed worker.",
    );
    this.name = "CourseImportVersionMismatchError";
  }
}

function assertCurrentCourseImportVersions({
  parserVersion,
  promptVersion,
  schemaVersion,
}: {
  parserVersion: string;
  promptVersion: string;
  schemaVersion: string;
}) {
  if (
    parserVersion !== COURSE_IMPORT_PARSER_VERSION ||
    promptVersion !== COURSE_IMPORT_PROMPT_VERSION ||
    schemaVersion !== COURSE_SNAPSHOT_SCHEMA_VERSION
  ) {
    throw new CourseImportVersionMismatchError();
  }
}

function normaliseOpenRouterAttemptError(error: unknown) {
  if (
    error instanceof OpenRouterConfigurationError ||
    error instanceof OpenRouterRequestError
  ) {
    return error;
  }

  return new CourseImportPaidOutcomeUncertainError(error);
}

type ProcessCourseImportTargetInput = {
  runId: string;
  targetId: string;
  messageId?: string;
  deliveryCount?: number;
  maxDeliveries?: number;
  signal?: AbortSignal;
};

function safeErrorSummary(error: unknown) {
  const source =
    error instanceof Error ? error.message : "Course import failed.";
  return source
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database URL redacted]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[OpenRouter key redacted]")
    .slice(0, 1_500);
}

function errorCode(error: unknown) {
  if (error instanceof CourseImportPaidOutcomeUncertainError)
    return "OPENROUTER_OUTCOME_UNCERTAIN";
  if (error instanceof CourseSourceError) return error.code;
  if (error instanceof OpenRouterConfigurationError)
    return "OPENROUTER_NOT_CONFIGURED";
  if (error instanceof OpenRouterRequestError)
    return `OPENROUTER_HTTP_${error.status}`;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.trim()
  ) {
    return error.code.trim().slice(0, 120);
  }
  return error instanceof TypeError ? "INVALID_PIPELINE_DATA" : "IMPORT_FAILED";
}

function isRetryableCourseImportError(error: unknown) {
  if (error instanceof CourseSourceError) return error.retryable;
  // A definitive HTTP failure is safe to report, but the pending extraction
  // reservation cannot yet represent a second provider attempt. Retrying the
  // same target would therefore be misclassified as an uncertain paid outcome.
  if (error instanceof OpenRouterRequestError) return false;
  if (
    error instanceof OpenRouterConfigurationError ||
    error instanceof CourseImportPaidOutcomeUncertainError ||
    error instanceof CourseImportArtifactConfigurationError ||
    error instanceof TypeError
  ) {
    return false;
  }
  return true;
}

function isRecoveryOnlyDelivery(deliveryCount: number, maxDeliveries: number) {
  return deliveryCount > maxDeliveries;
}

const courseImportClaimDependencies = {
  recover: recoverStaleCourseImportTarget,
  claim: claimCourseImportTarget,
};

async function recoverOrClaimCourseImportTarget({
  sql,
  runId,
  targetId,
  messageId,
  workerId,
  recoveryOnlyDelivery,
  dependencies = courseImportClaimDependencies,
}: {
  sql: Parameters<typeof claimCourseImportTarget>[0];
  runId: string;
  targetId: string;
  messageId: string;
  workerId: string;
  recoveryOnlyDelivery: boolean;
  dependencies?: typeof courseImportClaimDependencies;
}) {
  if (!recoveryOnlyDelivery) {
    return dependencies.claim(sql, {
      runId,
      targetId,
      messageId,
      workerId,
    });
  }

  const recovered = await dependencies.recover(sql, { runId, targetId });
  if (recovered) return null;
  throw new Error(
    "Course import target is awaiting bounded stale-delivery recovery.",
  );
}

export async function processCourseImportTarget({
  runId,
  targetId,
  messageId = `course-import:${runId}:${targetId}`,
  deliveryCount = 1,
  maxDeliveries = 5,
  signal,
}: ProcessCourseImportTargetInput): Promise<void> {
  await withCourseImportDatabaseClient(async (sql) => {
    signal?.throwIfAborted();
    const workerId = randomUUID();
    let claim;
    try {
      claim = await recoverOrClaimCourseImportTarget({
        sql,
        runId,
        targetId,
        messageId,
        workerId,
        recoveryOnlyDelivery: isRecoveryOnlyDelivery(
          deliveryCount,
          maxDeliveries,
        ),
      });
      if (claim === null) return;
    } catch (error) {
      const status = await getCourseImportTargetStatus(sql, {
        runId,
        targetId,
      });
      if (status && TERMINAL_TARGET_STATUSES.has(status.processingStatus))
        return;
      throw error;
    }

    let sourcePageId: number | null = null;

    const runStage = async <T>(
      stageName: CourseImportStageName,
      work: (stageId: string) => Promise<T>,
    ) => {
      signal?.throwIfAborted();
      const stageId = await startCourseImportStage(sql, {
        targetId,
        stageName,
      });
      try {
        const value = await work(stageId);
        signal?.throwIfAborted();
        await finishCourseImportStage(sql, { targetId, stageName });
        return value;
      } catch (error) {
        await failCourseImportStage(sql, {
          targetId,
          stageName,
          errorCode: errorCode(error),
          errorSummary: safeErrorSummary(error),
        });
        throw error;
      }
    };

    const persistArtifact = async ({
      stageId,
      stageName,
      kind,
      mediaType,
      body,
    }: {
      stageId: string;
      stageName: CourseImportStageName;
      kind: Parameters<typeof storeCourseImportArtifact>[0]["kind"];
      mediaType: string;
      body: string;
    }) => {
      signal?.throwIfAborted();
      const stored = await storeCourseImportArtifact({
        academicYear: claim.academicYear,
        runId,
        targetId,
        stage: stageName,
        kind,
        mediaType,
        body,
      });
      signal?.throwIfAborted();
      return recordCourseImportArtifact(sql, {
        targetId,
        stageId,
        kind,
        attemptNumber: claim.attemptCount,
        mediaType: stored.mediaType,
        contentSha256: stored.contentSha256,
        byteSize: stored.byteSize,
        storageBucket: stored.bucket,
        storagePath: stored.path,
      });
    };

    try {
      assertCurrentCourseImportVersions(claim);
      const fetched = await runStage("source_fetch", () =>
        fetchAnuCoursePage(claim.academicYear, claim.courseCode, { signal }),
      );

      await runStage("html_capture", async (stageId) => {
        const rawArtifact = await persistArtifact({
          stageId,
          stageName: "html_capture",
          kind: "raw_html",
          mediaType: "text/html",
          body: fetched.html,
        });
        sourcePageId = await recordCourseSourcePage(sql, {
          sourceId: claim.sourceId,
          academicYearId: claim.academicYearId,
          courseCode: claim.courseCode,
          canonicalUrl: fetched.canonicalUrl,
          contentSha256: fetched.contentSha256,
          httpStatus: fetched.httpStatus,
          httpEtag: fetched.httpEtag,
          sourceLastModified: fetched.sourceLastModified,
          fetchedAt: fetched.fetchedAt,
          byteSize: fetched.byteSize,
          storageBucket: rawArtifact.storageBucket,
          storagePath: rawArtifact.storagePath,
        });
        if (fetched.sourceError) throw fetched.sourceError;
      });

      const markdown = await runStage("markdown_normalise", async (stageId) => {
        const result = convertCourseHtmlToMarkdown({
          html: fetched.html,
          courseCode: claim.courseCode,
          year: claim.academicYear,
          sourceUrl: fetched.sourceUrl,
        });
        await persistArtifact({
          stageId,
          stageName: "markdown_normalise",
          kind: "normalised_markdown",
          mediaType: "text/markdown",
          body: result.markdown,
        });
        return result;
      });

      const preparedInput = await runStage(
        "model_input_prepare",
        async (stageId) => {
          const selected = buildCourseModelInput(
            markdown.markdown,
            claim.academicYear,
          );
          const userPrompt = buildCourseExtractionUserPrompt({
            expectedCode: claim.courseCode,
            academicYear: claim.academicYear,
            modelInput: selected.modelInput,
          });
          await persistArtifact({
            stageId,
            stageName: "model_input_prepare",
            kind: "model_input",
            mediaType: "text/plain",
            body: userPrompt,
          });
          return { ...selected, userPrompt };
        },
      );

      const deterministic = await runStage(
        "deterministic_extract",
        async (stageId) => {
          const result = extractDeterministicCourse({
            html: fetched.html,
            courseCode: claim.courseCode,
            year: claim.academicYear,
            sourceUrl: fetched.sourceUrl,
          });
          await persistArtifact({
            stageId,
            stageName: "deterministic_extract",
            kind: "deterministic_output",
            mediaType: "application/json",
            body: stableStringify(result),
          });
          return result;
        },
      );

      const systemPrompt = buildCourseExtractionSystemPrompt();
      const requestBody = buildOpenRouterCourseRequestBody({
        model: claim.requestedModel,
        systemPrompt,
        modelInput: preparedInput.userPrompt,
        schema: COURSE_EXTRACTION_JSON_SCHEMA,
      });
      const extractionFingerprint = stableFingerprint({
        sourceContentSha256: fetched.contentSha256,
        parserVersion: claim.parserVersion,
        promptVersion: claim.promptVersion,
        schemaVersion: claim.schemaVersion,
        requestBody,
      });
      const extractionStartedAt = new Date().toISOString();
      const modelResult = await runStage("model_extract", async (stageId) => {
        const requestArtifact = await persistArtifact({
          stageId,
          stageName: "model_extract",
          kind: "model_request",
          mediaType: "application/json",
          body: stableStringify(requestBody),
        });

        const existingExtraction = await findReusableCourseExtraction(sql, {
          targetId,
          extractionFingerprint,
        });
        if (existingExtraction && existingExtraction.targetId === targetId) {
          const body = await readCourseImportArtifact({
            artifact: existingExtraction.responseArtifact,
          });
          return {
            result: restoreOpenRouterCourseExtraction(
              JSON.parse(body) as unknown,
              claim.requestedModel,
            ),
            extraction: existingExtraction,
          };
        }

        const reservation = await reserveCourseExtraction(sql, {
          targetId,
          extractionNumber: claim.attemptCount,
          requestedModel: claim.requestedModel,
          extractionFingerprint,
          promptVersion: claim.promptVersion,
          schemaVersion: claim.schemaVersion,
          requestArtifactId: requestArtifact.id,
          startedAt: extractionStartedAt,
        });

        let result;
        let responseArtifactId: string;
        let reusedFromExtractionId: string | null = null;
        let reusedAcrossTargets = false;

        if (existingExtraction) {
          const body = await readCourseImportArtifact({
            artifact: existingExtraction.responseArtifact,
          });
          result = restoreOpenRouterCourseExtraction(
            JSON.parse(body) as unknown,
            claim.requestedModel,
          );
          const responseArtifact = await persistArtifact({
            stageId,
            stageName: "model_extract",
            kind: "model_response",
            mediaType: "application/json",
            body: stableStringify(result.responseForAudit),
          });
          responseArtifactId = responseArtifact.id;
          reusedFromExtractionId = existingExtraction.id;
          reusedAcrossTargets = true;
        } else if (!reservation.created) {
          const orphanedResponse = await findReusableCourseModelResponse(sql, {
            targetId,
            requestArtifactId: reservation.requestArtifactId,
          });
          if (!orphanedResponse) {
            throw new CourseImportPaidOutcomeUncertainError(null);
          }
          const body = await readCourseImportArtifact({
            artifact: orphanedResponse,
          });
          result = restoreOpenRouterCourseExtraction(
            JSON.parse(body) as unknown,
            claim.requestedModel,
          );
          responseArtifactId = orphanedResponse.id;
        } else {
          try {
            result = await extractCourseWithOpenRouter({
              model: claim.requestedModel,
              systemPrompt,
              modelInput: preparedInput.userPrompt,
              schema: COURSE_EXTRACTION_JSON_SCHEMA,
              signal,
            });
            const responseArtifact = await persistArtifact({
              stageId,
              stageName: "model_extract",
              kind: "model_response",
              mediaType: "application/json",
              body: stableStringify(result.responseForAudit),
            });
            responseArtifactId = responseArtifact.id;
          } catch (error) {
            throw normaliseOpenRouterAttemptError(error);
          }
        }

        const extraction = await attachCourseExtractionResponse(sql, {
          reservationId: reservation.id,
          targetId,
          responseArtifactId,
          resolvedModel: result.resolvedModel,
          reusedFromExtractionId,
          providerRequestId: result.generationId,
          finishReason: result.finishReason,
          inputTokens: result.usage.inputTokens ?? 0,
          cachedInputTokens: result.usage.cachedInputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
          reasoningTokens: result.usage.reasoningTokens ?? 0,
          costUsd: reusedAcrossTargets ? 0 : (result.usage.costUsd ?? 0),
          costSource: reusedAcrossTargets
            ? "cache"
            : result.usage.costUsd === null
              ? "unknown"
              : "provider",
          latencyMs: result.latencyMilliseconds,
        });
        return { result, extraction };
      });

      const providerValidation = validateCourseExtraction(
        modelResult.result.parsed,
        {
          expectedCode: claim.courseCode,
          expectedYear: claim.academicYear,
          evidenceMethod: "model",
        },
      );
      const canonicalModel = canonicaliseCourseModelExtraction(
        modelResult.result.parsed,
        {
          expectedCode: claim.courseCode,
          expectedYear: claim.academicYear,
        },
      );
      const modelValidation = await runStage("schema_validate", async () =>
        validateCourseExtraction(canonicalModel.value, {
          expectedCode: claim.courseCode,
          expectedYear: claim.academicYear,
          evidenceMethod: "model",
        }),
      );

      const merged = await runStage("domain_validate", async (stageId) => {
        const result = mergeCourseExtractions({
          deterministic,
          model: canonicalModel.value,
          modelInput: preparedInput.userPrompt,
        });
        const canonicalisationReviewItem =
          courseModelCanonicalisationReviewItem(canonicalModel.changes);
        if (canonicalisationReviewItem) {
          result.extraction.reviewItems.push(canonicalisationReviewItem);
        }
        const validationReport = {
          providerSchemaValid: providerValidation.success,
          providerValidationIssues: providerValidation.success
            ? []
            : providerValidation.issues,
          schemaValid: modelValidation.success,
          modelValidationIssues: modelValidation.success
            ? []
            : modelValidation.issues,
          canonicalisationChanges: canonicalModel.changes,
          conflicts: result.conflicts,
          evidenceIssues: result.evidenceIssues,
          modelAcceptedFields: result.modelAcceptedFields,
          modelRejectedFields: result.modelRejectedFields,
          reviewItems: result.extraction.reviewItems,
        };
        const validatedArtifact = await persistArtifact({
          stageId,
          stageName: "domain_validate",
          kind: "validated_json",
          mediaType: "application/json",
          body: stableStringify(result.extraction),
        });
        await persistArtifact({
          stageId,
          stageName: "domain_validate",
          kind: "validation_report",
          mediaType: "application/json",
          body: stableStringify(validationReport),
        });

        const warningCount = result.extraction.reviewItems.filter(
          ({ severity }) => severity === "warning",
        ).length;
        const errorCount = modelValidation.success
          ? result.extraction.reviewItems.filter(
              ({ severity }) => severity === "error",
            ).length
          : modelValidation.issues.length;
        const schemaValid = modelValidation.success;
        const domainValid = schemaValid && errorCount === 0;
        await completeCourseExtraction(sql, {
          targetId,
          extractionId: modelResult.extraction.id,
          validatedArtifactId: validatedArtifact.id,
          validationStatus: schemaValid && domainValid ? "valid" : "invalid",
          schemaValid,
          domainValid,
          warningCount,
          errorCount,
          completedAt: new Date().toISOString(),
          errorSummary:
            schemaValid && domainValid
              ? null
              : "The model response failed strict extraction validation; deterministic data was retained.",
        });
        return result;
      });

      const projection = await runStage("database_project", async (stageId) => {
        const result = buildCourseSnapshotProjection(merged.extraction);
        await persistArtifact({
          stageId,
          stageName: "database_project",
          kind: "database_projection",
          mediaType: "application/json",
          body: stableStringify(result),
        });
        return result;
      });

      const persisted = await runStage("snapshot_persist", async (stageId) => {
        if (sourcePageId === null) {
          throw new Error("The source page was not recorded.");
        }
        const result = await persistCourseSnapshotCandidate(sql, {
          claim,
          sourcePageId,
          projection,
          extraction: merged.extraction,
        });
        await persistArtifact({
          stageId,
          stageName: "snapshot_persist",
          kind: "change_set",
          mediaType: "application/json",
          body: stableStringify(result.changeSet),
        });
        return result;
      });

      await finishCourseImportTarget(sql, {
        runId,
        targetId,
        messageId,
        workerId,
        expectedLockVersion: claim.lockVersion,
        processingStatus:
          persisted.changeKind === "unchanged"
            ? "unchanged"
            : "ready_for_review",
        changeKind: persisted.changeKind,
        courseId: persisted.courseId,
        courseYearId: persisted.courseYearId,
        sourcePageId,
        candidateSnapshotId: persisted.candidateSnapshotId,
      });
    } catch (error) {
      const code = errorCode(error);
      const summary = safeErrorSummary(error);
      const finalDelivery = deliveryCount >= maxDeliveries;
      if (isRetryableCourseImportError(error) && !finalDelivery) {
        await releaseCourseImportTargetForRetry(sql, {
          runId,
          targetId,
          messageId,
          workerId,
          expectedLockVersion: claim.lockVersion,
          errorCode: code,
          errorSummary: summary,
        });
        throw error;
      }

      await finishCourseImportTarget(sql, {
        runId,
        targetId,
        messageId,
        workerId,
        expectedLockVersion: claim.lockVersion,
        processingStatus: "failed",
        changeKind: null,
        courseId: claim.courseId,
        courseYearId: claim.courseYearId,
        sourcePageId,
        candidateSnapshotId: null,
        errorCode: code,
        errorSummary: summary,
      });

      // A permanent or final-delivery failure is now durable. Returning lets
      // Vercel acknowledge the message without leaving the target processing.
    }
  });
}

export const courseImportTargetInternals = {
  CourseImportPaidOutcomeUncertainError,
  CourseImportVersionMismatchError,
  assertCurrentCourseImportVersions,
  errorCode,
  isRecoveryOnlyDelivery,
  isRetryableCourseImportError,
  normaliseOpenRouterAttemptError,
  recoverOrClaimCourseImportTarget,
  safeErrorSummary,
};
