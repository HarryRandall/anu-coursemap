#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { open, readFile, rename, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { readCourseImportArtifact } from "../../lib/course-import/artifact-store.ts";
import {
  stableFingerprint,
  stableStringify,
} from "../../lib/course-import/canonical.ts";
import {
  COURSE_EXTRACTION_JSON_SCHEMA,
  parseCourseExtraction,
  validateCourseExtraction,
} from "../../lib/course-import/contract.ts";
import {
  COURSE_MODEL_EVALUATION_SCHEMA_VERSION,
  aggregateCourseModelEvaluations,
  evaluateCourseModelProjection,
} from "../../lib/course-import/model-evaluation.ts";
import { mergeCourseExtractions } from "../../lib/course-import/merge.ts";
import {
  canonicaliseCourseModelExtraction,
  courseModelCanonicalisationReviewItem,
} from "../../lib/course-import/model-canonical.ts";
import {
  assertAllowedOpenRouterModel,
  buildOpenRouterCourseRequestBody,
  extractCourseWithOpenRouter,
  restoreOpenRouterCourseExtraction,
} from "../../lib/course-import/openrouter.ts";
import {
  COURSE_IMPORT_PARSER_VERSION,
  COURSE_IMPORT_PROMPT_VERSION,
  COURSE_SNAPSHOT_SCHEMA_VERSION,
  buildCourseExtractionSystemPrompt,
} from "../../lib/course-import/prompt.ts";
import { buildCourseSnapshotProjection } from "../../lib/course-import/project-snapshot.ts";
import { parseCourseSnapshotProjection } from "../../lib/course-import/snapshot-projection-contract.ts";
import { createHostedImportDatabaseClient } from "./lib/local-database.mjs";

export const COURSE_MODEL_BENCHMARK_REPORT_VERSION =
  "course-model-benchmark-report.v1";
export const COURSE_MODEL_BENCHMARK_SUITE_VERSION =
  "course-model-benchmark-suite.v1";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MIN_CASES = 3;
const MAX_TARGETS = 10;
const MAX_MODELS = 3;
const MAX_PAID_CALLS = 30;
const MAX_BUDGET_USD = 3;
const COST_EPSILON = 1e-9;
const REQUIRED_ARTIFACT_KINDS = [
  "model_input",
  "deterministic_output",
  "model_request",
  "model_response",
];

const usage = `Usage:
  npm run course-import:benchmark -- \\
    --suite <independently-reviewed-suite.json> \\
    --model <allowlisted-model> --model <allowlisted-model> \\
    [--output <report.json>]

Dry-run is the default. The suite must contain ${MIN_CASES}-${MAX_TARGETS} explicit target
UUIDs and manually reviewed gold projections created without candidate model output.
The command validates all hosted artefacts and stored incumbent requests before it
reports which candidate comparisons would be paid.

Paid execution additionally requires:
  --execute --max-paid-calls <1-${MAX_PAID_CALLS}> --max-cost-usd <0-${MAX_BUDGET_USD}>

The benchmark is read-only in Postgres, never fetches ANU pages, never writes
Supabase Storage and never creates course snapshots or review items. Provider
cost is only known after each response, so --max-cost-usd stops subsequent
calls but can be exceeded by the final in-flight request. Keep the dedicated
OpenRouter key's account limit as the hard external cap.`;

