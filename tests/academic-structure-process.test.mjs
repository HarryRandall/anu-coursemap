import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMIC_STRUCTURE_EXTRACTION_SCHEMA_VERSION } from "../lib/structure-import/contract.ts";
import {
  OpenRouterConfigurationError,
  OpenRouterRequestError,
} from "../lib/course-import/openrouter.ts";
import { academicStructureImportTargetInternals } from "../lib/structure-import/process-target.ts";
import {
  ACADEMIC_STRUCTURE_IMPORT_PARSER_VERSION,
  ACADEMIC_STRUCTURE_IMPORT_PROMPT_VERSION,
  ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION,
} from "../lib/structure-import/prompt.ts";
import { AcademicStructureSourceError } from "../lib/structure-import/source.ts";

function extraction(overrides = {}) {
  return {
    schemaVersion: ACADEMIC_STRUCTURE_EXTRACTION_SCHEMA_VERSION,
    kind: "programme",
    code: "BCOMP",
    year: 2026,
    title: "Bachelor of Computing",
    acronym: "BCMPT",
    shortName: "Computing",
    introduction: "Study computing at ANU.",
    description: "A computing programme.",
    totalUnits: 144,
    durationYears: 3,
    academicCareer: "Undergraduate",
    college: "ANU College of Systems and Society",
    deliveryMode: "In Person",
    selectionRank: 80,
    atar: 80,
    canCombine: true,
    canCombineVertical: false,
    studyAs: "Full-time or part-time",
    contactText: null,
    summaryFields: [],
    sections: [],
    learningOutcomes: [],
    fees: [],
    relationships: [],
    requirements: {
      sourceText: "Complete 144 units including COMP1100.",
      sourceLocator: "#program-requirements",
      rule: {
        type: "group",
        key: "requirements:root",
        operator: "all_of",
        minimumCount: null,
        title: "Program Requirements",
        sourceText: "Complete 144 units including COMP1100.",
        sourceLocator: "#program-requirements",
        children: [
          {
            type: "condition",
            key: "requirements:source",
            conditionKind: "free_text",
            minimumUnits: null,
            maximumUnits: null,
            minimumCourses: null,
            courseCodes: [],
            structureKind: null,
            structureCodes: [],
            subjectCode: null,
            minimumLevel: null,
            maximumLevel: null,
            tag: null,
            freeText: "Complete 144 units including COMP1100.",
            sourceText: "Complete 144 units including COMP1100.",
            sourceLocator: "#program-requirements",
          },
        ],
      },
      unmodelledText: ["Complete 144 units including COMP1100."],
    },
    evidence: [],
    overallConfidence: null,
    reviewItems: [
      {
        fieldKey: "requirements.rule",
        kind: "unsupported",
        severity: "warning",
        message: "Interpret this requirement.",
      },
    ],
    ...overrides,
  };
}

test("rejects queue claims produced for a different pipeline version", () => {
  const versions = {
    parserVersion: ACADEMIC_STRUCTURE_IMPORT_PARSER_VERSION,
    promptVersion: ACADEMIC_STRUCTURE_IMPORT_PROMPT_VERSION,
    schemaVersion: ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION,
  };
  assert.doesNotThrow(() =>
    academicStructureImportTargetInternals.assertCurrentAcademicStructureImportVersions(
      versions,
    ),
  );
  assert.throws(
    () =>
      academicStructureImportTargetInternals.assertCurrentAcademicStructureImportVersions(
        { ...versions, promptVersion: "old-prompt" },
      ),
    /different pipeline version/,
  );
});

test("redacts credentials from durable academic structure failures", () => {
  const summary = academicStructureImportTargetInternals.safeErrorSummary(
    new Error(
      "postgresql://admin:secret@example.test/postgres Bearer token-value sk-or-v1-secretvalue",
    ),
  );
  assert.doesNotMatch(summary, /admin:secret|token-value|secretvalue/);
  assert.match(summary, /database URL redacted/);
  assert.match(summary, /Bearer \[redacted\]/);
  assert.match(summary, /OpenRouter key redacted/);
});

test("retries transient infrastructure but never repeats a paid model call", () => {
  const retryable =
    academicStructureImportTargetInternals.isRetryableAcademicStructureImportError;
  assert.equal(
    retryable(
      new AcademicStructureSourceError("ANU_BUSY", "Try again.", {
        retryable: true,
      }),
    ),
    true,
  );
  assert.equal(
    retryable(new AcademicStructureSourceError("NO_DATA", "No data.")),
    false,
  );
  assert.equal(
    retryable(new OpenRouterRequestError("Rate limited.", 429)),
    false,
  );
  assert.equal(retryable(new OpenRouterConfigurationError()), false);
  const uncertain =
    new academicStructureImportTargetInternals.AcademicStructureImportPaidOutcomeUncertainError(
      new Error("Connection ended after dispatch."),
    );
  assert.equal(retryable(uncertain), false);
  assert.equal(
    academicStructureImportTargetInternals.errorCode(uncertain),
    "OPENROUTER_OUTCOME_UNCERTAIN",
  );
});

