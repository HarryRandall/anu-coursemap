import { randomUUID } from "node:crypto";
import {
  CourseImportArtifactConfigurationError,
  readCourseImportArtifact,
  storeCourseImportArtifact,
  type CourseImportArtifactLocator,
} from "../course-import/artifact-store.ts";
import { stableStringify } from "../course-import/canonical.ts";
import {
  OpenRouterConfigurationError,
  OpenRouterRequestError,
  buildOpenRouterCourseRequestBody,
  extractCourseWithOpenRouter,
  restoreOpenRouterCourseExtraction,
} from "../course-import/openrouter.ts";
import {
  ACADEMIC_STRUCTURE_EXTRACTION_JSON_SCHEMA,
  parseAcademicStructureExtraction,
  validateAcademicStructureExtraction,
  type AcademicStructureExtraction,
  type AcademicStructureRequirementRule,
} from "./contract.ts";
import { extractDeterministicAcademicStructure } from "./deterministic.ts";
import {
  claimAcademicStructureImportTarget,
  failAcademicStructureImportStage,
  findAcademicStructureImportArtifact,
  finishAcademicStructureImportStage,
  finishAcademicStructureImportTarget,
  getAcademicStructureImportTargetStatus,
  recordAcademicStructureExtraction,
  recordAcademicStructureImportArtifact,
  recordAcademicStructureSourcePage,
  recoverStaleAcademicStructureImportTarget,
  releaseAcademicStructureImportTargetForRetry,
  startAcademicStructureImportStage,
  withAcademicStructureImportDatabaseClient,
  type AcademicStructureImportArtifactKind,
  type AcademicStructureImportArtifactLocator,
  type AcademicStructureImportStageName,
  type ClaimedAcademicStructureImportTarget,
} from "./import-store.ts";
import {
  buildAcademicStructureModelInput,
  convertAcademicStructureHtmlToMarkdown,
} from "./markdown.ts";
import { persistAcademicStructureSnapshotCandidate } from "./persist-snapshot.ts";
import {
  ACADEMIC_STRUCTURE_IMPORT_PARSER_VERSION,
  ACADEMIC_STRUCTURE_IMPORT_PROMPT_VERSION,
  ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION,
  buildAcademicStructureExtractionSystemPrompt,
  buildAcademicStructureExtractionUserPrompt,
} from "./prompt.ts";
import { projectAcademicStructureSnapshot } from "./project-snapshot.ts";
import {
  AcademicStructureSourceError,
  fetchAnuAcademicStructurePage,
} from "./source.ts";

const TERMINAL_TARGET_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

class AcademicStructureImportPaidOutcomeUncertainError extends Error {
  constructor(cause: unknown) {
    super(
      "An OpenRouter request may have reached the provider, but its response was not durably recorded. Coursemap will not issue an automatic second paid call.",
      { cause },
    );
    this.name = "AcademicStructureImportPaidOutcomeUncertainError";
  }
}

class AcademicStructureImportVersionMismatchError extends TypeError {
  readonly code = "IMPORT_VERSION_UNSUPPORTED";

  constructor() {
    super(
      "The queued academic structure import was created for a different pipeline version. Start a new import with the deployed worker.",
    );
    this.name = "AcademicStructureImportVersionMismatchError";
  }
}

function assertCurrentAcademicStructureImportVersions({
  parserVersion,
  promptVersion,
  schemaVersion,
}: Pick<
  ClaimedAcademicStructureImportTarget,
  "parserVersion" | "promptVersion" | "schemaVersion"
>) {
  if (
    parserVersion !== ACADEMIC_STRUCTURE_IMPORT_PARSER_VERSION ||
    promptVersion !== ACADEMIC_STRUCTURE_IMPORT_PROMPT_VERSION ||
    schemaVersion !== ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION
  ) {
    throw new AcademicStructureImportVersionMismatchError();
  }
}

type ProcessAcademicStructureImportTargetInput = {
  runId: string;
  targetId: string;
  messageId?: string;
  deliveryCount?: number;
  maxDeliveries?: number;
  signal?: AbortSignal;
};

