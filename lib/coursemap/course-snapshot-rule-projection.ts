import { extractAnuCourseCodes } from "../course-import/course-codes.ts";
import type { CourseSnapshotProjectionData } from "../course-import/project-snapshot.ts";
import { parseCourseSnapshotProjection } from "../course-import/snapshot-projection-contract.ts";
import {
  conditionSourceText,
  type ReviewedConditionNode,
  type ReviewedGroupNode,
  type ReviewedRuleTree,
} from "./requisite-conditions.ts";

export type EditableRuleKind =
  | "prerequisite"
  | "corequisite"
  | "incompatibility"
  | "permission"
  | "assumed_knowledge";

function conditionProjection(
  condition: ReviewedConditionNode,
  input: {
    groupKey: string;
    hardness: "hard" | "advisory";
    key: string;
    kind: EditableRuleKind;
    position: number;
  },
): CourseSnapshotProjectionData["ruleConditions"][number] {
  const sourceText = conditionSourceText(condition);
  return {
    key: input.key,
    ruleKey: input.kind,
    groupKey: input.groupKey,
    position: input.position,
    conditionKind: condition.kind,
    requiredCourseCode:
      condition.kind === "course" || condition.kind === "incompatible"
        ? (condition.courseCode ?? null)
        : null,
    requiredStructureCode:
      condition.kind === "admission" ? (condition.structureCode ?? null) : null,
    minimumUnits:
      condition.kind === "units_total" ||
      condition.kind === "subject_units" ||
      condition.kind === "level_units" ||
      condition.kind === "course_set_units"
        ? (condition.units ?? null)
        : null,
    minimumMark: condition.kind === "course" ? (condition.mark ?? null) : null,
    subjectCode:
      condition.kind === "subject_units" || condition.kind === "level_units"
        ? (condition.subjectCode ?? null)
        : null,
    minimumCourseLevel:
      condition.kind === "level_units" ? (condition.level ?? null) : null,
    maximumCourseLevel:
      condition.kind === "level_units" && condition.level != null
        ? condition.level + 999
        : null,
    minimumGpa: condition.kind === "gpa" ? (condition.gpa ?? null) : null,
    minimumYear:
      condition.kind === "year_standing"
        ? (condition.minimumYear ?? null)
        : null,
    minimumWam: condition.kind === "wam" ? (condition.wam ?? null) : null,
    freeText:
      condition.kind === "admission" ||
      condition.kind === "permission" ||
      condition.kind === "other"
        ? (condition.freeText ?? null)
        : null,
    courseRequirementMode:
      condition.kind === "course"
        ? (condition.courseRequirementMode ?? "completed")
        : null,
    hardness: input.hardness,
    sourceText,
  };
}

/**
 * Replace one rule with an administrator-reviewed tree while retaining exact
 * course-code mentions from the source as descriptive graph references.
 */
export function applyRuleTreeToProjection({
  hardness,
  kind,
  projection,
  sourceText,
  tree,
}: {
  hardness: "hard" | "advisory";
  kind: EditableRuleKind;
  projection: CourseSnapshotProjectionData;
  sourceText: string;
  tree: ReviewedRuleTree;
}) {
  const next = structuredClone(projection);
  const previousConditionKeys = new Set(
    next.ruleConditions
      .filter((condition) => condition.ruleKey === kind)
      .map((condition) => condition.key),
  );
  next.rules = next.rules.filter((rule) => rule.ruleKind !== kind);
  next.ruleGroups = next.ruleGroups.filter((group) => group.ruleKey !== kind);
  next.ruleConditions = next.ruleConditions.filter(
    (condition) => condition.ruleKey !== kind,
  );
  next.ruleConditionCourses = next.ruleConditionCourses.filter(
    (member) => !previousConditionKeys.has(member.conditionKey),
  );
  next.ruleCourseReferences = next.ruleCourseReferences.filter(
    (reference) => reference.ruleKey !== kind,
  );
  next.rules.push({ key: kind, ruleKind: kind, hardness, sourceText });

  const referencedCourseSources = new Map<string, string>();
  for (const courseCode of extractAnuCourseCodes(sourceText)) {
    referencedCourseSources.set(courseCode, sourceText);
  }
  function addReferencedCourse(courseCode: string, referenceSource: string) {
    const normalisedCourseCode = courseCode.trim().toUpperCase();
    if (!referencedCourseSources.has(normalisedCourseCode)) {
      referencedCourseSources.set(normalisedCourseCode, referenceSource);
    }
  }

  function visitGroup(
    group: ReviewedGroupNode,
    parentGroupKey: string | null,
    path: number[],
    position: number,
  ) {
    const suffix = path.length ? path.join("-") : "root";
    const groupKey = `${kind}-group-${suffix}`;
    next.ruleGroups.push({
      key: groupKey,
      ruleKey: kind,
      parentGroupKey,
      operator: group.operator,
      minimumCount: group.operator === "at_least" ? group.minimumCount : null,
      position,
    });
    group.children.forEach((child, childPosition) => {
      if (child.type === "group") {
        visitGroup(child, groupKey, [...path, childPosition], childPosition);
        return;
      }
      const conditionKey = `${kind}-condition-${[...path, childPosition].join("-") || "root"}`;
      next.ruleConditions.push(
        conditionProjection(child, {
          groupKey,
          hardness,
          key: conditionKey,
          kind,
          position: childPosition,
        }),
      );
      if (child.courseCode) {
        addReferencedCourse(child.courseCode, conditionSourceText(child));
      }
      if (child.kind === "course_set_units") {
        const memberSourceText = conditionSourceText(child);
        (child.courseCodes ?? []).forEach((courseCode, index) => {
          next.ruleConditionCourses.push({
            conditionKey,
            position: index + 1,
            sourceCourseCode: courseCode,
            sourceText: memberSourceText,
          });
          addReferencedCourse(courseCode, memberSourceText);
        });
      }
    });
  }
  visitGroup(tree, null, [], 0);
  referencedCourseSources.delete(projection.courseCode.toUpperCase());
  next.ruleCourseReferences.push(
    ...[...referencedCourseSources.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([referencedCourseCode, referenceSource]) => ({
        ruleKey: kind,
        referencedCourseCode,
        sourceText: referenceSource,
      })),
  );
  return parseCourseSnapshotProjection(next);
}