test("keeps deterministic identity while accepting a modelled requirement tree", () => {
  const deterministic = extraction();
  const model = extraction({
    title: "Invented title that must not replace ANU metadata",
    shortName: "Invented short name",
    introduction: "Invented introduction",
    durationYears: 9,
    college: "Invented college",
    selectionRank: 99,
    atar: 99,
    canCombine: false,
    canCombineVertical: true,
    studyAs: "Invented study mode",
    requirements: {
      sourceText: "Complete 144 units including COMP1100.",
      sourceLocator: "#program-requirements",
      rule: {
        type: "group",
        key: "requirements:root",
        operator: "all_of",
        minimumCount: null,
        title: "Program Requirements",
        sourceText: "Complete 144 units including COMP1100.",
        sourceLocator: "#program-requirements",
        children: [
          {
            type: "condition",
            key: "requirements:units",
            conditionKind: "unit_total",
            minimumUnits: 144,
            maximumUnits: null,
            minimumCourses: null,
            courseCodes: [],
            structureKind: null,
            structureCodes: [],
            subjectCode: null,
            minimumLevel: null,
            maximumLevel: null,
            tag: null,
            freeText: null,
            sourceText: "Complete 144 units",
            sourceLocator: "#program-requirements",
          },
          {
            type: "condition",
            key: "requirements:comp1100",
            conditionKind: "course_list",
            minimumUnits: null,
            maximumUnits: null,
            minimumCourses: 1,
            courseCodes: ["COMP1100"],
            structureKind: null,
            structureCodes: [],
            subjectCode: null,
            minimumLevel: null,
            maximumLevel: null,
            tag: null,
            freeText: null,
            sourceText: "COMP1100",
            sourceLocator: "#program-requirements",
          },
        ],
      },
      unmodelledText: [],
    },
    overallConfidence: 0.95,
    reviewItems: [],
  });

  const merged =
    academicStructureImportTargetInternals.mergeAcademicStructureExtractions({
      deterministic,
      model,
    });
  assert.equal(merged.title, "Bachelor of Computing");
  assert.equal(merged.code, "BCOMP");
  assert.equal(merged.shortName, deterministic.shortName);
  assert.equal(merged.introduction, deterministic.introduction);
  assert.equal(merged.durationYears, deterministic.durationYears);
  assert.equal(merged.college, deterministic.college);
  assert.equal(merged.selectionRank, deterministic.selectionRank);
  assert.equal(merged.atar, deterministic.atar);
  assert.equal(merged.canCombine, deterministic.canCombine);
  assert.equal(merged.canCombineVertical, deterministic.canCombineVertical);
  assert.equal(merged.studyAs, deterministic.studyAs);
  assert.equal(
    merged.requirements.rule.children[0].conditionKind,
    "unit_total",
  );
  assert.ok(
    !merged.reviewItems.some(
      ({ fieldKey, kind }) =>
        fieldKey === "requirements.rule" && kind === "unsupported",
    ),
  );
});

test("uses modelled snapshot fields only when deterministic extraction has no value", () => {
  const deterministic = extraction({
    shortName: null,
    introduction: null,
    durationYears: null,
    college: null,
    selectionRank: null,
    atar: null,
    canCombine: null,
    canCombineVertical: null,
    studyAs: null,
  });
  const model = extraction();
  const merged =
    academicStructureImportTargetInternals.mergeAcademicStructureExtractions({
      deterministic,
      model,
    });
  assert.deepEqual(
    {
      shortName: merged.shortName,
      introduction: merged.introduction,
      durationYears: merged.durationYears,
      college: merged.college,
      selectionRank: merged.selectionRank,
      atar: merged.atar,
      canCombine: merged.canCombine,
      canCombineVertical: merged.canCombineVertical,
      studyAs: merged.studyAs,
    },
    {
      shortName: model.shortName,
      introduction: model.introduction,
      durationYears: model.durationYears,
      college: model.college,
      selectionRank: model.selectionRank,
      atar: model.atar,
      canCombine: model.canCombine,
      canCombineVertical: model.canCombineVertical,
      studyAs: model.studyAs,
    },
  );
});

