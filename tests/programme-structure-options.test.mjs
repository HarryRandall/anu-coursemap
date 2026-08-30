import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { collectSelectableStructureCodes } from "../lib/coursemap/programme-structure-options.ts";

test("keeps only explicit programme structure relationship semantics", () => {
  const codes = collectSelectableStructureCodes({
    programmeSnapshotIds: new Set([101]),
    relationships: [
      relationship("required", "MATH-MAJ"),
      relationship("option", "COMP-MAJ"),
      relationship("source_reference", "STAT-MAJ"),
      relationship("relevant", "PHYS-MAJ"),
      relationship("incompatible", "ANTH-MAJ"),
      relationship("other", "ECON-MAJ"),
      relationship("required", "DATA-MIN", "minor"),
      { ...relationship("required", "CHEM-MAJ"), snapshot_id: 202 },
    ],
    requirementConditions: [],
    requirementOptions: [],
  });

  assert.deepEqual(codes.get(101), {
    major: ["COMP-MAJ", "MATH-MAJ"],
    minor: ["DATA-MIN"],
    specialisation: [],
  });
  assert.equal(codes.has(202), false);
});

test("includes structure options from programme structure-list requirements", () => {
  const codes = collectSelectableStructureCodes({
    programmeSnapshotIds: new Set([101]),
    relationships: [],
    requirementConditions: [
      condition(1, "structure_list", "major"),
      condition(2, "course_list", "major"),
      condition(3, "structure_list", "minor"),
      condition(5, "structure_list", "specialisation"),
      { ...condition(4, "structure_list", "major"), snapshot_id: 202 },
    ],
    requirementOptions: [
      option(1, "MATH-MAJ"),
      option(1, "COMP-MAJ"),
      option(2, "STAT-MAJ"),
      option(3, "DATA-MIN", "minor"),
      option(5, "AI-SPEC", "specialisation"),
      { ...option(1, "PHYS-MAJ"), snapshot_id: 202 },
      { ...option(4, "CHEM-MAJ"), snapshot_id: 202 },
      { ...option(1, "ECON-MAJ"), option_kind: "course" },
    ],
  });

  assert.deepEqual(codes.get(101), {
    major: ["COMP-MAJ", "MATH-MAJ"],
    minor: ["DATA-MIN"],
    specialisation: ["AI-SPEC"],
  });
  assert.equal(codes.has(202), false);
});

test("onboarding loads explicit relationship and structure-list semantics without zero fallbacks", async () => {
  const source = await readFile(
    new URL("../lib/coursemap/onboarding-catalogue.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /collectSelectableStructureCodes/u);
  assert.match(
    source,
    /relationship_kind,snapshot_id,target_code,target_kind/u,
  );
  assert.match(source, /academic_structure_requirement_conditions/u);
  assert.match(source, /academic_structure_requirement_options/u);
  assert.doesNotMatch(source, /snapshot\.units === null \? 0/u);
});

function relationship(relationshipKind, targetCode, targetKind = "major") {
  return {
    relationship_kind: relationshipKind,
    snapshot_id: 101,
    target_code: targetCode,
    target_kind: targetKind,
  };
}

function condition(id, conditionKind, structureKind) {
  return {
    condition_kind: conditionKind,
    id,
    snapshot_id: 101,
    structure_kind: structureKind,
  };
}

function option(conditionId, optionCode, structureKind = "major") {
  return {
    option_code: optionCode,
    option_kind: "structure",
    requirement_condition_id: conditionId,
    snapshot_id: 101,
    structure_kind: structureKind,
  };
}
