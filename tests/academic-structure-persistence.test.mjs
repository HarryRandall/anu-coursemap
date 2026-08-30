import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMIC_STRUCTURE_EXTRACTION_SCHEMA_VERSION } from "../lib/structure-import/contract.ts";
import { academicStructureSemanticHash } from "../lib/structure-import/persist-snapshot.ts";
import { academicStructurePersistenceInternals } from "../lib/structure-import/persist-snapshot.ts";
import { projectAcademicStructureSnapshot } from "../lib/structure-import/project-snapshot.ts";

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
      sourceText: "Complete 144 units.",
      sourceLocator: "#program-requirements",
      rule: {
        type: "group",
        key: "requirements:root",
        operator: "all_of",
        minimumCount: null,
        title: "Program Requirements",
        sourceText: "Complete 144 units.",
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
            sourceText: "Complete 144 units.",
            sourceLocator: "#program-requirements",
          },
        ],
      },
      unmodelledText: [],
    },
    evidence: [],
    overallConfidence: 0.95,
    reviewItems: [],
    ...overrides,
  };
}

test("semantic hashes ignore model confidence, evidence and review wording", () => {
  const baseline = projectAcademicStructureSnapshot(extraction());
  const metadataOnly = projectAcademicStructureSnapshot(
    extraction({
      overallConfidence: 0.71,
      evidence: [
        {
          fieldKey: "requirements.rule",
          sourceLocator: "#program-requirements",
          evidenceExcerpt: "Complete 144 units.",
          confidence: 0.71,
          method: "model",
        },
      ],
      reviewItems: [
        {
          fieldKey: "requirements.rule",
          kind: "ambiguous",
          severity: "warning",
          message: "Review the parsed rule.",
        },
      ],
    }),
  );
  assert.notEqual(baseline.projectionSha256, metadataOnly.projectionSha256);
  assert.equal(
    academicStructureSemanticHash(baseline),
    academicStructureSemanticHash(metadataOnly),
  );
});

test("semantic hashes change when a canonical student-facing field changes", () => {
  const baseline = projectAcademicStructureSnapshot(extraction());
  const changed = projectAcademicStructureSnapshot(
    extraction({ title: "Bachelor of Advanced Computing" }),
  );
  assert.notEqual(
    academicStructureSemanticHash(baseline),
    academicStructureSemanticHash(changed),
  );
});

test("semantic hashes include every rich snapshot field", () => {
  const baseline = projectAcademicStructureSnapshot(extraction());
  const changes = {
    shortName: "Advanced Computing",
    introduction: "A changed introduction.",
    durationYears: 4,
    college: "Another college",
    selectionRank: 90,
    atar: 90,
    canCombine: false,
    canCombineVertical: true,
    studyAs: "Part-time",
  };
  for (const [field, value] of Object.entries(changes)) {
    const changed = projectAcademicStructureSnapshot(
      extraction({ [field]: value }),
    );
    assert.notEqual(
      academicStructureSemanticHash(baseline),
      academicStructureSemanticHash(changed),
      `${field} must participate in semantic change detection`,
    );
  }
});

test("semantic hashes ignore model-generated keys and source locators", () => {
  const baseline = projectAcademicStructureSnapshot(extraction());
  const metadataOnly = projectAcademicStructureSnapshot(
    extraction({
      requirements: {
        sourceText: "Complete at least 144 units.",
        sourceLocator: "#requirements",
        rule: {
          type: "group",
          key: "model-group-27",
          operator: "all_of",
          minimumCount: null,
          title: "Program Requirements",
          sourceText: "Complete at least 144 units.",
          sourceLocator: "#requirements",
          children: [
            {
              type: "condition",
              key: "model-condition-81",
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
              sourceText: "Complete at least 144 units.",
              sourceLocator: "#requirements",
            },
          ],
        },
        unmodelledText: [],
      },
    }),
  );
  assert.notEqual(baseline.projectionSha256, metadataOnly.projectionSha256);
  assert.equal(
    academicStructureSemanticHash(baseline),
    academicStructureSemanticHash(metadataOnly),
  );
});

test("rejects a projection whose fingerprint was altered after validation", () => {
  const projection = projectAcademicStructureSnapshot(extraction());
  projection.snapshot.title = "Changed after projection";
  assert.throws(
    () => academicStructureSemanticHash(projection),
    /projection fingerprint is invalid/,
  );
});

test("keeps the run-start baseline when a draft changes during processing", () => {
  const projection = projectAcademicStructureSnapshot(extraction());
  const changeSet = academicStructurePersistenceInternals.makeChangeSet({
    changeKind: "changed",
    semanticHash: academicStructureSemanticHash(projection),
    projection,
    claim: {
      baselineDraftSnapshotId: 10,
      baselinePublishedSnapshotId: 8,
    },
    currentDraftSnapshotId: 11,
    currentPublishedSnapshotId: 8,
    comparedSnapshotId: 11,
    comparedSemanticHash: "a".repeat(64),
    candidateSnapshotId: 12,
    reusedCandidate: false,
  });
  assert.equal(changeSet.capturedDraftSnapshotId, 10);
  assert.equal(changeSet.currentDraftSnapshotId, 11);
  assert.equal(changeSet.baselineChangedDuringImport, true);
});

test("keeps unchanged imports reviewable instead of accepting them automatically", () => {
  const projection = projectAcademicStructureSnapshot(extraction());
  const changeSet = academicStructurePersistenceInternals.makeChangeSet({
    changeKind: "unchanged",
    semanticHash: academicStructureSemanticHash(projection),
    projection,
    claim: {
      baselineDraftSnapshotId: 10,
      baselinePublishedSnapshotId: 8,
    },
    currentDraftSnapshotId: 10,
    currentPublishedSnapshotId: 8,
    comparedSnapshotId: 10,
    comparedSemanticHash: academicStructureSemanticHash(projection),
    candidateSnapshotId: null,
    reusedCandidate: false,
  });
  assert.equal(changeSet.requiresManualReview, true);
  assert.equal(changeSet.changeKind, "unchanged");
});
