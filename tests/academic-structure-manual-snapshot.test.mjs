import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ACADEMIC_STRUCTURE_EXTRACTION_SCHEMA_VERSION,
  validateAcademicStructureExtraction,
} from "../lib/structure-import/contract.ts";
import {
  normaliseAcademicStructureManualSnapshotProjection,
  parseAcademicStructureManualSnapshotProjection,
} from "../lib/structure-import/manual-snapshot.ts";
import { projectAcademicStructureSnapshot } from "../lib/structure-import/project-snapshot.ts";

function extraction() {
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
    summaryFields: [
      {
        position: 1,
        key: "study_options",
        label: "Study options",
        values: ["Full-time", "Part-time"],
        sourceText: "Study full-time or part-time.",
      },
    ],
    sections: [
      {
        position: 1,
        key: "overview",
        heading: "Overview",
        markdown: "A computing programme.",
        sourceText: "A computing programme.",
        sourceLocator: "#overview",
      },
    ],
    learningOutcomes: [],
    fees: [],
    relationships: [],
    requirements: {
      sourceText: "Complete 144 units.",
      sourceLocator: "#requirements",
      rule: {
        type: "group",
        key: "requirements:root",
        operator: "all_of",
        minimumCount: null,
        title: "Requirements",
        sourceText: "Complete 144 units.",
        sourceLocator: "#requirements",
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
            sourceLocator: "#requirements",
          },
        ],
      },
      unmodelledText: [],
    },
    evidence: [
      {
        fieldKey: "totalUnits",
        sourceLocator: "#requirements",
        evidenceExcerpt: "Complete 144 units.",
        confidence: 0.99,
        method: "deterministic",
      },
    ],
    overallConfidence: 0.95,
    reviewItems: [],
  };
}

function manualProjection() {
  const projected = projectAcademicStructureSnapshot(extraction());
  const manual = { ...projected };
  delete manual.projectionSha256;
  delete manual.reviewItems;
  return manual;
}

test("rejects fields that contradict a requirement condition kind", () => {
  const invalid = extraction();
  invalid.requirements.rule.children[0] = {
    ...invalid.requirements.rule.children[0],
    conditionKind: "free_text",
    minimumUnits: null,
    courseCodes: ["COMP1100"],
    freeText: "Complete an approved course.",
  };
  const result = validateAcademicStructureExtraction(invalid);
  assert.equal(result.success, false);
  assert.ok(
    result.issues.some(
      ({ path, message }) =>
        path.includes("courseCodes") && message.includes("free_text"),
    ),
  );
});

test("canonicalises relationships to their database natural key", () => {
  const value = extraction();
  value.relationships = [
    {
      position: 4,
      relationshipKind: "option",
      targetKind: "major",
      targetCode: "SOFT-MAJ",
      targetTitle: null,
      sourceText: "Choose SOFT-MAJ.",
      sourceLocator: "#requirements",
    },
    {
      position: 9,
      relationshipKind: "option",
      targetKind: "major",
      targetCode: "SOFT-MAJ",
      targetTitle: "Software Development",
      sourceText: "Software Development (SOFT-MAJ)",
      sourceLocator: "#majors",
    },
  ];
  const projection = projectAcademicStructureSnapshot(value);
  assert.equal(projection.relationships.length, 1);
  assert.equal(projection.relationships[0].position, 1);
  assert.equal(projection.relationships[0].targetTitle, "Software Development");
  assert.match(projection.relationships[0].sourceText, /Choose SOFT-MAJ/);
  assert.match(projection.relationships[0].sourceText, /Software Development/);
});

test("validates and normalises a complete manual replacement projection", () => {
  const manual = manualProjection();
  manual.sections[0].position = 8;
  manual.summaryFields[0].position = 6;
  manual.summaryFields[1].position = 6;
  manual.summaryFields[0].valuePosition = 4;
  manual.summaryFields[1].valuePosition = 9;
  manual.evidence[0].position = 7;
  const normalised = normaliseAcademicStructureManualSnapshotProjection(manual);
  assert.equal(normalised.sections[0].position, 1);
  assert.deepEqual(
    normalised.summaryFields.map((field) => [
      field.position,
      field.valuePosition,
      field.fieldValue,
    ]),
    [
      [1, 1, "Full-time"],
      [1, 2, "Part-time"],
    ],
  );
  assert.equal(normalised.evidence[0].position, 1);
  assert.equal(normalised.requirementRootKey, "requirements:root");
  assert.equal(
    normalised.requirementConditions[0].groupKey,
    "requirements:root",
  );
  assert.deepEqual(
    parseAcademicStructureManualSnapshotProjection(normalised),
    normalised,
  );
});

test("strictly validates editable summary fields and evidence", () => {
  const inconsistentSummary = manualProjection();
  inconsistentSummary.summaryFields[1].label = "Different label";
  assert.throws(
    () => parseAcademicStructureManualSnapshotProjection(inconsistentSummary),
    /inconsistent metadata/i,
  );

  const invalidEvidence = manualProjection();
  invalidEvidence.evidence[0].confidence = 1.2;
  assert.throws(
    () => parseAcademicStructureManualSnapshotProjection(invalidEvidence),
    /expected number to be <=1/i,
  );
});

test("rejects cycles and orphaned rows in a manual requirement tree", () => {
  const manual = manualProjection();
  manual.requirementGroups[0].parentGroupKey = manual.requirementGroups[0].key;
  assert.throws(
    () => parseAcademicStructureManualSnapshotProjection(manual),
    /root requirement group|only root|cycle/i,
  );
});

test("manual save is permission checked, immutable, CAS protected and draft only", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260830110000_academic_structure_manual_snapshots.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /create_academic_structure_manual_snapshot/);
  assert.match(migration, /private\.has_permission\('catalogue\.write'\)/);
  assert.match(migration, /parent_snapshot_id/);
  assert.match(migration, /origin,[\s\S]*?'manual'/);
  assert.match(
    migration,
    /draft_snapshot_id is not distinct from previous_draft_id/,
  );
  assert.match(
    migration,
    /published_snapshot_id is not distinct from previous_published_id/,
  );
  assert.doesNotMatch(
    migration,
    /set\s+published_snapshot_id\s*=\s*new_snapshot_id/i,
  );
  assert.match(
    migration,
    /jsonb_array_elements\(p_projection -> 'summaryFields'\)/,
  );
  assert.match(migration, /jsonb_array_elements\(p_projection -> 'evidence'\)/);
  assert.doesNotMatch(
    migration,
    /from public\.academic_structure_summary_fields\s+where snapshot_id = base_snapshot_id/,
  );
  assert.doesNotMatch(
    migration,
    /from public\.academic_structure_snapshot_evidence\s+where snapshot_id = base_snapshot_id/,
  );
});

test("admin editor uses structured controls rather than persisted JSON", async () => {
  const [editor, action] = await Promise.all([
    readFile(
      new URL(
        "../components/admin/academic-structures/manual-snapshot-editor.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../lib/coursemap/academic-structure-snapshot-actions.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  for (const label of [
    "Sections",
    "Summary fields",
    "Evidence",
    "Learning outcomes",
    "Fees",
    "Relationships",
    "Requirement tree",
    "Add nested group",
    "Add condition",
    "Add summary field",
    "Add evidence",
  ]) {
    assert.match(editor, new RegExp(label));
  }
  assert.doesNotMatch(editor, /Relational projection JSON/);
  assert.match(action, /create_academic_structure_manual_snapshot/);
  assert.match(action, /It has not been published/);
});
