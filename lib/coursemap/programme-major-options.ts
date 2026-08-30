export type ProgrammeMajorRelationship = {
  relationship_kind: string;
  snapshot_id: number;
  target_code: string;
  target_kind: string;
};

export type ProgrammeMajorRequirementCondition = {
  condition_kind: string;
  id: number;
  snapshot_id: number;
  structure_kind: string | null;
};

export type ProgrammeMajorRequirementOption = {
  option_code: string;
  option_kind: string;
  requirement_condition_id: number;
  snapshot_id: number;
  structure_kind: string | null;
};

/**
 * Returns only majors which the published programme rules explicitly make
 * selectable. Incidental source references and incompatibilities must never
 * become student choices.
 */
export function collectSelectableMajorCodes({
  programmeSnapshotIds,
  relationships,
  requirementConditions,
  requirementOptions,
}: {
  programmeSnapshotIds: ReadonlySet<number>;
  relationships: readonly ProgrammeMajorRelationship[];
  requirementConditions: readonly ProgrammeMajorRequirementCondition[];
  requirementOptions: readonly ProgrammeMajorRequirementOption[];
}) {
  const codesBySnapshotId = new Map<number, Set<string>>();
  const addCode = (snapshotId: number, code: string) => {
    if (!programmeSnapshotIds.has(snapshotId)) return;
    const codes = codesBySnapshotId.get(snapshotId) ?? new Set<string>();
    codes.add(code);
    codesBySnapshotId.set(snapshotId, codes);
  };

  for (const relationship of relationships) {
    if (
      relationship.target_kind === "major" &&
      (relationship.relationship_kind === "required" ||
        relationship.relationship_kind === "option")
    ) {
      addCode(relationship.snapshot_id, relationship.target_code);
    }
  }

  const majorListConditions = new Map<
    number,
    ProgrammeMajorRequirementCondition
  >();
  for (const condition of requirementConditions) {
    if (
      programmeSnapshotIds.has(condition.snapshot_id) &&
      condition.condition_kind === "structure_list" &&
      condition.structure_kind === "major"
    ) {
      majorListConditions.set(condition.id, condition);
    }
  }

  for (const option of requirementOptions) {
    const condition = majorListConditions.get(option.requirement_condition_id);
    if (
      condition &&
      condition.snapshot_id === option.snapshot_id &&
      option.option_kind === "structure" &&
      option.structure_kind === "major"
    ) {
      addCode(option.snapshot_id, option.option_code);
    }
  }

  return new Map<number, string[]>(
    [...codesBySnapshotId].map(
      ([snapshotId, codes]) => [snapshotId, [...codes].sort()] as const,
    ),
  );
}