function valuesAfter(args, index, label) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${label} requires a value.`);
  }
  return value;
}

function positiveInteger(value, label, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > maximum) {
    throw new TypeError(`${label} must be an integer from 1 to ${maximum}.`);
  }
  return number;
}

function positiveBudget(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > MAX_BUDGET_USD) {
    throw new TypeError(
      `--max-cost-usd must be greater than 0 and no more than ${MAX_BUDGET_USD}.`,
    );
  }
  return number;
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function defaultOutputPath(now = new Date()) {
  const timestamp = now.toISOString().replaceAll(":", "-");
  return resolve(tmpdir(), `coursemap-model-benchmark-${timestamp}.json`);
}

export function validateBenchmarkRuntimeOptions(value, env = process.env) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Benchmark options must be an object.");
  }
  const options = value;
  const allowedKeys = new Set([
    "help",
    "execute",
    "suitePath",
    "models",
    "maxPaidCalls",
    "maxCostUsd",
    "outputPath",
  ]);
  const unknownKey = Object.keys(options).find((key) => !allowedKeys.has(key));
  if (unknownKey) {
    throw new TypeError(`Unknown benchmark runtime option: ${unknownKey}`);
  }
  if (options.help === true) return { help: true };
  if (options.help !== false || typeof options.execute !== "boolean") {
    throw new TypeError("Benchmark help and execute options are invalid.");
  }
  if (typeof options.suitePath !== "string" || !options.suitePath.trim()) {
    throw new TypeError("Choose an independently reviewed benchmark suite.");
  }
  if (!Array.isArray(options.models)) {
    throw new TypeError("Benchmark models must be an array.");
  }
  const models = options.models.map((model) => {
    if (typeof model !== "string") {
      throw new TypeError("Every benchmark model must be a string.");
    }
    return assertAllowedOpenRouterModel(model, env);
  });
  if (models.length < 2 || models.length > MAX_MODELS) {
    throw new TypeError(
      `Choose between 2 and ${MAX_MODELS} configured OpenRouter models.`,
    );
  }
  if (unique(models).length !== models.length) {
    throw new TypeError("Choose each model only once.");
  }
  if (typeof options.outputPath !== "string" || !options.outputPath.trim()) {
    throw new TypeError("Choose a local benchmark report path.");
  }
  const suitePath = resolve(options.suitePath);
  const outputPath = resolve(options.outputPath);
  if (suitePath === outputPath) {
    throw new TypeError("The report path must not overwrite the gold suite.");
  }

  let maxPaidCalls = options.maxPaidCalls;
  let maxCostUsd = options.maxCostUsd;
  if (options.execute) {
    if (maxPaidCalls === null || maxCostUsd === null) {
      throw new TypeError(
        "Paid execution requires --max-paid-calls and --max-cost-usd.",
      );
    }
    maxPaidCalls = positiveInteger(
      maxPaidCalls,
      "--max-paid-calls",
      MAX_PAID_CALLS,
    );
    maxCostUsd = positiveBudget(maxCostUsd);
    if (!env.OPENROUTER_API_KEY?.trim()) {
      throw new Error(
        "Paid execution requires a dedicated OPENROUTER_API_KEY.",
      );
    }
  } else if (maxPaidCalls !== null || maxCostUsd !== null) {
    throw new TypeError(
      "Paid limits are only valid together with explicit --execute.",
    );
  }

  return {
    help: false,
    execute: options.execute,
    suitePath,
    models,
    maxPaidCalls,
    maxCostUsd,
    outputPath,
  };
}

export function parseBenchmarkArgs(args, env = process.env, now = new Date()) {
  if (args.some((value) => value === "--help" || value === "-h")) {
    if (args.length !== 1) {
      throw new TypeError("Use --help without other benchmark options.");
    }
    return { help: true };
  }

  const models = [];
  let suitePath = null;
  let outputPath = null;
  let execute = false;
  let maxPaidCalls = null;
  let maxCostUsd = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--execute") {
      if (execute) throw new TypeError("Use --execute only once.");
      execute = true;
    } else if (argument === "--suite") {
      if (suitePath !== null) throw new TypeError("Use --suite only once.");
      suitePath = valuesAfter(args, index, argument);
      index += 1;
    } else if (argument === "--model" || argument === "--models") {
      const value = valuesAfter(args, index, argument);
      models.push(...splitList(value));
      index += 1;
    } else if (argument === "--output") {
      if (outputPath !== null) throw new TypeError("Use --output only once.");
      outputPath = valuesAfter(args, index, argument);
      index += 1;
    } else if (argument === "--max-paid-calls") {
      if (maxPaidCalls !== null) {
        throw new TypeError("Use --max-paid-calls only once.");
      }
      maxPaidCalls = positiveInteger(
        valuesAfter(args, index, argument),
        argument,
        MAX_PAID_CALLS,
      );
      index += 1;
    } else if (argument === "--max-cost-usd") {
      if (maxCostUsd !== null) {
        throw new TypeError("Use --max-cost-usd only once.");
      }
      maxCostUsd = positiveBudget(valuesAfter(args, index, argument));
      index += 1;
    } else {
      throw new TypeError(`Unknown benchmark option: ${argument}`);
    }
  }

  return validateBenchmarkRuntimeOptions(
    {
      help: false,
      execute,
      suitePath,
      models,
      maxPaidCalls,
      maxCostUsd,
      outputPath: outputPath ?? defaultOutputPath(now),
    },
    env,
  );
}

function exactObjectKeys(value, expected, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (stableStringify(actual) !== stableStringify(wanted)) {
    throw new TypeError(`${label} has missing or unsupported fields.`);
  }
}

function nonBlankString(value, label, minimumLength = 1) {
  if (typeof value !== "string" || value.trim().length < minimumLength) {
    throw new TypeError(`${label} must be a meaningful non-blank string.`);
  }
  return value.trim();
}

export function parseBenchmarkSuite(value) {
  exactObjectKeys(
    value,
    [
      "schemaVersion",
      "reviewedBy",
      "reviewedAt",
      "reviewMethod",
      "candidateOutputsExcluded",
      "reviewNote",
      "cases",
    ],
    "Benchmark suite",
  );
  if (value.schemaVersion !== COURSE_MODEL_BENCHMARK_SUITE_VERSION) {
    throw new TypeError("Benchmark suite schema version is unsupported.");
  }
  if (value.reviewMethod !== "manual_source_review") {
    throw new TypeError(
      "Benchmark gold labels must use independent manual source review.",
    );
  }
  if (value.candidateOutputsExcluded !== true) {
    throw new TypeError(
      "The reviewer must confirm candidate outputs were excluded from gold labels.",
    );
  }
  const reviewedBy = nonBlankString(value.reviewedBy, "reviewedBy", 2);
  const reviewedAt = nonBlankString(value.reviewedAt, "reviewedAt");
  if (
    Number.isNaN(Date.parse(reviewedAt)) ||
    new Date(reviewedAt).toISOString() !== reviewedAt
  ) {
    throw new TypeError("reviewedAt must be a canonical ISO timestamp.");
  }
  const reviewNote = nonBlankString(value.reviewNote, "reviewNote", 12);
  if (
    !Array.isArray(value.cases) ||
    value.cases.length < MIN_CASES ||
    value.cases.length > MAX_TARGETS
  ) {
    throw new TypeError(
      `Benchmark suites require ${MIN_CASES}-${MAX_TARGETS} reviewed cases.`,
    );
  }
  const seenTargets = new Set();
  const seenCourseYears = new Set();
  const cases = value.cases.map((item, index) => {
    exactObjectKeys(
      item,
      ["targetId", "reviewNote", "goldProjection"],
      `Benchmark case ${index + 1}`,
    );
    const targetId = nonBlankString(
      item.targetId,
      `Benchmark case ${index + 1} targetId`,
    ).toLowerCase();
    if (!UUID_PATTERN.test(targetId)) {
      throw new TypeError(`Benchmark case ${index + 1} targetId is invalid.`);
    }
    if (seenTargets.has(targetId)) {
      throw new TypeError("Choose each benchmark target only once.");
    }
    seenTargets.add(targetId);
    const goldProjection = parseCourseSnapshotProjection(item.goldProjection);
    const courseYear = `${goldProjection.courseCode}:${goldProjection.academicYear}`;
    if (seenCourseYears.has(courseYear)) {
      throw new TypeError("Choose each benchmark course and year only once.");
    }
    seenCourseYears.add(courseYear);
    return {
      targetId,
      reviewNote: nonBlankString(
        item.reviewNote,
        `Benchmark case ${index + 1} reviewNote`,
        8,
      ),
      goldProjection,
      goldProjectionSha256: stableFingerprint(goldProjection),
    };
  });
  return {
    schemaVersion: COURSE_MODEL_BENCHMARK_SUITE_VERSION,
    reviewedBy,
    reviewedAt,
    reviewMethod: "manual_source_review",
    candidateOutputsExcluded: true,
    reviewNote,
    cases,
    suiteSha256: stableFingerprint(value),
  };
}

async function readBenchmarkSuite(path) {
  let value;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TypeError("Benchmark suite is not valid JSON.");
    }
    throw error;
  }
  return parseBenchmarkSuite(value);
}

function configuredDatabaseUrl(env = process.env) {
  const value = env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "Configure COURSEMAP_IMPORT_DATABASE_URL to read hosted benchmark artefacts.",
    );
  }
  return value;
}

function safeErrorMessage(error) {
  const message =
    error instanceof Error ? error.message : "Model benchmark failed.";
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/giu, "[database URL redacted]")
    .replace(/Bearer\s+[^\s]+/giu, "Bearer [redacted]")
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/gu, "[OpenRouter key redacted]")
    .slice(0, 1_500);
}

function artifactLocator(row) {
  return {
    bucket: row.storage_bucket,
    path: row.storage_path,
    mediaType: row.media_type,
    byteSize: Number(row.byte_size),
    contentSha256: row.content_sha256,
  };
}

function selectAttemptArtifacts(target, rows) {
  const attempts = new Map();
  rows.forEach((row) => {
    const attempt = Number(row.attempt_number);
    const artifacts = attempts.get(attempt) ?? new Map();
    artifacts.set(row.artifact_kind, row);
    attempts.set(attempt, artifacts);
  });
  const selected = [...attempts.entries()]
    .sort(([left], [right]) => right - left)
    .find(([, artifacts]) =>
      REQUIRED_ARTIFACT_KINDS.every((kind) => artifacts.has(kind)),
    );
  if (!selected) {
    throw new Error(
      `${target.course_code} has no single attempt containing all benchmark artefacts.`,
    );
  }
  return { attemptNumber: selected[0], artifacts: selected[1] };
}

async function loadBenchmarkMetadata(sql, targetIds) {
  return sql.begin(async (tx) => {
    await tx`set transaction read only`;
    const activeRuns = await tx`
      select id
      from public.course_import_runs
      where status in ('queued', 'running')
      limit 1
    `;
    if (activeRuns.length > 0) {
      throw new Error(
        "Wait for the active course import to finish before benchmarking models.",
      );
    }

    const targets = await tx`
      select
        targets.id as target_id,
        targets.course_code,
        targets.processing_status,
        targets.attempt_count,
        runs.requested_model,
        runs.parser_version,
        runs.prompt_version,
        runs.schema_version,
        years.year as academic_year
      from public.course_import_targets as targets
      join public.course_import_runs as runs on runs.id = targets.run_id
      join public.academic_years as years
        on years.id = targets.academic_year_id
      where targets.id = any(${tx.array(targetIds)}::uuid[])
    `;
    if (targets.length !== targetIds.length) {
      throw new Error("Every benchmark suite target must exist.");
    }

    const artifacts = await tx`
      select
        id,
        target_id,
        artifact_kind,
        attempt_number,
        storage_bucket,
        storage_path,
        media_type,
        byte_size,
        content_sha256
      from public.course_import_artifacts
      where target_id = any(${tx.array(targetIds)}::uuid[])
        and artifact_kind = any(${tx.array(REQUIRED_ARTIFACT_KINDS)}::text[])
      order by target_id, attempt_number desc
    `;
    return { targets, artifacts };
  });
}

function assertEligibleTarget(target) {
  if (!["ready_for_review", "unchanged"].includes(target.processing_status)) {
    throw new Error(
      `${target.course_code} does not have a completed extraction to replay.`,
    );
  }
  if (
    target.parser_version !== COURSE_IMPORT_PARSER_VERSION ||
    target.prompt_version !== COURSE_IMPORT_PROMPT_VERSION ||
    target.schema_version !== COURSE_SNAPSHOT_SCHEMA_VERSION
  ) {
    throw new Error(
      `${target.course_code} was imported with an older parser, prompt or schema version.`,
    );
  }
}

function parseJsonArtifact(body, label) {
  try {
    return JSON.parse(body);
  } catch {
    throw new TypeError(`${label} is not valid JSON.`);
  }
}

export function assertStoredModelRequestParity({
  storedRequest,
  model,
  modelInput,
  env = process.env,
}) {
  const expectedRequest = buildOpenRouterCourseRequestBody({
    model,
    systemPrompt: buildCourseExtractionSystemPrompt(),
    modelInput,
    schema: COURSE_EXTRACTION_JSON_SCHEMA,
    env,
  });
  if (stableStringify(storedRequest) !== stableStringify(expectedRequest)) {
    throw new TypeError(
      "Stored model request does not match the current prompt, schema and provider options.",
    );
  }
  return expectedRequest;
}

async function loadBenchmarkCases(metadata, suite, selectedModels, env) {
  const artefactsByTarget = new Map();
  metadata.artifacts.forEach((artifact) => {
    const rows = artefactsByTarget.get(artifact.target_id) ?? [];
    rows.push(artifact);
    artefactsByTarget.set(artifact.target_id, rows);
  });
  const targetsById = new Map(
    metadata.targets.map((target) => [target.target_id, target]),
  );

  const cases = [];
  for (const suiteCase of suite.cases) {
    const target = targetsById.get(suiteCase.targetId);
    if (!target) throw new Error("A benchmark suite target was not returned.");
    assertEligibleTarget(target);
    if (
      suiteCase.goldProjection.courseCode !== target.course_code ||
      suiteCase.goldProjection.academicYear !== Number(target.academic_year)
    ) {
      throw new TypeError(
        `${target.course_code}'s independent gold label has different identity data.`,
      );
    }
    const selected = selectAttemptArtifacts(
      target,
      artefactsByTarget.get(target.target_id) ?? [],
    );
    const contents = {};
    for (const kind of REQUIRED_ARTIFACT_KINDS) {
      const artifact = selected.artifacts.get(kind);
      if (!SHA256_PATTERN.test(artifact.content_sha256 ?? "")) {
        throw new TypeError(`${target.course_code}'s ${kind} hash is invalid.`);
      }
      contents[kind] = await readCourseImportArtifact({
        artifact: artifactLocator(artifact),
      });
    }

    const deterministic = parseCourseExtraction(
      parseJsonArtifact(
        contents.deterministic_output,
        `${target.course_code} deterministic output`,
      ),
      {
        expectedCode: target.course_code,
        expectedYear: Number(target.academic_year),
        evidenceMethod: "deterministic",
      },
    );
    const modelInput = contents.model_input;
    if (typeof modelInput !== "string" || modelInput.trim() === "") {
      throw new TypeError(`${target.course_code}'s model input is empty.`);
    }
    const storedRequest = parseJsonArtifact(
      contents.model_request,
      `${target.course_code} model request`,
    );
    assertStoredModelRequestParity({
      storedRequest,
      model: target.requested_model,
      modelInput,
      env,
    });
    if (!selectedModels.includes(target.requested_model)) {
      throw new Error(
        `Include the incumbent model ${target.requested_model} in the benchmark.`,
      );
    }
    const storedModelResult = restoreOpenRouterCourseExtraction(
      parseJsonArtifact(
        contents.model_response,
        `${target.course_code} model response`,
      ),
      target.requested_model,
    );

    cases.push({
      targetId: target.target_id,
      courseCode: target.course_code,
      academicYear: Number(target.academic_year),
      attemptNumber: selected.attemptNumber,
      requestedModel: target.requested_model,
      artefactHashes: Object.fromEntries(
        REQUIRED_ARTIFACT_KINDS.map((kind) => [
          kind,
          selected.artifacts.get(kind).content_sha256,
        ]),
      ),
      reviewNote: suiteCase.reviewNote,
      goldProjectionSha256: suiteCase.goldProjectionSha256,
      deterministic,
      deterministicProjection: buildCourseSnapshotProjection(deterministic),
      reference: suiteCase.goldProjection,
      modelInput,
      storedModelResult,
    });
  }
  return cases;
}