test("keeps modelled fees when deterministic extraction cannot classify them", () => {
  const deterministic = extraction();
  const model = extraction({
    fees: [
      {
        position: 1,
        feeYear: 2026,
        audience: "international",
        feeType: "indicative",
        amount: 53_700,
        currency: "AUD",
        basis: "annual",
        sourceLabel: "Annual indicative fee",
        sourceText: "Annual indicative fee for international students A$53,700",
        sourceLocator: "#indicative-fees__international",
      },
    ],
  });

  const merged =
    academicStructureImportTargetInternals.mergeAcademicStructureExtractions({
      deterministic,
      model,
    });
  assert.equal(merged.fees.length, 1);
  assert.equal(merged.fees[0].amount, 53_700);
});

test("requires every model evidence excerpt to appear in the exact model input", () => {
  const supported = extraction({
    evidence: [
      {
        fieldKey: "requirements.rule",
        sourceLocator: "#program-requirements",
        evidenceExcerpt: "Complete 144 units including COMP1100.",
        confidence: 0.95,
        method: "model",
      },
    ],
  });
  assert.deepEqual(
    academicStructureImportTargetInternals.academicStructureModelEvidenceIssues(
      supported,
      "## Program Requirements\n\nComplete 144 units including [COMP1100](course:COMP1100).",
    ),
    [],
  );

  const unsupported = structuredClone(supported);
  unsupported.evidence[0].evidenceExcerpt = "Invented requirement";
  assert.match(
    academicStructureImportTargetInternals.academicStructureModelEvidenceIssues(
      unsupported,
      "Complete 144 units including COMP1100.",
    )[0],
    /Invented requirement/,
  );
});

test("accepts structured source wording that omits Markdown table presentation", () => {
  const structured = extraction();
  structured.requirements.sourceText =
    "12 units from completion of the following courses: BUSN1001, BUSN1002";
  structured.requirements.rule.sourceText = structured.requirements.sourceText;
  structured.requirements.rule.children[0].sourceText =
    structured.requirements.sourceText;
  structured.requirements.unmodelledText = [];

  const modelInput = `12 units from completion of the following courses:

| Code | Title | Units |
| --- | --- | --- |
| [BUSN1001](course:BUSN1001) | Business Reporting and Analysis | 6 |
| [BUSN1002](course:BUSN1002) | Accounting Processes and Systems | 6 |`;

  assert.deepEqual(
    academicStructureImportTargetInternals.academicStructureModelEvidenceIssues(
      structured,
      modelInput,
    ),
    [],
  );

  structured.requirements.rule.children[0].sourceText =
    "12 units from completion of BUSN1001 and invented course BUSN9999";
  assert.match(
    academicStructureImportTargetInternals.academicStructureModelEvidenceIssues(
      structured,
      modelInput,
    )[0],
    /BUSN9999/,
  );
});

test("clears redundant free text from typed model conditions without changing the stored response", () => {
  const response = extraction();
  const condition = response.requirements.rule.children[0];
  condition.conditionKind = "structure_list";
  condition.structureKind = "specialisation";
  condition.structureCodes = ["COMP-HSPC"];
  condition.freeText = "Complete the Computer Science Honours specialisation";
  condition.minimumUnits = 48;
  condition.maximumUnits = 48;

  const normalised =
    academicStructureImportTargetInternals.normaliseAcademicStructureModelExtraction(
      response,
    );
  assert.equal(normalised.value.requirements.rule.children[0].freeText, null);
  assert.equal(
    response.requirements.rule.children[0].freeText,
    condition.freeText,
  );
  assert.match(normalised.normalisations[0], /freeText was cleared/);
});

test("wraps a valid root condition so relational persistence has one root group", () => {
  const condition = extraction().requirements.rule.children[0];
  const wrapped =
    academicStructureImportTargetInternals.ensureRequirementRootGroup({
      sourceText: condition.sourceText,
      sourceLocator: condition.sourceLocator,
      rule: condition,
      unmodelledText: [],
    });
  assert.equal(wrapped.rule.type, "group");
  assert.equal(wrapped.rule.operator, "all_of");
  assert.deepEqual(wrapped.rule.children, [condition]);
});

test("uses later callback deliveries only for stale-state recovery", async () => {
  const calls = [];
  const recovered =
    await academicStructureImportTargetInternals.recoverOrClaimAcademicStructureImportTarget(
      {
        sql: {},
        runId: "run",
        targetId: "target",
        messageId: "message",
        workerId: "worker",
        recoveryOnlyDelivery: true,
        dependencies: {
          recover: async () => {
            calls.push("recover");
            return true;
          },
          claim: async () => {
            calls.push("claim");
            return {};
          },
        },
      },
    );
  assert.equal(recovered, null);
  assert.deepEqual(calls, ["recover"]);
});
