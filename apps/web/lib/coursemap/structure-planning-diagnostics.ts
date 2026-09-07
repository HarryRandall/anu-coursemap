import type { AcademicStructureManualSnapshotProjection } from "@/lib/structure-import/manual-snapshot";
import { canMeasureRequirementCondition } from "@/lib/coursemap/requirement-progress";

export function structurePlanningDiagnostics(
  projection: AcademicStructureManualSnapshotProjection,
) {
  const issues: string[] = [];
  if (projection.structureKind === "programme") {
    if (projection.snapshot.durationYears === null) {
      issues.push(
        projection.snapshot.totalUnits === null
          ? "Programme duration and unit total are not recorded. Add the published planning details."
          : `Programme duration is not recorded. The student timeline uses the published ${projection.snapshot.totalUnits} unit total.`,
      );
    }
    if (
      projection.snapshot.totalUnits === null &&
      projection.snapshot.durationYears !== null
    ) {
      issues.push(
        "Programme unit total is not recorded. Completion percentages and remaining units cannot be calculated.",
      );
    }
  }
  if (
    !projection.requirementRootKey ||
    projection.requirementConditions.length === 0
  ) {
    issues.push(
      "No structured requirements are available for student progress tracking.",
    );
  }
  const rules = projection.requirementConditions
    .filter(
      (condition) =>
        !canMeasureRequirementCondition({
          ...condition,
          options: projection.requirementOptions
            .filter((option) => option.conditionKey === condition.key)
            .map((option) => ({
              code: option.optionCode,
              kind: option.optionKind,
              position: option.position,
              structureKind: option.structureKind,
            })),
        }),
    )
    .map((condition) => condition.sourceText);
  return {
    issues,
    rules: [
      ...new Set([
        ...rules,
        ...projection.unmodelledRequirements.map((item) => item.sourceText),
      ]),
    ],
  };
}