function withoutProjectionHash(projection) {
  const data = { ...projection };
  Reflect.deleteProperty(data, "projectionSha256");
  return parseCourseSnapshotProjection(data);
}

function groupChildCount(projection, groupKey) {
  return (
    projection.ruleConditions.filter(({ groupKey: key }) => key === groupKey)
      .length +
    projection.ruleGroups.filter(
      ({ parentGroupKey }) => parentGroupKey === groupKey,
    ).length
  );
}

export function assertRepresentativeBenchmarkCoverage(cases) {
  if (!Array.isArray(cases) || cases.length < MIN_CASES) {
    throw new TypeError(
      `Benchmark coverage requires at least ${MIN_CASES} reviewed cases.`,
    );
  }
  const contributionEvaluations = cases.map((course) =>
    evaluateCourseModelProjection({
      deterministic: withoutProjectionHash(course.deterministicProjection),
      candidate: course.reference,
      reference: course.reference,
    }),
  );
  const positiveModelContributionCaseCount = contributionEvaluations.filter(
    ({ contribution }) => contribution.requiredPathCount > 0,
  ).length;
  const totalRequiredPathCount = contributionEvaluations.reduce(
    (sum, { contribution }) => sum + contribution.requiredPathCount,
    0,
  );
  const prerequisiteOrCorequisiteRuleCount = cases.reduce(
    (sum, { reference }) =>
      sum +
      reference.rules.filter(({ ruleKind }) =>
        ["prerequisite", "corequisite"].includes(ruleKind),
      ).length,
    0,
  );
  const incompatibilityRuleCount = cases.reduce(
    (sum, { reference }) =>
      sum +
      reference.rules.filter(({ ruleKind }) => ruleKind === "incompatibility")
        .length,
    0,
  );
  const branchingRequisiteGroupCount = cases.reduce(
    (sum, { reference }) =>
      sum +
      reference.ruleGroups.filter(
        ({ key }) => groupChildCount(reference, key) >= 2,
      ).length,
    0,
  );
  const coverage = {
    positiveModelContributionCaseCount,
    totalRequiredPathCount,
    prerequisiteOrCorequisiteRuleCount,
    incompatibilityRuleCount,
    branchingRequisiteGroupCount,
  };
  if (
    positiveModelContributionCaseCount < 2 ||
    totalRequiredPathCount < 3 ||
    prerequisiteOrCorequisiteRuleCount < 1 ||
    incompatibilityRuleCount < 1 ||
    branchingRequisiteGroupCount < 1
  ) {
    throw new TypeError(
      "Benchmark suite lacks representative positive AI and requisite coverage.",
    );
  }
  return coverage;
}

