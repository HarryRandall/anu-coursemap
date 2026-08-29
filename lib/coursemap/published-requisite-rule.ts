import type { Json } from "@/types/database";
import type { CatalogueRequisiteRule } from "./catalogue-types";
import type { RequisiteExpression } from "./requisite-summary";

type RequisiteGroupPayload = {
  id: number;
  operator: "all_of" | "any_of";
  parentId: number | null;
  position: number;
};

type RequisiteConditionPayload =
  | { code: string; groupId: number; kind: "course"; position: number }
  | {
      groupId: number;
      kind: "subject_units";
      position: number;
      subject: string;
      units: number;
    }
  | {
      groupId: number;
      kind: "level_units";
      level: number;
      position: number;
      subject?: string;
      units: number;
    }
  | {
      groupId: number;
      kind: "units_total";
      position: number;
      units: number;
    };

function isRecord(
  value: Json | undefined,
): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Json | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: Json | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Read the complete subset of stored requisite rules that Coursemap can
 * currently evaluate for a student. If any group or condition is unsupported,
 * keep the authoritative source wording but return no expression. Silently
 * dropping one condition could otherwise make a rule appear easier than it is.
 */
export function readPublishedRequisiteRule(
  value: Json | undefined,
): CatalogueRequisiteRule | null {
  if (!isRecord(value)) return null;

  const sourceText = readString(value.source_text);
  if (!sourceText) return null;
  const reviewState = readString(value.review_state);
  const rawGroups = Array.isArray(value.groups) ? value.groups : [];
  const groups = rawGroups.flatMap<RequisiteGroupPayload>((group) => {
    if (!isRecord(group)) return [];
    const id = readNumber(group.id, Number.NaN);
    const parentId =
      typeof group.parent_group_id === "number" ? group.parent_group_id : null;
    const operator = readString(group.operator);
    const position = readNumber(group.position, Number.NaN);
    if (
      !Number.isInteger(id) ||
      (parentId !== null && !Number.isInteger(parentId)) ||
      !["all_of", "any_of"].includes(operator) ||
      !Number.isInteger(position)
    ) {
      return [];
    }
    return [
      {
        id,
        parentId,
        operator: operator as RequisiteGroupPayload["operator"],
        position,
      },
    ];
  });
  const rawConditions = Array.isArray(value.conditions) ? value.conditions : [];
  const conditions = rawConditions.flatMap<RequisiteConditionPayload>(
    (condition) => {
      if (!isRecord(condition)) return [];
      const groupId = readNumber(condition.group_id, Number.NaN);
      const position = readNumber(condition.position, Number.NaN);
      const kind = readString(condition.condition_kind);
      if (!Number.isInteger(groupId) || !Number.isInteger(position)) return [];
      if (kind === "course") {
        const code = readString(condition.course_code).toUpperCase();
        const minimumMark = condition.minimum_mark;
        return /^[A-Z]{4}\d{4}[A-Z]?$/u.test(code) && minimumMark == null
          ? [{ groupId, position, kind: "course" as const, code }]
          : [];
      }
      if (kind === "subject_units") {
        const subject = readString(condition.subject_code).toUpperCase();
        const units = readNumber(condition.minimum_units, Number.NaN);
        return /^[A-Z]{4}$/u.test(subject) && units > 0
          ? [
              {
                groupId,
                position,
                kind: "subject_units" as const,
                subject,
                units,
              },
            ]
          : [];
      }
      if (kind === "level_units") {
        const subject = readString(condition.subject_code).toUpperCase();
        const units = readNumber(condition.minimum_units, Number.NaN);
        const level = readNumber(condition.minimum_course_level, Number.NaN);
        return units > 0 &&
          Number.isInteger(level) &&
          level >= 0 &&
          (subject === "" || /^[A-Z]{4}$/u.test(subject))
          ? [
              {
                groupId,
                position,
                kind: "level_units" as const,
                level,
                units,
                ...(subject ? { subject } : {}),
              },
            ]
          : [];
      }
      if (kind === "units_total") {
        const units = readNumber(condition.minimum_units, Number.NaN);
        return units > 0
          ? [
              {
                groupId,
                position,
                kind: "units_total" as const,
                units,
              },
            ]
          : [];
      }
      return [];
    },
  );
  const roots = groups.filter((group) => group.parentId === null);
  const completePayload =
    groups.length === rawGroups.length &&
    conditions.length === rawConditions.length &&
    roots.length === 1;

  function expressionForGroup(
    groupId: number,
    ancestors = new Set<number>(),
  ): RequisiteExpression | null {
    if (ancestors.has(groupId)) return null;
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) return null;

    const children = [
      ...groups
        .filter((candidate) => candidate.parentId === groupId)
        .map((candidate) => ({ kind: "group" as const, value: candidate })),
      ...conditions
        .filter((condition) => condition.groupId === groupId)
        .map((condition) => ({ kind: "condition" as const, value: condition })),
    ].sort((left, right) => left.value.position - right.value.position);
    if (children.length === 0) return null;

    const nextAncestors = new Set(ancestors).add(groupId);
    const expressions: RequisiteExpression[] = [];
    for (const child of children) {
      let expression: RequisiteExpression | null;
      if (child.kind === "group") {
        expression = expressionForGroup(child.value.id, nextAncestors);
      } else if (child.value.kind === "course") {
        expression = { kind: "course", code: child.value.code };
      } else if (child.value.kind === "subject_units") {
        expression = {
          kind: "subject_units",
          subject: child.value.subject,
          units: child.value.units,
        };
      } else if (child.value.kind === "level_units") {
        expression = {
          kind: "level_units",
          level: child.value.level,
          units: child.value.units,
          ...(child.value.subject ? { subject: child.value.subject } : {}),
        };
      } else {
        expression = {
          kind: "units_total",
          units: child.value.units,
        };
      }
      if (!expression) return null;
      expressions.push(expression);
    }
    return {
      kind: "group",
      operator: group.operator,
      conditions: expressions,
    };
  }

  return {
    confidence: readNumber(value.confidence),
    expression: completePayload ? expressionForGroup(roots[0].id) : null,
    reviewState:
      reviewState === "verified"
        ? "verified"
        : reviewState === "review"
          ? "review"
          : "automatic",
    sourceText,
  };
}