function safeErrorSummary(error: unknown) {
  const source =
    error instanceof Error
      ? error.message
      : "Academic structure import failed.";
  return source
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database URL redacted]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[OpenRouter key redacted]")
    .slice(0, 1_500);
}

function errorCode(error: unknown) {
  if (error instanceof AcademicStructureImportPaidOutcomeUncertainError) {
    return "OPENROUTER_OUTCOME_UNCERTAIN";
  }
  if (error instanceof AcademicStructureSourceError) return error.code;
  if (error instanceof OpenRouterConfigurationError) {
    return "OPENROUTER_NOT_CONFIGURED";
  }
  if (error instanceof OpenRouterRequestError) {
    return `OPENROUTER_HTTP_${error.status}`;
  }
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

function isRetryableAcademicStructureImportError(error: unknown) {
  if (error instanceof AcademicStructureSourceError) return error.retryable;
  if (error instanceof OpenRouterRequestError) return false;
  if (
    error instanceof OpenRouterConfigurationError ||
    error instanceof AcademicStructureImportPaidOutcomeUncertainError ||
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

const academicStructureImportClaimDependencies = {
  recover: recoverStaleAcademicStructureImportTarget,
  claim: claimAcademicStructureImportTarget,
};

async function recoverOrClaimAcademicStructureImportTarget({
  sql,
  runId,
  targetId,
  messageId,
  workerId,
  recoveryOnlyDelivery,
  dependencies = academicStructureImportClaimDependencies,
}: {
  sql: Parameters<typeof claimAcademicStructureImportTarget>[0];
  runId: string;
  targetId: string;
  messageId: string;
  workerId: string;
  recoveryOnlyDelivery: boolean;
  dependencies?: typeof academicStructureImportClaimDependencies;
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
    "Academic structure import target is awaiting bounded stale-delivery recovery.",
  );
}

function normalisedSourceText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\[(.*?)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sourceTokens(value: string) {
  return normalisedSourceText(value).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function sourceSupportsStructuredText(source: string, candidate: string) {
  const normalisedCandidate = normalisedSourceText(candidate);
  if (!normalisedCandidate) return true;
  if (source.includes(normalisedCandidate)) return true;

  const sourceWords = sourceTokens(source);
  const candidateWords = sourceTokens(candidate);
  if (candidateWords.length === 0) return false;

  let sourceIndex = 0;
  return candidateWords.every((candidateWord) => {
    while (
      sourceIndex < sourceWords.length &&
      sourceWords[sourceIndex] !== candidateWord
    ) {
      sourceIndex += 1;
    }
    if (sourceIndex >= sourceWords.length) return false;
    sourceIndex += 1;
    return true;
  });
}

function normaliseAcademicStructureModelExtraction(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { value, normalisations: [] as string[] };
  }

  const normalised = structuredClone(value) as Record<string, unknown>;
  const normalisations: string[] = [];
  const requirements = normalised.requirements;
  if (
    typeof requirements !== "object" ||
    requirements === null ||
    Array.isArray(requirements)
  ) {
    return { value: normalised, normalisations };
  }

  const visitRule = (rule: unknown, path: string) => {
    if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
      return;
    }
    const record = rule as Record<string, unknown>;
    if (record.type === "group" && Array.isArray(record.children)) {
      record.children.forEach((child, index) =>
        visitRule(child, `${path}.children.${index}`),
      );
      return;
    }
    if (
      record.type === "condition" &&
      record.conditionKind === "level" &&
      typeof record.subjectCode === "string" &&
      record.subjectCode.trim() !== ""
    ) {
      record.conditionKind = "subject";
      normalisations.push(
        `${path}.conditionKind was changed from level to subject because the condition includes subjectCode.`,
      );
    }
    if (
      record.type === "condition" &&
      record.conditionKind !== "free_text" &&
      typeof record.freeText === "string"
    ) {
      record.freeText = null;
      normalisations.push(
        `${path}.freeText was cleared because sourceText already preserves the condition wording.`,
      );
    }
  };

  visitRule(
    (requirements as Record<string, unknown>).rule,
    "$.requirements.rule",
  );
  return { value: normalised, normalisations };
}

function requirementSourceTexts(
  rule: AcademicStructureRequirementRule | null,
): string[] {
  if (!rule) return [];
  return [
    rule.sourceText,
    ...(rule.type === "group"
      ? rule.children.flatMap((child) => requirementSourceTexts(child))
      : []),
  ];
}

function academicStructureModelEvidenceIssues(
  extraction: AcademicStructureExtraction,
  modelInput: string,
) {
  const source = normalisedSourceText(modelInput);
  const structuredSourceTexts = [
    ...extraction.summaryFields.map(({ sourceText }) => sourceText),
    ...extraction.sections.map(({ sourceText }) => sourceText),
    ...extraction.learningOutcomes.map(({ sourceText }) => sourceText),
    ...extraction.fees.map(({ sourceText }) => sourceText),
    ...extraction.relationships.map(({ sourceText }) => sourceText),
    ...(extraction.requirements.sourceText
      ? [extraction.requirements.sourceText]
      : []),
    ...requirementSourceTexts(extraction.requirements.rule),
    ...extraction.requirements.unmodelledText,
  ];
  const evidenceExcerpts = extraction.evidence.map(
    ({ evidenceExcerpt }) => evidenceExcerpt,
  );
  return [
    ...new Set([
      ...structuredSourceTexts.flatMap((candidate) =>
        sourceSupportsStructuredText(source, candidate)
          ? []
          : [
              `Source wording was not supported by model input: ${candidate.slice(0, 160)}`,
            ],
      ),
      ...evidenceExcerpts.flatMap((candidate) => {
        const normalised = normalisedSourceText(candidate);
        return normalised && !source.includes(normalised)
          ? [
              `Source evidence was not found in model input: ${candidate.slice(0, 160)}`,
            ]
          : [];
      }),
    ]),
  ];
}

function relationshipKey(
  relationship: AcademicStructureExtraction["relationships"][number],
) {
  return [
    relationship.targetKind,
    relationship.targetCode,
    relationship.sourceLocator,
  ].join(":");
}

function mergeRelationships(
  deterministic: AcademicStructureExtraction["relationships"],
  model: AcademicStructureExtraction["relationships"],
) {
  const modelByKey = new Map(
    model.map((item) => [relationshipKey(item), item]),
  );
  const merged = deterministic.map(
    (item) => modelByKey.get(relationshipKey(item)) ?? item,
  );
  const present = new Set(merged.map(relationshipKey));
  merged.push(...model.filter((item) => !present.has(relationshipKey(item))));
  return merged.map((item, index) => ({ ...item, position: index + 1 }));
}

function mergeEvidence(
  deterministic: AcademicStructureExtraction["evidence"],
  model: AcademicStructureExtraction["evidence"],
) {
  const seen = new Set<string>();
  return [...deterministic, ...model].filter((item) => {
    const key = [
      item.fieldKey,
      item.sourceLocator,
      item.evidenceExcerpt,
      item.method,
    ].join("\u0000");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeFees(
  deterministic: AcademicStructureExtraction["fees"],
  model: AcademicStructureExtraction["fees"],
) {
  const deterministicSources = new Set(
    deterministic.map(({ audience, sourceLocator }) =>
      JSON.stringify([audience, sourceLocator]),
    ),
  );
  return [
    ...deterministic,
    ...model.filter(
      ({ audience, sourceLocator }) =>
        !deterministicSources.has(JSON.stringify([audience, sourceLocator])),
    ),
  ].map((fee, index) => ({ ...fee, position: index + 1 }));
}

function ensureRequirementRootGroup(
  requirements: AcademicStructureExtraction["requirements"],
) {
  const rule = requirements.rule;
  if (!rule || rule.type === "group") return requirements;
  return {
    ...requirements,
    rule: {
      type: "group" as const,
      key:
        rule.key === "requirements:root"
          ? "requirements:root-group"
          : "requirements:root",
      operator: "all_of" as const,
      minimumCount: null,
      title: "Requirements",
      sourceText: requirements.sourceText ?? rule.sourceText,
      sourceLocator: requirements.sourceLocator ?? rule.sourceLocator,
      children: [rule],
    },
  };
}

function mergeAcademicStructureExtractions({
  deterministic,
  model,
}: {
  deterministic: AcademicStructureExtraction;
  model: AcademicStructureExtraction;
}) {
  const modelHasRequirements = model.requirements.rule !== null;
  const deterministicReviewItems = deterministic.reviewItems.filter(
    (item) =>
      !(
        modelHasRequirements &&
        item.fieldKey === "requirements.rule" &&
        item.kind === "unsupported"
      ),
  );
  const reviewItems = [
    ...deterministicReviewItems,
    ...model.reviewItems,
  ].filter(
    (item, index, items) =>
      items.findIndex(
        (candidate) =>
          candidate.fieldKey === item.fieldKey &&
          candidate.kind === item.kind &&
          candidate.message === item.message,
      ) === index,
  );
  const introduction = deterministic.introduction ?? model.introduction;
  const descriptionCandidate = deterministic.description ?? model.description;
  const description =
    introduction &&
    descriptionCandidate?.localeCompare(introduction, undefined, {
      sensitivity: "accent",
    }) === 0
      ? null
      : descriptionCandidate;
  const merged: AcademicStructureExtraction = {
    ...model,
    kind: deterministic.kind,
    code: deterministic.code,
    year: deterministic.year,
    title: deterministic.title,
    acronym: deterministic.acronym ?? model.acronym,
    shortName: deterministic.shortName ?? model.shortName,
    introduction,
    description,
    totalUnits: deterministic.totalUnits ?? model.totalUnits,
    durationYears: deterministic.durationYears ?? model.durationYears,
    academicCareer: deterministic.academicCareer ?? model.academicCareer,
    college: deterministic.college ?? model.college,
    deliveryMode: deterministic.deliveryMode ?? model.deliveryMode,
    selectionRank: deterministic.selectionRank ?? model.selectionRank,
    atar: deterministic.atar ?? model.atar,
    canCombine: deterministic.canCombine ?? model.canCombine,
    canCombineVertical:
      deterministic.canCombineVertical ?? model.canCombineVertical,
    studyAs: deterministic.studyAs ?? model.studyAs,
    contactText: deterministic.contactText ?? model.contactText,
    summaryFields: deterministic.summaryFields,
    sections: deterministic.sections,
    learningOutcomes: deterministic.learningOutcomes,
    fees: mergeFees(deterministic.fees, model.fees),
    relationships: mergeRelationships(
      deterministic.relationships,
      model.relationships,
    ),
    requirements: ensureRequirementRootGroup(
      modelHasRequirements ? model.requirements : deterministic.requirements,
    ),
    evidence: mergeEvidence(deterministic.evidence, model.evidence),
    reviewItems,
  };
  return parseAcademicStructureExtraction(merged, {
    expectedKind: deterministic.kind,
    expectedCode: deterministic.code,
    expectedYear: deterministic.year,
  });
}

function asCourseArtifactLocator(
  artifact: AcademicStructureImportArtifactLocator,
): CourseImportArtifactLocator {
  return {
    bucket: artifact.bucket as CourseImportArtifactLocator["bucket"],
    path: artifact.path,
    mediaType: artifact.mediaType,
    contentSha256: artifact.contentSha256,
    byteSize: artifact.byteSize,
  };
}

export async function processAcademicStructureImportTarget({
  runId,
  targetId,
  messageId = `academic-structure-import:${runId}:${targetId}`,
  deliveryCount = 1,
  maxDeliveries = 5,
  signal,
}: ProcessAcademicStructureImportTargetInput): Promise<void> {
  await withAcademicStructureImportDatabaseClient(async (sql) => {
    signal?.throwIfAborted();
    const workerId = randomUUID();
    let claim;
    try {
      claim = await recoverOrClaimAcademicStructureImportTarget({
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
      const status = await getAcademicStructureImportTargetStatus(sql, {
        runId,
        targetId,
      });
      if (status && TERMINAL_TARGET_STATUSES.has(status.processingStatus)) {
        return;
      }
      throw error;
    }

    let sourcePageId: number | null = null;
    const leaseFence = {
      targetId,
      messageId,
      workerId,
      expectedLockVersion: claim.lockVersion,
    };

    const runStage = async <T>(
      stageName: AcademicStructureImportStageName,
      work: (stageId: string) => Promise<T>,
    ) => {
      signal?.throwIfAborted();
      const stageId = await startAcademicStructureImportStage(sql, {
        ...leaseFence,
        stageName,
      });
      try {
        const value = await work(stageId);
        signal?.throwIfAborted();
        await finishAcademicStructureImportStage(sql, {
          ...leaseFence,
          stageName,
        });
        return value;
      } catch (error) {
        await failAcademicStructureImportStage(sql, {
          ...leaseFence,
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
      stageName: AcademicStructureImportStageName;
      kind: AcademicStructureImportArtifactKind;
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
      return recordAcademicStructureImportArtifact(sql, {
        ...leaseFence,
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
      assertCurrentAcademicStructureImportVersions(claim);
      const fetched = await runStage("source_fetch", () =>
        fetchAnuAcademicStructurePage(
          claim.academicYear,
          claim.structureKind,
          claim.structureCode,
          { signal },
        ),
      );

      await runStage("html_capture", async (stageId) => {
        const rawArtifact = await persistArtifact({
          stageId,
          stageName: "html_capture",
          kind: "raw_html",
          mediaType: "text/html",
          body: fetched.html,
        });
        sourcePageId = await recordAcademicStructureSourcePage(sql, {
          sourceId: claim.sourceId,
          academicYearId: claim.academicYearId,
          structureKind: claim.structureKind,
          structureCode: claim.structureCode,
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
        const result = convertAcademicStructureHtmlToMarkdown({
          html: fetched.html,
          kind: claim.structureKind,
          code: claim.structureCode,
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
          const selected = buildAcademicStructureModelInput(markdown);
          const userPrompt = buildAcademicStructureExtractionUserPrompt({
            expectedKind: claim.structureKind,
            expectedCode: claim.structureCode,
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
          const result = extractDeterministicAcademicStructure({
            html: fetched.html,
            kind: claim.structureKind,
            code: claim.structureCode,
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

      const systemPrompt = buildAcademicStructureExtractionSystemPrompt();
      const requestBody = buildOpenRouterCourseRequestBody({
        model: claim.requestedModel,
        systemPrompt,
        modelInput: preparedInput.userPrompt,
        schema: ACADEMIC_STRUCTURE_EXTRACTION_JSON_SCHEMA,
        schemaName: "academic_structure_extraction",
      });
      const requestJson = stableStringify(requestBody);
      const modelResult = await runStage("model_extract", async (stageId) => {
        const requestArtifact = await persistArtifact({
          stageId,
          stageName: "model_extract",
          kind: "model_request",
          mediaType: "application/json",
          body: requestJson,
        });

        let reusableResponse:
          (AcademicStructureImportArtifactLocator & { id: string }) | null =
          null;
        let reusableAttempt = 0;
        let uncertainPriorRequest = false;
        for (let attempt = claim.attemptCount; attempt >= 1; attempt -= 1) {
          const response = await findAcademicStructureImportArtifact(sql, {
            targetId,
            kind: "model_response",
            attemptNumber: attempt,
          });
          if (response) {
            const priorRequest = await findAcademicStructureImportArtifact(
              sql,
              {
                targetId,
                kind: "model_request",
                attemptNumber: attempt,
              },
            );
            if (
              !priorRequest ||
              priorRequest.contentSha256 !== requestArtifact.contentSha256
            ) {
              throw new AcademicStructureImportPaidOutcomeUncertainError(null);
            }
            reusableResponse = response;
            reusableAttempt = attempt;
            break;
          }
          const priorRequest = await findAcademicStructureImportArtifact(sql, {
            targetId,
            kind: "model_request",
            attemptNumber: attempt,
          });
          if (priorRequest && attempt < claim.attemptCount) {
            uncertainPriorRequest = true;
          }
        }

        if (!reusableResponse && !uncertainPriorRequest) {
          const [cached] = await sql`
            select
              responses.id,
              responses.storage_bucket,
              responses.storage_path,
              responses.media_type,
              responses.content_sha256,
              responses.byte_size
            from public.academic_structure_import_artifacts as requests
            join public.academic_structure_extractions as extractions
              on extractions.request_artifact_id = requests.id
             and extractions.validation_status = ${"valid"}
             and extractions.requested_model = ${claim.requestedModel}
            join public.academic_structure_import_artifacts as responses
              on responses.id = extractions.response_artifact_id
            where requests.artifact_kind = ${"model_request"}
              and requests.content_sha256 = ${requestArtifact.contentSha256}
            order by extractions.completed_at desc
            limit 1
          `;
          if (cached) {
            reusableResponse = {
              id: String(cached.id),
              bucket: String(cached.storage_bucket),
              path: String(cached.storage_path),
              mediaType: String(cached.media_type),
              contentSha256: String(cached.content_sha256),
              byteSize: Number(cached.byte_size),
            };
          }
        }

        if (reusableResponse) {
          const body = await readCourseImportArtifact({
            artifact: asCourseArtifactLocator(reusableResponse),
          });
          const result = restoreOpenRouterCourseExtraction(
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
          const [accounted] = await sql`
            select id
            from public.academic_structure_extractions
            where response_artifact_id = ${reusableResponse.id}
            limit 1
          `;
          return {
            result,
            requestArtifact,
            responseArtifact,
            chargedCostUsd:
              accounted || reusableAttempt === 0
                ? 0
                : (result.usage.costUsd ?? 0),
          };
        }
        if (uncertainPriorRequest) {
          throw new AcademicStructureImportPaidOutcomeUncertainError(null);
        }

        try {
          const result = await extractCourseWithOpenRouter({
            model: claim.requestedModel,
            systemPrompt,
            modelInput: preparedInput.userPrompt,
            schema: ACADEMIC_STRUCTURE_EXTRACTION_JSON_SCHEMA,
            schemaName: "academic_structure_extraction",
            signal,
          });
          const responseArtifact = await persistArtifact({
            stageId,
            stageName: "model_extract",
            kind: "model_response",
            mediaType: "application/json",
            body: stableStringify(result.responseForAudit),
          });
          return {
            result,
            requestArtifact,
            responseArtifact,
            chargedCostUsd: result.usage.costUsd ?? 0,
          };
        } catch (error) {
          if (
            error instanceof OpenRouterConfigurationError ||
            error instanceof OpenRouterRequestError
          ) {
            throw error;
          }
          throw new AcademicStructureImportPaidOutcomeUncertainError(error);
        }
      });

      const normalisedModel = normaliseAcademicStructureModelExtraction(
        modelResult.result.parsed,
      );
      const providerValidation = await runStage("schema_validate", async () =>
        validateAcademicStructureExtraction(normalisedModel.value, {
          expectedKind: claim.structureKind,
          expectedCode: claim.structureCode,
          expectedYear: claim.academicYear,
          evidenceMethod: "model",
        }),
      );

      const merged = await runStage("domain_validate", async (stageId) => {
        const evidenceIssues = providerValidation.success
          ? academicStructureModelEvidenceIssues(
              providerValidation.data,
              preparedInput.modelInput,
            )
          : [];
        const valid = providerValidation.success && evidenceIssues.length === 0;
        const validationSummary = valid
          ? null
          : providerValidation.success
            ? evidenceIssues.join(" ").slice(0, 1_500)
            : providerValidation.issues
                .map(({ path, message }) => `${path} ${message}`)
                .join("; ")
                .slice(0, 1_500);
        await persistArtifact({
          stageId,
          stageName: "domain_validate",
          kind: "validation_report",
          mediaType: "application/json",
          body: stableStringify({
            responseError: modelResult.result.responseError,
            schemaValid: providerValidation.success,
            schemaIssues: providerValidation.success
              ? []
              : providerValidation.issues,
            evidenceValid: evidenceIssues.length === 0,
            evidenceIssues,
            providerNormalisations: normalisedModel.normalisations,
          }),
        });

        const completedAt = new Date().toISOString();
        if (!valid) {
          await recordAcademicStructureExtraction(sql, {
            ...leaseFence,
            extractionNumber: claim.attemptCount,
            requestedModel: claim.requestedModel,
            resolvedModel: modelResult.result.resolvedModel,
            generationId: modelResult.result.generationId,
            promptVersion: claim.promptVersion,
            schemaVersion: claim.schemaVersion,
            requestArtifactId: modelResult.requestArtifact.id,
            responseArtifactId: modelResult.responseArtifact.id,
            finishReason: modelResult.result.finishReason,
            inputTokens: modelResult.result.usage.inputTokens,
            outputTokens: modelResult.result.usage.outputTokens,
            cachedInputTokens: modelResult.result.usage.cachedInputTokens,
            reasoningTokens: modelResult.result.usage.reasoningTokens,
            costUsd: modelResult.chargedCostUsd,
            latencyMilliseconds: modelResult.result.latencyMilliseconds,
            validationStatus: "invalid",
            validationSummary,
            completedAt,
          });
          throw new TypeError(
            validationSummary ?? "The model extraction was invalid.",
          );
        }

        const extraction = mergeAcademicStructureExtractions({
          deterministic,
          model: providerValidation.data,
        });
        await persistArtifact({
          stageId,
          stageName: "domain_validate",
          kind: "validated_json",
          mediaType: "application/json",
          body: stableStringify(extraction),
        });
        await recordAcademicStructureExtraction(sql, {
          ...leaseFence,
          extractionNumber: claim.attemptCount,
          requestedModel: claim.requestedModel,
          resolvedModel: modelResult.result.resolvedModel,
          generationId: modelResult.result.generationId,
          promptVersion: claim.promptVersion,
          schemaVersion: claim.schemaVersion,
          requestArtifactId: modelResult.requestArtifact.id,
          responseArtifactId: modelResult.responseArtifact.id,
          finishReason: modelResult.result.finishReason,
          inputTokens: modelResult.result.usage.inputTokens,
          outputTokens: modelResult.result.usage.outputTokens,
          cachedInputTokens: modelResult.result.usage.cachedInputTokens,
          reasoningTokens: modelResult.result.usage.reasoningTokens,
          costUsd: modelResult.chargedCostUsd,
          latencyMilliseconds: modelResult.result.latencyMilliseconds,
          validationStatus: "valid",
          validationSummary: null,
          completedAt,
        });
        return extraction;
      });

      const projection = await runStage("database_project", async (stageId) => {
        const result = projectAcademicStructureSnapshot(merged);
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
          throw new Error(
            "The academic structure source page was not recorded.",
          );
        }
        const result = await persistAcademicStructureSnapshotCandidate(sql, {
          claim,
          messageId,
          workerId,
          expectedLockVersion: claim.lockVersion,
          sourcePageId,
          projection,
          extraction: merged,
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

      await finishAcademicStructureImportTarget(sql, {
        runId,
        targetId,
        messageId,
        workerId,
        expectedLockVersion: claim.lockVersion,
        processingStatus: "succeeded",
        changeKind: persisted.changeKind,
        structureId: persisted.structureId,
        structureYearId: persisted.structureYearId,
        sourcePageId,
        candidateSnapshotId: persisted.candidateSnapshotId,
      });
    } catch (error) {
      const code = errorCode(error);
      const summary = safeErrorSummary(error);
      const finalDelivery = deliveryCount >= maxDeliveries;
      if (isRetryableAcademicStructureImportError(error) && !finalDelivery) {
        await releaseAcademicStructureImportTargetForRetry(sql, {
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

      await finishAcademicStructureImportTarget(sql, {
        runId,
        targetId,
        messageId,
        workerId,
        expectedLockVersion: claim.lockVersion,
        processingStatus: "failed",
        changeKind: null,
        structureId: claim.structureId,
        structureYearId: claim.structureYearId,
        sourcePageId,
        candidateSnapshotId: null,
        errorCode: code,
        errorSummary: summary,
      });
    }
  });
}

export const academicStructureImportTargetInternals = {
  AcademicStructureImportPaidOutcomeUncertainError,
  AcademicStructureImportVersionMismatchError,
  academicStructureModelEvidenceIssues,
  assertCurrentAcademicStructureImportVersions,
  ensureRequirementRootGroup,
  errorCode,
  isRecoveryOnlyDelivery,
  isRetryableAcademicStructureImportError,
  mergeAcademicStructureExtractions,
  mergeFees,
  normaliseAcademicStructureModelExtraction,
  recoverOrClaimAcademicStructureImportTarget,
  safeErrorSummary,
};