function evaluateResult(course, model, result, source) {
  const providerValidation = validateCourseExtraction(result.parsed, {
    expectedCode: course.courseCode,
    expectedYear: course.academicYear,
    evidenceMethod: "model",
  });
  const canonical = canonicaliseCourseModelExtraction(result.parsed, {
    expectedCode: course.courseCode,
    expectedYear: course.academicYear,
  });
  const schemaValidation = validateCourseExtraction(canonical.value, {
    expectedCode: course.courseCode,
    expectedYear: course.academicYear,
    evidenceMethod: "model",
  });
  const merged = mergeCourseExtractions({
    deterministic: course.deterministic,
    model: canonical.value,
    modelInput: course.modelInput,
  });
  const canonicalisationReviewItem = courseModelCanonicalisationReviewItem(
    canonical.changes,
  );
  if (canonicalisationReviewItem) {
    merged.extraction.reviewItems.push(canonicalisationReviewItem);
  }
  const errorCount = schemaValidation.success
    ? merged.extraction.reviewItems.filter(
        ({ severity }) => severity === "error",
      ).length
    : schemaValidation.issues.length;
  const candidateProjection = buildCourseSnapshotProjection(merged.extraction);
  const evaluation = evaluateCourseModelProjection({
    deterministic: withoutProjectionHash(course.deterministicProjection),
    candidate: withoutProjectionHash(candidateProjection),
    reference: course.reference,
  });

  return {
    targetId: course.targetId,
    courseCode: course.courseCode,
    academicYear: course.academicYear,
    model,
    source,
    status: "completed",
    providerSchemaValid: providerValidation.success,
    schemaValid: schemaValidation.success,
    domainValid: schemaValidation.success && errorCount === 0,
    validationIssueCount: schemaValidation.success
      ? 0
      : schemaValidation.issues.length,
    reviewErrorCount: errorCount,
    canonicalisationChanges: canonical.changes,
    acceptedFieldCount: merged.modelAcceptedFields.length,
    rejectedFieldCount: merged.modelRejectedFields.length,
    conflictCount: merged.conflicts.length,
    evidenceIssueCount: merged.evidenceIssues.length,
    usage: result.usage,
    latencyMilliseconds: result.latencyMilliseconds,
    resolvedModel: result.resolvedModel,
    finishReason: result.finishReason,
    responseError: result.responseError,
    responseForAudit: result.responseForAudit,
    evaluation,
  };
}

