import assert from "node:assert/strict";
import { mkdtemp, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { COURSE_EXTRACTION_JSON_SCHEMA } from "../lib/course-import/contract.ts";
import {
  aggregateCourseModelEvaluations,
  evaluateCourseModelProjection,
} from "../lib/course-import/model-evaluation.ts";
import { buildOpenRouterCourseRequestBody } from "../lib/course-import/openrouter.ts";
import { buildCourseExtractionSystemPrompt } from "../lib/course-import/prompt.ts";
import {
  COURSE_MODEL_BENCHMARK_REPORT_VERSION,
  COURSE_MODEL_BENCHMARK_SUITE_VERSION,
  assertRepresentativeBenchmarkCoverage,
  assertStoredModelRequestParity,
  buildFreshModelCallPlan,
  checkpointBenchmarkReport,
  createBenchmarkReport,
  parseBenchmarkArgs,
  parseBenchmarkSuite,
  recommendCourseModel,
  summariseCourseModelResults,
  validateBenchmarkRuntimeOptions,
} from "../scripts/catalogue/benchmark-course-models.mjs";

const TARGET_ID = "11111111-1111-4111-8111-111111111111";
const MODEL_ENV = {
  COURSEMAP_OPENROUTER_MODELS:
    "google/gemini-3.1-flash-lite,google/gemini-2.5-flash-lite",
};
const MODEL_ONE = "google/gemini-3.1-flash-lite";
const MODEL_TWO = "google/gemini-2.5-flash-lite";

function baseProjection() {
  return {
    courseCode: "COMP2400",
    academicYear: 2026,
    snapshot: {
      title: "Relational Databases",
      unitValueKind: "fixed",
      units: 6,
      minimumUnits: null,
      maximumUnits: null,
      eftsl: 0.125,
      level: 2000,
      subjectCode: "COMP",
      subjectName: "Computer Science",
      school: "School of Computing",
      college: "ANU College of Systems and Society",
      academicCareer: "UGRD",
      convenerText: null,
      deliverySummary: null,
      introduction: null,
      description: "Study relational database design.",
      workloadText: null,
      workloadHours: null,
      inherentRequirements: null,
      prescribedTexts: null,
      offeringStatus: "offered",
      sourceUpdatedAt: "2026-01-01T00:00:00.000Z",
    },
    unitOptions: [],
    fees: [
      {
        position: 1,
        feeYear: 2026,
        audience: "domestic",
        feeType: "indicative",
        amount: 900,
        currency: "AUD",
        basis: "course",
        studentContributionBand: null,
        sourceLabel: "Indicative fee",
        sourceText: "Indicative fee: AUD 900",
      },
    ],
    areasOfInterest: [],
    attributes: [],
    relatedCourses: [],
    courseOffering: { deliveryMode: null, location: null },
    offeringSessions: [
      {
        position: 1,
        calendarYear: 2026,
        academicPeriodCode: "S1",
        academicPeriodName: "Semester 1",
        classNumber: "1234",
        startsOn: "2026-02-23",
        enrolClosesOn: "2026-03-02",
        censusOn: "2026-03-31",
        endsOn: "2026-05-29",
        deliveryMode: "In person",
        location: "Acton",
        classSummaryUrl: null,
        sourceText: "Semester 1, Acton",
      },
    ],
    learningOutcomes: [],
    assessmentItems: [],
    assessmentOutcomes: [],
    rules: [],
    ruleGroups: [],
    ruleConditions: [],
    ruleConditionCourses: [],
    ruleCourseReferences: [],
  };
}

function addPrerequisite(projection, operator = "all_of") {
  projection.rules = [
    {
      key: "prerequisite",
      ruleKind: "prerequisite",
      hardness: "hard",
      sourceText: "COMP1100 and COMP1110",
    },
  ];
  projection.ruleGroups = [
    {
      key: "prerequisite:group:root",
      ruleKey: "prerequisite",
      parentGroupKey: null,
      operator,
      minimumCount: null,
      position: 0,
    },
  ];
  projection.ruleConditions = ["COMP1100", "COMP1110"].map(
    (courseCode, index) => ({
      key: `prerequisite:condition:${index}`,
      ruleKey: "prerequisite",
      groupKey: "prerequisite:group:root",
      position: index,
      conditionKind: "course",
      requiredCourseCode: courseCode,
      requiredStructureCode: null,
      minimumUnits: null,
      minimumMark: null,
      subjectCode: null,
      minimumCourseLevel: null,
      maximumCourseLevel: null,
      minimumGpa: null,
      minimumYear: null,
      minimumWam: null,
      freeText: null,
      courseRequirementMode: "completed",
      hardness: "hard",
      sourceText: courseCode,
    }),
  );
  projection.ruleCourseReferences = ["COMP1100", "COMP1110"].map(
    (courseCode) => ({
      ruleKey: "prerequisite",
      referencedCourseCode: courseCode,
      sourceText: courseCode,
    }),
  );
  return projection;
}

function addIncompatibility(projection, courseCode) {
  projection.rules.push({
    key: "incompatibility",
    ruleKind: "incompatibility",
    hardness: "hard",
    sourceText: `Incompatible with ${courseCode}`,
  });
  projection.ruleGroups.push({
    key: "incompatibility:group:root",
    ruleKey: "incompatibility",
    parentGroupKey: null,
    operator: "all_of",
    minimumCount: null,
    position: 0,
  });
  projection.ruleConditions.push({
    key: "incompatibility:condition:0",
    ruleKey: "incompatibility",
    groupKey: "incompatibility:group:root",
    position: 0,
    conditionKind: "incompatible",
    requiredCourseCode: courseCode,
    requiredStructureCode: null,
    minimumUnits: null,
    minimumMark: null,
    subjectCode: null,
    minimumCourseLevel: null,
    maximumCourseLevel: null,
    minimumGpa: null,
    minimumYear: null,
    minimumWam: null,
    freeText: null,
    courseRequirementMode: null,
    hardness: "hard",
    sourceText: courseCode,
  });
  projection.ruleCourseReferences.push({
    ruleKey: "incompatibility",
    referencedCourseCode: courseCode,
    sourceText: courseCode,
  });
  return projection;
}

function projectionFor(courseCode, academicYear = 2026) {
  const projection = baseProjection();
  projection.courseCode = courseCode;
  projection.academicYear = academicYear;
  projection.snapshot.subjectCode = courseCode.slice(0, 4);
  projection.snapshot.level = Number(courseCode.slice(4, 8));
  projection.fees[0].feeYear = academicYear;
  projection.offeringSessions[0].calendarYear = academicYear;
  return projection;
}

function reviewedSuite(overrides = {}) {
  return {
    schemaVersion: COURSE_MODEL_BENCHMARK_SUITE_VERSION,
    reviewedBy: "Independent reviewer",
    reviewedAt: "2026-08-30T00:00:00.000Z",
    reviewMethod: "manual_source_review",
    candidateOutputsExcluded: true,
    reviewNote: "Reviewed directly against the source material.",
    cases: [
      {
        targetId: TARGET_ID,
        reviewNote: "Checked requisite logic.",
        goldProjection: projectionFor("COMP2400"),
      },
      {
        targetId: "22222222-2222-4222-8222-222222222222",
        reviewNote: "Checked incompatibilities.",
        goldProjection: projectionFor("COMP3600"),
      },
      {
        targetId: "33333333-3333-4333-8333-333333333333",
        reviewNote: "Checked descriptive fields.",
        goldProjection: projectionFor("STAT1008"),
      },
    ],
    ...overrides,
  };
}

function completedResult(evaluation, overrides = {}) {
  return {
    status: "completed",
    providerSchemaValid: true,
    schemaValid: true,
    domainValid: true,
    canonicalisationChanges: [],
    rejectedFieldCount: 0,
    conflictCount: 0,
    evidenceIssueCount: 0,
    reviewErrorCount: 0,
    usage: { costUsd: 0.01 },
    latencyMilliseconds: 10,
    evaluation,
    ...overrides,
  };
}

test("gives an exact, fully deterministic projection a perfect score", () => {
  const reference = addPrerequisite(baseProjection());
  const evaluation = evaluateCourseModelProjection({
    deterministic: structuredClone(reference),
    candidate: structuredClone(reference),
    reference,
  });

  assert.equal(evaluation.exactProjectionMatch, true);
  assert.equal(evaluation.weightedFieldScore, 1);
  assert.deepEqual(evaluation.criticalMismatches, []);
  assert.equal(evaluation.contribution.f1, 1);
  assert.equal(evaluation.rules.prerequisiteAndCorequisite.f1, 1);
});

test("scores model-only additions separately from deterministic parsing", () => {
  const deterministic = baseProjection();
  const reference = addPrerequisite(baseProjection());
  const evaluation = evaluateCourseModelProjection({
    deterministic,
    candidate: structuredClone(reference),
    reference,
  });

  assert.ok(evaluation.contribution.requiredPathCount > 0);
  assert.equal(evaluation.contribution.precision, 1);
  assert.equal(evaluation.contribution.recall, 1);
  assert.equal(evaluation.contribution.f1, 1);
});

test("treats a wrong logical operator and unexpected course as critical", () => {
  const deterministic = baseProjection();
  const reference = addPrerequisite(baseProjection());
  const candidate = addPrerequisite(baseProjection(), "any_of");
  candidate.ruleConditions[1].requiredCourseCode = "COMP9999";
  candidate.ruleConditions[1].sourceText = "COMP9999";
  candidate.ruleCourseReferences[1].referencedCourseCode = "COMP9999";
  candidate.ruleCourseReferences[1].sourceText = "COMP9999";

  const evaluation = evaluateCourseModelProjection({
    deterministic,
    candidate,
    reference,
  });

  assert.equal(evaluation.exactProjectionMatch, false);
  assert.ok(evaluation.rules.prerequisiteAndCorequisite.f1 < 1);
  assert.ok(evaluation.weightedFieldScore < 1);
  assert.ok(evaluation.criticalMismatches.includes("requisites.semantic"));
  assert.ok(
    evaluation.criticalMismatches.includes(
      "requisites.unexpectedReference.prerequisite:COMP9999",
    ),
  );
});

test("flags wrong fees and dates even when requisite rules are unchanged", () => {
  const reference = baseProjection();
  const candidate = baseProjection();
  candidate.fees[0].amount = 950;
  candidate.offeringSessions[0].censusOn = "2026-04-01";

  const evaluation = evaluateCourseModelProjection({
    deterministic: baseProjection(),
    candidate,
    reference,
  });

  assert.ok(evaluation.criticalMismatches.includes("fees[0].amount"));
  assert.ok(
    evaluation.criticalMismatches.includes("offeringSessions[0].censusOn"),
  );
});

test("scores incompatibility references independently from prerequisites", () => {
  const reference = addIncompatibility(baseProjection(), "COMP6240");
  const candidate = addIncompatibility(baseProjection(), "COMP9999");
  const evaluation = evaluateCourseModelProjection({
    deterministic: baseProjection(),
    candidate,
    reference,
  });

  assert.equal(evaluation.rules.prerequisiteAndCorequisite.f1, 1);
  assert.ok(evaluation.rules.incompatibility.f1 < 1);
  assert.ok(
    evaluation.criticalMismatches.includes(
      "requisites.unexpectedReference.incompatibility:COMP9999",
    ),
  );
});

test("aggregates paired model results for a report", () => {
  const reference = baseProjection();
  const exact = evaluateCourseModelProjection({
    deterministic: reference,
    candidate: reference,
    reference,
  });
  const wrong = evaluateCourseModelProjection({
    deterministic: reference,
    candidate: { ...reference, snapshot: { ...reference.snapshot, units: 12 } },
    reference,
  });
  const aggregate = aggregateCourseModelEvaluations([exact, wrong]);

  assert.equal(aggregate.caseCount, 2);
  assert.equal(aggregate.exactProjectionMatchCount, 1);
  assert.ok(aggregate.meanWeightedFieldScore < 1);
  assert.equal(aggregate.criticalMismatchCount, 1);
});

test("canonicalises commutative requisite order and generated keys", () => {
  const reference = addPrerequisite(baseProjection());
  const candidate = structuredClone(reference);
  candidate.rules[0].sourceText = "Equivalent wording";
  candidate.ruleGroups[0].key = "generated-root-92";
  candidate.ruleGroups[0].position = 92;
  candidate.ruleConditions = candidate.ruleConditions
    .reverse()
    .map((condition, index) => ({
      ...condition,
      key: `generated-condition-${index}`,
      groupKey: "generated-root-92",
      position: 10 - index,
      sourceText: `Equivalent ${condition.requiredCourseCode}`,
    }));
  candidate.ruleCourseReferences.reverse();

  const evaluation = evaluateCourseModelProjection({
    deterministic: baseProjection(),
    candidate,
    reference,
  });

  assert.equal(evaluation.rules.prerequisiteAndCorequisite.f1, 1);
  assert.equal(evaluation.sectionScores.requisites, 1);
  assert.equal(evaluation.exactProjectionMatch, true);
  assert.ok(!evaluation.criticalMismatches.includes("requisites.semantic"));
});

test("canonicalises safely associative all-of and any-of groups", () => {
  for (const operator of ["all_of", "any_of"]) {
    const reference = addPrerequisite(baseProjection(), operator);
    const candidate = structuredClone(reference);
    candidate.ruleGroups.push({
      key: `nested-${operator}`,
      ruleKey: "prerequisite",
      parentGroupKey: "prerequisite:group:root",
      operator,
      minimumCount: null,
      position: 1,
    });
    candidate.ruleConditions[1].groupKey = `nested-${operator}`;

    const evaluation = evaluateCourseModelProjection({
      deterministic: baseProjection(),
      candidate,
      reference,
    });

    assert.equal(evaluation.rules.prerequisiteAndCorequisite.f1, 1);
    assert.equal(evaluation.sectionScores.requisites, 1);
    assert.equal(evaluation.exactProjectionMatch, true);
  }
});

test("keeps model benchmarks dry-run unless paid execution is explicit", () => {
  const options = parseBenchmarkArgs(
    [
      "--suite",
      "/tmp/coursemap-reviewed-suite.json",
      "--models",
      `${MODEL_ONE},${MODEL_TWO}`,
    ],
    MODEL_ENV,
    new Date("2026-08-30T00:00:00.000Z"),
  );

  assert.equal(options.execute, false);
  assert.equal(options.maxPaidCalls, null);
  assert.equal(options.maxCostUsd, null);
  assert.match(options.outputPath, /coursemap-model-benchmark-2026-08-30/);
});

test("plans a fresh paired provider call for every model and case", () => {
  const cases = [
    { targetId: "one", courseCode: "COMP2400", academicYear: 2026 },
    { targetId: "two", courseCode: "COMP3600", academicYear: 2026 },
    { targetId: "three", courseCode: "STAT1008", academicYear: 2026 },
  ];
  const plan = buildFreshModelCallPlan(cases, [MODEL_ONE, MODEL_TWO]);

  assert.equal(plan.length, 6);
  assert.equal(plan.filter(({ model }) => model === MODEL_ONE).length, 3);
  assert.equal(plan.filter(({ model }) => model === MODEL_TWO).length, 3);
});

test("requires bounded call, cost and key authorisation for paid benchmarks", () => {
  const base = [
    "--suite",
    "/tmp/coursemap-reviewed-suite.json",
    "--models",
    `${MODEL_ONE},${MODEL_TWO}`,
    "--execute",
  ];
  assert.throws(
    () => parseBenchmarkArgs(base, MODEL_ENV),
    /requires --max-paid-calls and --max-cost-usd/,
  );
  assert.throws(
    () =>
      parseBenchmarkArgs(
        [...base, "--max-paid-calls", "31", "--max-cost-usd", "1"],
        { ...MODEL_ENV, OPENROUTER_API_KEY: "test-only" },
      ),
    /integer from 1 to 30/,
  );
  assert.throws(
    () =>
      parseBenchmarkArgs(
        [...base, "--max-paid-calls", "6", "--max-cost-usd", "3.01"],
        { ...MODEL_ENV, OPENROUTER_API_KEY: "test-only" },
      ),
    /no more than 3/,
  );
  assert.throws(
    () =>
      parseBenchmarkArgs(
        [...base, "--max-paid-calls", "6", "--max-cost-usd", "1"],
        MODEL_ENV,
      ),
    /dedicated OPENROUTER_API_KEY/,
  );
});

test("validates every exported runtime option and model candidate", () => {
  assert.throws(
    () =>
      validateBenchmarkRuntimeOptions(
        {
          help: false,
          execute: false,
          suitePath: "/tmp/suite.json",
          models: [MODEL_ONE, "openai/unconfigured"],
          maxPaidCalls: null,
          maxCostUsd: null,
          outputPath: "/tmp/report.json",
        },
        MODEL_ENV,
      ),
    /configured OpenRouter model/,
  );
  assert.throws(
    () =>
      validateBenchmarkRuntimeOptions(
        {
          help: false,
          execute: false,
          suitePath: "/tmp/suite.json",
          models: [MODEL_ONE, MODEL_TWO],
          maxPaidCalls: null,
          maxCostUsd: null,
          outputPath: "/tmp/report.json",
          targetIds: [TARGET_ID],
        },
        MODEL_ENV,
      ),
    /Unknown benchmark runtime option: targetIds/,
  );
});

test("requires independent manually reviewed gold labels", () => {
  const suite = parseBenchmarkSuite(reviewedSuite());
  assert.equal(suite.cases.length, 3);
  assert.equal(suite.candidateOutputsExcluded, true);
  assert.match(suite.suiteSha256, /^[0-9a-f]{64}$/u);

  assert.throws(
    () =>
      parseBenchmarkSuite(reviewedSuite({ candidateOutputsExcluded: false })),
    /candidate outputs were excluded/,
  );
  assert.throws(
    () =>
      parseBenchmarkSuite({
        ...reviewedSuite(),
        databaseProjection: baseProjection(),
      }),
    /missing or unsupported fields/,
  );
});

test("requires exact stored model-request parity", () => {
  const modelInput = "Expected course: COMP2400 (2026)";
  const storedRequest = buildOpenRouterCourseRequestBody({
    model: MODEL_ONE,
    systemPrompt: buildCourseExtractionSystemPrompt(),
    modelInput,
    schema: COURSE_EXTRACTION_JSON_SCHEMA,
    env: MODEL_ENV,
  });
  assert.deepEqual(
    assertStoredModelRequestParity({
      storedRequest,
      model: MODEL_ONE,
      modelInput,
      env: MODEL_ENV,
    }),
    storedRequest,
  );
  assert.throws(
    () =>
      assertStoredModelRequestParity({
        storedRequest: { ...storedRequest, max_tokens: 2048 },
        model: MODEL_ONE,
        modelInput,
        env: MODEL_ENV,
      }),
    /does not match the current prompt, schema and provider options/,
  );
});

test("requires positive AI, prerequisite and incompatibility coverage", () => {
  const cases = [
    {
      deterministicProjection: {
        ...projectionFor("COMP2400"),
        projectionSha256: "ignored",
      },
      reference: addPrerequisite(projectionFor("COMP2400")),
    },
    {
      deterministicProjection: {
        ...projectionFor("COMP3600"),
        projectionSha256: "ignored",
      },
      reference: addIncompatibility(projectionFor("COMP3600"), "COMP6240"),
    },
    {
      deterministicProjection: {
        ...projectionFor("STAT1008"),
        projectionSha256: "ignored",
      },
      reference: projectionFor("STAT1008"),
    },
  ];
  const coverage = assertRepresentativeBenchmarkCoverage(cases);
  assert.equal(coverage.positiveModelContributionCaseCount, 2);
  assert.ok(coverage.totalRequiredPathCount >= 3);
  assert.equal(coverage.prerequisiteOrCorequisiteRuleCount, 1);
  assert.equal(coverage.incompatibilityRuleCount, 1);

  assert.throws(
    () =>
      assertRepresentativeBenchmarkCoverage(
        cases.map((course) => ({
          ...course,
          reference: structuredClone(course.deterministicProjection),
        })),
      ),
    /lacks representative positive AI and requisite coverage/,
  );
});

test("quality gates reject provider, canonicalisation and merge noise", () => {
  const reference = baseProjection();
  const evaluation = evaluateCourseModelProjection({
    deterministic: reference,
    candidate: reference,
    reference,
  });
  const clean = completedResult(evaluation);
  assert.equal(
    summariseCourseModelResults(MODEL_ONE, [clean], 1)
      .passesAbsoluteQualityGate,
    true,
  );

  for (const noisy of [
    { providerSchemaValid: false },
    { canonicalisationChanges: [{ path: "fees" }] },
    { rejectedFieldCount: 1 },
    { conflictCount: 1 },
    { evidenceIssueCount: 1 },
    { reviewErrorCount: 1 },
  ]) {
    assert.equal(
      summariseCourseModelResults(
        MODEL_ONE,
        [completedResult(evaluation, noisy)],
        1,
      ).passesAbsoluteQualityGate,
      false,
    );
  }
});

test("keeps the report schema identity separate from snapshot schema", () => {
  const suite = parseBenchmarkSuite(reviewedSuite());
  const cases = suite.cases.map((item) => ({
    targetId: item.targetId,
    courseCode: item.goldProjection.courseCode,
    academicYear: item.goldProjection.academicYear,
    attemptNumber: 1,
    requestedModel: MODEL_ONE,
    reviewNote: item.reviewNote,
    goldProjectionSha256: item.goldProjectionSha256,
    artefactHashes: {},
  }));
  const report = createBenchmarkReport({
    options: { execute: false, maxPaidCalls: null, maxCostUsd: null },
    suite,
    cases,
    incumbentModel: MODEL_ONE,
    coverage: {},
    now: new Date("2026-08-30T00:00:00.000Z"),
  });

  assert.equal(report.schemaVersion, COURSE_MODEL_BENCHMARK_REPORT_VERSION);
  assert.notEqual(report.schemaVersion, report.courseSnapshotSchemaVersion);
  assert.equal(report.safeguards.recommendationUsesFreshPairedCallsOnly, true);
});

test("atomically replaces a complete synced audit checkpoint", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coursemap-benchmark-test-"));
  const path = join(directory, "report.json");
  try {
    await checkpointBenchmarkReport(path, { status: "started", calls: 1 });
    await checkpointBenchmarkReport(path, { status: "complete", calls: 2 });
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
      status: "complete",
      calls: 2,
    });
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("fully writes a checkpoint when the file returns short writes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coursemap-benchmark-test-"));
  const path = join(directory, "report.json");
  let writeCount = 0;
  let synced = false;
  try {
    await checkpointBenchmarkReport(
      path,
      { status: "complete", detail: "x".repeat(100) },
      {
        createSuffix: () => "short-write",
        openFile: async (...arguments_) => {
          const file = await open(...arguments_);
          return {
            close: () => file.close(),
            sync: async () => {
              synced = true;
              await file.sync();
            },
            write: (buffer, offset, length, position) => {
              writeCount += 1;
              return file.write(buffer, offset, Math.min(length, 7), position);
            },
          };
        },
        renameFile: async (...arguments_) => {
          assert.equal(synced, true);
          await rename(...arguments_);
        },
      },
    );
    assert.ok(writeCount > 1);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
      status: "complete",
      detail: "x".repeat(100),
    });
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("keeps the prior checkpoint and cleans up after a failed write", async () => {
  const directory = await mkdtemp(join(tmpdir(), "coursemap-benchmark-test-"));
  const path = join(directory, "report.json");
  try {
    const prior = { status: "complete", calls: 1 };
    await checkpointBenchmarkReport(path, prior);
    let writeCount = 0;
    await assert.rejects(
      checkpointBenchmarkReport(
        path,
        { status: "complete", calls: 2 },
        {
          createSuffix: () => "failed-write",
          openFile: async (...arguments_) => {
            const file = await open(...arguments_);
            return {
              close: () => file.close(),
              sync: () => file.sync(),
              write: async (buffer, offset, length, position) => {
                writeCount += 1;
                if (writeCount > 1) throw new Error("simulated write failure");
                return file.write(
                  buffer,
                  offset,
                  Math.min(length, 5),
                  position,
                );
              },
            };
          },
        },
      ),
      /simulated write failure/,
    );
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), prior);
    assert.deepEqual(await readdir(directory), ["report.json"]);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("does not switch models on zero-cost or equal-cost ties", () => {
  const quality = {
    meanWeightedFieldScore: 1,
    meanContributionPrecision: 1,
    meanContributionRecall: 1,
    requisiteRuleMicroF1: 1,
    incompatibilityRuleMicroF1: 1,
  };
  const summary = (model, cost) => ({
    model,
    completedCaseCount: 3,
    expectedCaseCount: 3,
    meanObservedCostUsd: cost,
    passesAbsoluteQualityGate: true,
    quality,
  });

  assert.equal(
    recommendCourseModel(
      [summary(MODEL_ONE, 0), summary(MODEL_TWO, 0)],
      MODEL_ONE,
    ).recommendedModel,
    MODEL_ONE,
  );
  assert.equal(
    recommendCourseModel(
      [summary(MODEL_TWO, 0.01), summary(MODEL_ONE, 0.01)],
      MODEL_ONE,
    ).recommendedModel,
    MODEL_ONE,
  );
});
