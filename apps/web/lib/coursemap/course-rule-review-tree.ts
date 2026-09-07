import type { CourseSnapshotProjectionData } from "@/lib/course-import/project-snapshot";
import type { EditableRuleKind } from "@/lib/coursemap/course-snapshot-rule-projection";
import {
  createEmptyTree,
  type ReviewedConditionNode,
  type ReviewedGroupNode,
} from "@/lib/coursemap/requisite-conditions";

const supportedConditionKinds = new Set([
  "course",
  "incompatible",
  "units_total",
  "subject_units",
  "level_units",
  "course_set_units",
  "year_standing",
  "permission",
  "admission",
  "gpa",
  "wam",
  "other",
]);

function conditionFromProjection(
  condition: CourseSnapshotProjectionData["ruleConditions"][number],
  courseCodes: string[],
): ReviewedConditionNode | null {
  if (!supportedConditionKinds.has(condition.conditionKind)) return null;
  const base = {
    type: "condition" as const,
    id: condition.key,
  };
  switch (condition.conditionKind) {
    case "course":
      return condition.requiredCourseCode
        ? {
            ...base,
            kind: "course",
            courseCode: condition.requiredCourseCode,
            courseRequirementMode:
              condition.courseRequirementMode ?? "completed",
            mark: condition.minimumMark,
          }
        : null;
    case "incompatible":
      return condition.requiredCourseCode
        ? {
            ...base,
            kind: "incompatible",
            courseCode: condition.requiredCourseCode,
          }
        : null;
    case "admission":
      return {
        ...base,
        kind: "admission",
        structureCode: condition.requiredStructureCode,
        freeText: condition.freeText,
      };
    case "units_total":
      return { ...base, kind: "units_total", units: condition.minimumUnits };
    case "subject_units":
      return {
        ...base,
        kind: "subject_units",
        units: condition.minimumUnits,
        subjectCode: condition.subjectCode,
      };
    case "level_units":
      return {
        ...base,
        kind: "level_units",
        units: condition.minimumUnits,
        level: condition.minimumCourseLevel,
        subjectCode: condition.subjectCode,
      };
    case "course_set_units":
      return {
        ...base,
        kind: "course_set_units",
        units: condition.minimumUnits,
        courseCodes,
      };
    case "year_standing":
      return {
        ...base,
        kind: "year_standing",
        minimumYear: condition.minimumYear,
      };
    case "gpa":
      return { ...base, kind: "gpa", gpa: condition.minimumGpa };
    case "wam":
      return { ...base, kind: "wam", wam: condition.minimumWam };
    case "permission":
      return { ...base, kind: "permission", freeText: condition.freeText };
    case "other":
      return { ...base, kind: "other", freeText: condition.freeText };
    default:
      return null;
  }
}

export function ruleTreeFromProjection(
  projection: CourseSnapshotProjectionData,
  kind: EditableRuleKind,
) {
  const groups = projection.ruleGroups.filter(
    (group) => group.ruleKey === kind,
  );
  const conditions = projection.ruleConditions.filter(
    (condition) => condition.ruleKey === kind,
  );
  const unsupported = conditions.filter(
    (condition) => !supportedConditionKinds.has(condition.conditionKind),
  );
  const root = groups.find((group) => group.parentGroupKey === null);
  if (!root) {
    return {
      tree: createEmptyTree(`${kind}-root`),
      unsupportedKinds: unsupported.map((row) => row.conditionKind),
    };
  }

  function groupToTree(
    group: CourseSnapshotProjectionData["ruleGroups"][number],
  ): ReviewedGroupNode {
    const children = [
      ...groups
        .filter((candidate) => candidate.parentGroupKey === group.key)
        .map((candidate) => ({
          position: candidate.position,
          node: groupToTree(candidate),
        })),
      ...conditions
        .filter((condition) => condition.groupKey === group.key)
        .flatMap((condition) => {
          const courseCodes = projection.ruleConditionCourses
            .filter((member) => member.conditionKey === condition.key)
            .sort((left, right) => left.position - right.position)
            .map((member) => member.sourceCourseCode);
          const node = conditionFromProjection(condition, courseCodes);
          return node ? [{ position: condition.position, node }] : [];
        }),
    ]
      .sort((left, right) => left.position - right.position)
      .map((entry) => entry.node);
    return {
      type: "group",
      id: group.key,
      operator: group.operator,
      minimumCount: group.minimumCount,
      children,
    };
  }

  return {
    tree: groupToTree(root),
    unsupportedKinds: unsupported.map((row) => row.conditionKind),
  };
}