function percentile95(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

export function summariseCourseModelResults(model, results, expectedCaseCount) {
  const completed = results.filter(({ status }) => status === "completed");
  const evaluations = completed.map(({ evaluation }) => evaluation);
  const quality = aggregateCourseModelEvaluations(evaluations);
  const costs = completed
    .map(({ usage }) => usage.costUsd)
    .filter(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    );
  const totalObservedCostUsd = costs.reduce((sum, value) => sum + value, 0);
  const p95LatencyMilliseconds = percentile95(
    completed.map(({ latencyMilliseconds }) => latencyMilliseconds),
  );
  const allCasesCompleted = completed.length === expectedCaseCount;
  const providerSchemaPassCount = completed.filter(
    ({ providerSchemaValid }) => providerSchemaValid,
  ).length;
  const canonicalisationChangeCount = completed.reduce(
    (sum, { canonicalisationChanges }) => sum + canonicalisationChanges.length,
    0,
  );
  const rejectedFieldCount = completed.reduce(
    (sum, result) => sum + result.rejectedFieldCount,
    0,
  );
  const conflictCount = completed.reduce(
    (sum, result) => sum + result.conflictCount,
    0,
  );
  const evidenceIssueCount = completed.reduce(
    (sum, result) => sum + result.evidenceIssueCount,
    0,
  );
  const reviewErrorCount = completed.reduce(
    (sum, result) => sum + result.reviewErrorCount,
    0,
  );
  const strictValidity = completed.every(
    ({ providerSchemaValid, schemaValid, domainValid }) =>
      providerSchemaValid && schemaValid && domainValid,
  );
  const minimumCaseRuleF1 =
    completed.length === 0
      ? 0
      : Math.min(
          ...completed.map(
            ({ evaluation }) => evaluation.rules.prerequisiteAndCorequisite.f1,
          ),
        );
  const passesAbsoluteQualityGate =
    allCasesCompleted &&
    strictValidity &&
    costs.length === completed.length &&
    providerSchemaPassCount === completed.length &&
    canonicalisationChangeCount === 0 &&
    rejectedFieldCount === 0 &&
    conflictCount === 0 &&
    evidenceIssueCount === 0 &&
    reviewErrorCount === 0 &&
    quality.criticalMismatchCount === 0 &&
    quality.meanWeightedFieldScore >= 0.97 &&
    quality.meanContributionPrecision >= 0.98 &&
    quality.meanContributionRecall >= 0.95 &&
    quality.requisiteRuleMicroF1 >= 0.98 &&
    quality.incompatibilityRuleMicroF1 >= 0.98 &&
    minimumCaseRuleF1 >= 0.9 &&
    p95LatencyMilliseconds !== null &&
    p95LatencyMilliseconds < 35_000;

  return {
    model,
    expectedCaseCount,
    completedCaseCount: completed.length,
    plannedPaidCallCount: results.filter(
      ({ status }) => status === "planned_paid_call",
    ).length,
    failedCaseCount: results.filter(({ status }) => status === "failed").length,
    providerSchemaPassCount,
    schemaPassCount: completed.filter(({ schemaValid }) => schemaValid).length,
    domainPassCount: completed.filter(({ domainValid }) => domainValid).length,
    canonicalisationChangeCount,
    rejectedFieldCount,
    conflictCount,
    evidenceIssueCount,
    reviewErrorCount,
    totalObservedCostUsd,
    observedCostCount: costs.length,
    meanObservedCostUsd:
      costs.length === 0 ? null : totalObservedCostUsd / costs.length,
    p95LatencyMilliseconds,
    minimumCaseRuleF1,
    quality,
    passesAbsoluteQualityGate,
  };
}

export function recommendCourseModel(modelSummaries, incumbentModel) {
  const incumbent = modelSummaries.find(
    ({ model }) => model === incumbentModel,
  );
  if (!incumbent) {
    throw new TypeError(
      "The benchmark summary is missing its incumbent model.",
    );
  }
  if (
    modelSummaries.some(
      ({ completedCaseCount, expectedCaseCount, meanObservedCostUsd }) =>
        completedCaseCount !== expectedCaseCount ||
        meanObservedCostUsd === null,
    )
  ) {
    return {
      status: "incomplete",
      incumbentModel,
      recommendedModel: null,
      reason: "Every model must complete every paired case before selection.",
    };
  }

  const eligible = modelSummaries
    .filter(({ passesAbsoluteQualityGate }) => passesAbsoluteQualityGate)
    .filter(
      ({ quality }) =>
        quality.meanWeightedFieldScore >=
          incumbent.quality.meanWeightedFieldScore - 0.01 &&
        quality.meanContributionPrecision >=
          incumbent.quality.meanContributionPrecision - 0.02 &&
        quality.meanContributionRecall >=
          incumbent.quality.meanContributionRecall - 0.02 &&
        quality.requisiteRuleMicroF1 >=
          incumbent.quality.requisiteRuleMicroF1 - 0.01 &&
        quality.incompatibilityRuleMicroF1 >=
          incumbent.quality.incompatibilityRuleMicroF1 - 0.01,
    )
    .sort((left, right) => {
      const costDifference =
        left.meanObservedCostUsd - right.meanObservedCostUsd;
      if (Math.abs(costDifference) > COST_EPSILON) return costDifference;
      if (left.model === incumbentModel) return -1;
      if (right.model === incumbentModel) return 1;
      return left.model.localeCompare(right.model);
    });
  const cheapest = eligible[0];
  if (!cheapest) {
    return {
      status: "no_passing_model",
      incumbentModel,
      recommendedModel: null,
      reason: "No model met the absolute and paired non-inferiority gates.",
    };
  }
  if (
    cheapest.model === incumbentModel ||
    (incumbent.passesAbsoluteQualityGate &&
      incumbent.meanObservedCostUsd <= COST_EPSILON)
  ) {
    return {
      status: "keep_incumbent",
      incumbentModel,
      recommendedModel: incumbentModel,
      reason:
        incumbent.meanObservedCostUsd <= COST_EPSILON
          ? "The incumbent had zero observed mean cost, so no positive saving was measurable."
          : "The incumbent is the cheapest model that met every quality gate.",
    };
  }
  if (
    incumbent.passesAbsoluteQualityGate &&
    cheapest.meanObservedCostUsd >= incumbent.meanObservedCostUsd - COST_EPSILON
  ) {
    return {
      status: "keep_incumbent",
      incumbentModel,
      recommendedModel: incumbentModel,
      reason: "A cost tie does not justify changing the default model.",
    };
  }
  if (
    incumbent.passesAbsoluteQualityGate &&
    cheapest.meanObservedCostUsd > incumbent.meanObservedCostUsd * 0.8
  ) {
    return {
      status: "keep_incumbent",
      incumbentModel,
      recommendedModel: incumbentModel,
      reason:
        "The cheaper passing model saved less than 20%, so the result does not justify changing the default.",
    };
  }
  return {
    status: "switch",
    incumbentModel,
    recommendedModel: cheapest.model,
    reason: incumbent.passesAbsoluteQualityGate
      ? "This was the cheapest passing model and reduced mean cost by at least 20%."
      : "This was the cheapest model that met every quality gate.",
  };
}

function reportCase(course) {
  return {
    targetId: course.targetId,
    courseCode: course.courseCode,
    academicYear: course.academicYear,
    attemptNumber: course.attemptNumber,
    incumbentModel: course.requestedModel,
    reviewNote: course.reviewNote,
    goldProjectionSha256: course.goldProjectionSha256,
    artefactHashes: course.artefactHashes,
  };
}

export function createBenchmarkReport({
  options,
  suite,
  cases,
  incumbentModel,
  coverage,
  now = new Date(),
}) {
  return {
    schemaVersion: COURSE_MODEL_BENCHMARK_REPORT_VERSION,
    evaluationSchemaVersion: COURSE_MODEL_EVALUATION_SCHEMA_VERSION,
    courseSnapshotSchemaVersion: COURSE_SNAPSHOT_SCHEMA_VERSION,
    promptVersion: COURSE_IMPORT_PROMPT_VERSION,
    parserVersion: COURSE_IMPORT_PARSER_VERSION,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    mode: options.execute ? "paid" : "dry_run",
    incumbentModel,
    goldSuite: {
      schemaVersion: suite.schemaVersion,
      suiteSha256: suite.suiteSha256,
      reviewedBy: suite.reviewedBy,
      reviewedAt: suite.reviewedAt,
      reviewMethod: suite.reviewMethod,
      candidateOutputsExcluded: suite.candidateOutputsExcluded,
      reviewNote: suite.reviewNote,
      coverage,
    },
    safeguards: {
      explicitTargetCount: cases.length,
      databaseTransaction: "read_only",
      anuPagesFetched: 0,
      supabaseWrites: 0,
      automaticPaidRetries: 0,
      fullPreflightCompleted: true,
      storedRequestParityVerified: true,
      recommendationUsesFreshPairedCallsOnly: true,
      authorisedPaidCallLimit: options.maxPaidCalls,
      requestedCostStopUsd: options.maxCostUsd,
      requestedCostStopIsHardCap: false,
    },
    cases: cases.map(reportCase),
    storedIncumbentPreflight: [],
    paidAttempts: [],
    modelResults: [],
    modelSummaries: [],
    recommendation: null,
    paidCallCount: 0,
    actualNewCostUsd: 0,
    stoppedReason: null,
  };
}

function refreshReport(report, models, caseCount, incumbentModel) {
  report.updatedAt = new Date().toISOString();
  report.modelSummaries = models.map((model) =>
    summariseCourseModelResults(
      model,
      report.modelResults.filter((result) => result.model === model),
      caseCount,
    ),
  );
  report.recommendation = recommendCourseModel(
    report.modelSummaries,
    incumbentModel,
  );
}

async function writeFully(file, body) {
  let offset = 0;
  while (offset < body.length) {
    const result = await file.write(body, offset, body.length - offset, offset);
    if (
      typeof result?.bytesWritten !== "number" ||
      !Number.isInteger(result.bytesWritten) ||
      result.bytesWritten <= 0 ||
      result.bytesWritten > body.length - offset
    ) {
      throw new Error("Benchmark checkpoint write made no valid progress.");
    }
    offset += result.bytesWritten;
  }
}

export async function checkpointBenchmarkReport(
  reportPath,
  report,
  {
    openFile = open,
    renameFile = rename,
    unlinkFile = unlink,
    createSuffix = randomUUID,
  } = {},
) {
  const body = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
  const checkpointPath = resolve(reportPath);
  const temporaryPath = join(
    dirname(checkpointPath),
    `.${basename(checkpointPath)}.${createSuffix()}.tmp`,
  );
  let temporaryFile = null;
  try {
    temporaryFile = await openFile(temporaryPath, "wx", 0o600);
    await writeFully(temporaryFile, body);
    await temporaryFile.sync();
    await temporaryFile.close();
    temporaryFile = null;
    await renameFile(temporaryPath, checkpointPath);
  } catch (error) {
    if (temporaryFile !== null) {
      await temporaryFile.close().catch(() => undefined);
    }
    await unlinkFile(temporaryPath).catch(() => undefined);
    throw error;
  }
}

export function buildFreshModelCallPlan(cases, models) {
  return cases.flatMap((course) =>
    models.map((model) => ({
      targetId: course.targetId,
      courseCode: course.courseCode,
      academicYear: course.academicYear,
      model,
    })),
  );
}

export async function runCourseModelBenchmark(rawOptions, env = process.env) {
  const options = validateBenchmarkRuntimeOptions(rawOptions, env);
  if (options.help) {
    throw new TypeError("Help options cannot execute a benchmark.");
  }
  const suite = await readBenchmarkSuite(options.suitePath);
  const targetIds = suite.cases.map(({ targetId }) => targetId);
  const sql = createHostedImportDatabaseClient(configuredDatabaseUrl(env));
  let metadata;
  try {
    metadata = await loadBenchmarkMetadata(sql, targetIds);
  } finally {
    await sql.end({ timeout: 5 });
  }
  const cases = await loadBenchmarkCases(metadata, suite, options.models, env);
  const coverage = assertRepresentativeBenchmarkCoverage(cases);
  const incumbentModels = unique(
    cases.map(({ requestedModel }) => requestedModel),
  );
  if (incumbentModels.length !== 1) {
    throw new Error(
      "Choose suite targets imported with the same incumbent model.",
    );
  }
  const incumbentModel = incumbentModels[0];
  const freshCallPlan = buildFreshModelCallPlan(cases, options.models);
  const plannedPaidCalls = freshCallPlan.length;
  if (
    options.execute &&
    (options.maxPaidCalls === null || plannedPaidCalls > options.maxPaidCalls)
  ) {
    throw new Error(
      `This benchmark needs ${plannedPaidCalls} paid calls, above the authorised limit of ${options.maxPaidCalls}.`,
    );
  }

  // Evaluate every stored incumbent before reserving the report or starting a
  // paid request. A late bad fixture can therefore never waste provider cost.
  const storedResults = cases.map((course) =>
    evaluateResult(course, incumbentModel, course.storedModelResult, "stored"),
  );

  const reportReservation = await open(options.outputPath, "wx", 0o600);
  await reportReservation.close();
  const report = createBenchmarkReport({
    options,
    suite,
    cases,
    incumbentModel,
    coverage,
  });
  report.storedIncumbentPreflight.push(...storedResults);
  if (!options.execute) {
    report.modelResults.push(
      ...freshCallPlan.map((planned) => ({
        ...planned,
        source: "provider",
        status: "planned_paid_call",
      })),
    );
    refreshReport(report, options.models, cases.length, incumbentModel);
    await checkpointBenchmarkReport(options.outputPath, report);
    return report;
  }

  refreshReport(report, options.models, cases.length, incumbentModel);
  await checkpointBenchmarkReport(options.outputPath, report);

  outer: for (const course of cases) {
    for (const model of options.models) {
      if (
        report.actualNewCostUsd >= options.maxCostUsd ||
        report.paidCallCount >= options.maxPaidCalls
      ) {
        report.stoppedReason =
          "The authorised paid-call or provider-cost stop was reached.";
        break outer;
      }

      const attempt = {
        attemptNumber: report.paidAttempts.length + 1,
        targetId: course.targetId,
        courseCode: course.courseCode,
        academicYear: course.academicYear,
        model,
        status: "started",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        observedCostUsd: null,
        error: null,
      };
      report.paidAttempts.push(attempt);
      report.paidCallCount += 1;
      refreshReport(report, options.models, cases.length, incumbentModel);
      await checkpointBenchmarkReport(options.outputPath, report);

      let providerResult = null;
      try {
        providerResult = await extractCourseWithOpenRouter({
          model,
          systemPrompt: buildCourseExtractionSystemPrompt(),
          modelInput: course.modelInput,
          schema: COURSE_EXTRACTION_JSON_SCHEMA,
          env,
        });
        const observedCost = providerResult.usage.costUsd;
        if (
          typeof observedCost === "number" &&
          Number.isFinite(observedCost) &&
          observedCost >= 0
        ) {
          report.actualNewCostUsd += observedCost;
          attempt.observedCostUsd = observedCost;
        }
        report.modelResults.push(
          evaluateResult(course, model, providerResult, "provider"),
        );
        attempt.status = "completed";
        attempt.finishedAt = new Date().toISOString();
        if (attempt.observedCostUsd === null) {
          report.stoppedReason =
            "OpenRouter did not return valid provider cost, so the benchmark stopped before another call.";
        } else if (report.actualNewCostUsd >= options.maxCostUsd) {
          report.stoppedReason =
            "The provider-reported cost stop was reached; no further calls were started.";
        }
      } catch (error) {
        attempt.status = "failed";
        attempt.finishedAt = new Date().toISOString();
        attempt.error = safeErrorMessage(error);
        report.modelResults.push({
          targetId: course.targetId,
          courseCode: course.courseCode,
          academicYear: course.academicYear,
          model,
          source: "provider",
          status: "failed",
          error: safeErrorMessage(error),
          ...(providerResult
            ? {
                usage: providerResult.usage,
                latencyMilliseconds: providerResult.latencyMilliseconds,
                responseForAudit: providerResult.responseForAudit,
              }
            : {}),
        });
        report.stoppedReason =
          "A model evaluation failed; no automatic paid retry or later call was attempted.";
      }
      refreshReport(report, options.models, cases.length, incumbentModel);
      await checkpointBenchmarkReport(options.outputPath, report);
      if (report.stoppedReason) break outer;
    }
  }

  refreshReport(report, options.models, cases.length, incumbentModel);
  await checkpointBenchmarkReport(options.outputPath, report);
  return report;
}

async function main() {
  const options = parseBenchmarkArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const report = await runCourseModelBenchmark(options);
  console.log(`Benchmark report written to ${options.outputPath}`);
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        caseCount: report.cases.length,
        paidCallCount: report.paidCallCount,
        actualNewCostUsd: report.actualNewCostUsd,
        stoppedReason: report.stoppedReason,
        recommendation: report.recommendation,
        models: report.modelSummaries.map((summary) => ({
          model: summary.model,
          completedCaseCount: summary.completedCaseCount,
          meanObservedCostUsd: summary.meanObservedCostUsd,
          passesAbsoluteQualityGate: summary.passesAbsoluteQualityGate,
        })),
      },
      null,
      2,
    ),
  );
  if (report.stoppedReason) process.exitCode = 2;
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (entrypoint === import.meta.url) {
  main().catch((error) => {
    console.error(safeErrorMessage(error));
    process.exitCode = 1;
  });
}
