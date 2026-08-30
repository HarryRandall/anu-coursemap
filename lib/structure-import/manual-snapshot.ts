import { z } from "zod";
import {
  ACADEMIC_STRUCTURE_CODE_PATTERN,
  ACADEMIC_STRUCTURE_EXTRACTION_SCHEMA_VERSION,
  ACADEMIC_STRUCTURE_KINDS,
  COURSE_CODE_PATTERN,
  parseAcademicStructureExtraction,
  type AcademicStructureExtraction,
  type AcademicStructureKind,
  type AcademicStructureRequirementRule,
} from "./contract.ts";
import type { AcademicStructureSnapshotProjection } from "./project-snapshot.ts";
import { ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION } from "./prompt.ts";
import { canonicaliseAcademicStructureRelationships } from "./relationship-canonicalisation.ts";

export type AcademicStructureManualSnapshotProjection = Pick<
  AcademicStructureSnapshotProjection,
  | "schemaVersion"
  | "structureKind"
  | "structureCode"
  | "academicYear"
  | "snapshot"
  | "summaryFields"
  | "sections"
  | "learningOutcomes"
  | "fees"
  | "relationships"
  | "requirementRootKey"
  | "requirementGroups"
  | "requirementConditions"
  | "requirementOptions"
  | "unmodelledRequirements"
  | "evidence"
>;

export type AcademicStructureManualSnapshotValidationOptions = {
  expectedKind?: AcademicStructureKind;
  expectedCode?: string;
  expectedYear?: number;
};

const nonEmptyText = z.string().trim().min(1);
const nullableText = nonEmptyText.nullable();
const positivePosition = z.number().int().positive();
const nullablePositiveNumber = z.number().finite().positive().nullable();
const nullableNonNegativeNumber = z.number().finite().nonnegative().nullable();
const structureKind = z.enum(ACADEMIC_STRUCTURE_KINDS);

const snapshotSchema = z
  .object({
    title: nonEmptyText,
    acronym: nullableText,
    shortName: nullableText,
    introduction: nullableText,
    description: nullableText,
    totalUnits: nullablePositiveNumber,
    durationYears: nullablePositiveNumber,
    academicCareer: nullableText,
    college: nullableText,
    deliveryMode: nullableText,
    selectionRank: z.number().finite().min(0).max(100).nullable(),
    atar: z.number().finite().min(0).max(100).nullable(),
    canCombine: z.boolean().nullable(),
    canCombineVertical: z.boolean().nullable(),
    studyAs: nullableText,
    contactText: nullableText,
    overallConfidence: z.number().finite().min(0).max(1).nullable(),
  })
  .strict();

const summaryFieldSchema = z
  .object({
    position: positivePosition,
    valuePosition: positivePosition,
    fieldKey: nonEmptyText.regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u),
    label: nonEmptyText,
    fieldValue: nonEmptyText,
    sourceText: nonEmptyText,
  })
  .strict();

const sectionSchema = z
  .object({
    position: positivePosition,
    sectionKey: nonEmptyText.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    heading: nonEmptyText,
    markdown: nonEmptyText,
    sourceText: nonEmptyText,
    sourceLocator: nonEmptyText,
  })
  .strict();

const outcomeSchema = z
  .object({
    position: positivePosition,
    outcomeText: nonEmptyText,
    sourceText: nonEmptyText,
    sourceLocator: nonEmptyText,
  })
  .strict();

const feeSchema = z
  .object({
    position: positivePosition,
    feeYear: z.number().int().min(2000).max(2200).nullable(),
    audience: z.enum([
      "domestic",
      "international",
      "commonwealth_supported",
      "other",
    ]),
    feeType: z.enum(["student_contribution", "tuition", "indicative", "other"]),
    amount: nullableNonNegativeNumber,
    currency: z.literal("AUD").nullable(),
    basis: z.enum(["programme", "unit", "eftsl", "annual", "unknown"]),
    sourceLabel: nullableText,
    sourceText: nonEmptyText,
    sourceLocator: nonEmptyText,
  })
  .strict();

const relationshipSchema = z
  .object({
    position: positivePosition,
    relationshipKind: z.enum([
      "source_reference",
      "relevant",
      "option",
      "required",
      "incompatible",
      "other",
    ]),
    targetKind: z.union([structureKind, z.literal("course")]),
    targetCode: nonEmptyText.regex(ACADEMIC_STRUCTURE_CODE_PATTERN),
    targetTitle: nullableText,
    sourceText: nonEmptyText,
    sourceLocator: nonEmptyText,
  })
  .strict();

const groupSchema = z
  .object({
    key: nonEmptyText,
    parentGroupKey: nullableText,
    position: positivePosition,
    operator: z.enum(["all_of", "any_of", "minimum_count"]),
    minimumCount: z.number().int().positive().nullable(),
    minimumUnits: nullablePositiveNumber,
    maximumUnits: nullablePositiveNumber,
    title: nullableText,
    description: nullableText,
    sourceText: nonEmptyText,
    sourceLocator: nonEmptyText,
  })
  .strict()
  .superRefine((group, context) => {
    if (
      (group.operator === "minimum_count") !==
      (group.minimumCount !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["minimumCount"],
        message: "must be present only for minimum_count",
      });
    }
    if (
      group.minimumUnits !== null &&
      group.maximumUnits !== null &&
      group.minimumUnits > group.maximumUnits
    ) {
      context.addIssue({
        code: "custom",
        path: ["maximumUnits"],
        message: "must not be less than minimumUnits",
      });
    }
  });

const conditionSchema = z
  .object({
    key: nonEmptyText,
    groupKey: nonEmptyText,
    position: positivePosition,
    conditionKind: z.enum([
      "course_list",
      "structure_list",
      "unit_total",
      "level",
      "subject",
      "tag",
      "unrestricted",
      "free_text",
    ]),
    minimumUnits: nullablePositiveNumber,
    maximumUnits: nullablePositiveNumber,
    minimumCourses: z.number().int().positive().nullable(),
    structureKind: structureKind.nullable(),
    subjectCode: nonEmptyText.regex(/^[A-Z]{4}$/u).nullable(),
    minimumLevel: z.number().int().min(0).max(9999).nullable(),
    maximumLevel: z.number().int().min(0).max(9999).nullable(),
    tag: nullableText,
    freeText: nullableText,
    sourceText: nonEmptyText,
    sourceLocator: nonEmptyText,
  })
  .strict();

const optionSchema = z
  .object({
    conditionKey: nonEmptyText,
    position: positivePosition,
    optionKind: z.enum(["course", "structure"]),
    optionCode: nonEmptyText,
    structureKind: structureKind.nullable(),
  })
  .strict()
  .superRefine((option, context) => {
    if (option.optionKind === "course") {
      if (!COURSE_CODE_PATTERN.test(option.optionCode)) {
        context.addIssue({
          code: "custom",
          path: ["optionCode"],
          message: "must be a literal ANU course code",
        });
      }
      if (option.structureKind !== null) {
        context.addIssue({
          code: "custom",
          path: ["structureKind"],
          message: "must be null for a course option",
        });
      }
      return;
    }
    if (!ACADEMIC_STRUCTURE_CODE_PATTERN.test(option.optionCode)) {
      context.addIssue({
        code: "custom",
        path: ["optionCode"],
        message: "must be a literal academic structure code",
      });
    }
    if (option.structureKind === null) {
      context.addIssue({
        code: "custom",
        path: ["structureKind"],
        message: "is required for a structure option",
      });
    }
  });

const unmodelledSchema = z
  .object({
    position: positivePosition,
    sourceText: nonEmptyText,
    sourceLocator: nullableText,
  })
  .strict();

const evidenceSchema = z
  .object({
    position: positivePosition,
    fieldKey: nonEmptyText,
    sourceLocator: nonEmptyText,
    evidenceExcerpt: nonEmptyText,
    confidence: z.number().finite().min(0).max(1),
    method: z.enum(["deterministic", "model"]),
  })
  .strict();

const manualProjectionSchema: z.ZodType<AcademicStructureManualSnapshotProjection> =
  z
    .object({
      schemaVersion: z.literal(ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION),
      structureKind,
      structureCode: nonEmptyText.regex(ACADEMIC_STRUCTURE_CODE_PATTERN),
      academicYear: z.number().int().min(2020).max(2030),
      snapshot: snapshotSchema,
      summaryFields: z.array(summaryFieldSchema),
      sections: z.array(sectionSchema),
      learningOutcomes: z.array(outcomeSchema),
      fees: z.array(feeSchema),
      relationships: z.array(relationshipSchema),
      requirementRootKey: nullableText,
      requirementGroups: z.array(groupSchema),
      requirementConditions: z.array(conditionSchema),
      requirementOptions: z.array(optionSchema),
      unmodelledRequirements: z.array(unmodelledSchema),
      evidence: z.array(evidenceSchema),
    })
    .strict();

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${label} must be unique.`);
  }
}

function treeRule(
  projection: AcademicStructureManualSnapshotProjection,
): AcademicStructureRequirementRule | null {
  if (projection.requirementRootKey === null) {
    if (
      projection.requirementGroups.length > 0 ||
      projection.requirementConditions.length > 0 ||
      projection.requirementOptions.length > 0
    ) {
      throw new TypeError("Requirement rows require one requirementRootKey.");
    }
    return null;
  }

  assertUnique(
    projection.requirementGroups.map(({ key }) => key),
    "Requirement group keys",
  );
  assertUnique(
    projection.requirementConditions.map(({ key }) => key),
    "Requirement condition keys",
  );
  const groups = new Map(
    projection.requirementGroups.map((group) => [group.key, group]),
  );
  const conditions = new Map(
    projection.requirementConditions.map((condition) => [
      condition.key,
      condition,
    ]),
  );
  const root = groups.get(projection.requirementRootKey);
  if (!root || root.parentGroupKey !== null) {
    throw new TypeError(
      "requirementRootKey must reference the only root requirement group.",
    );
  }
  const rootGroups = projection.requirementGroups.filter(
    ({ parentGroupKey }) => parentGroupKey === null,
  );
  if (rootGroups.length !== 1) {
    throw new TypeError("A requirement tree must have exactly one root group.");
  }
  for (const group of projection.requirementGroups) {
    if (group.parentGroupKey !== null && !groups.has(group.parentGroupKey)) {
      throw new TypeError(
        `Requirement group ${group.key} has an unknown parent.`,
      );
    }
  }
  for (const condition of projection.requirementConditions) {
    if (!groups.has(condition.groupKey)) {
      throw new TypeError(
        `Requirement condition ${condition.key} has an unknown group.`,
      );
    }
  }
  for (const option of projection.requirementOptions) {
    if (!conditions.has(option.conditionKey)) {
      throw new TypeError(
        `Requirement option ${option.optionCode} has an unknown condition.`,
      );
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const buildGroup = (key: string): AcademicStructureRequirementRule => {
    if (visiting.has(key)) {
      throw new TypeError(`Requirement group ${key} creates a cycle.`);
    }
    if (visited.has(key)) {
      throw new TypeError(`Requirement group ${key} has multiple parents.`);
    }
    const group = groups.get(key);
    if (!group) throw new TypeError(`Requirement group ${key} is missing.`);
    visiting.add(key);

    const childGroups = projection.requirementGroups
      .filter(({ parentGroupKey }) => parentGroupKey === key)
      .map((child) => ({
        position: child.position,
        key: child.key,
        rule: () => buildGroup(child.key),
      }));
    const childConditions = projection.requirementConditions
      .filter(({ groupKey }) => groupKey === key)
      .map((condition) => ({
        position: condition.position,
        key: condition.key,
        rule: () => {
          const options = projection.requirementOptions
            .filter(({ conditionKey }) => conditionKey === condition.key)
            .sort((left, right) => left.position - right.position);
          assertUnique(
            options.map(
              ({ optionKind, optionCode }) => `${optionKind}:${optionCode}`,
            ),
            `Requirement options for ${condition.key}`,
          );
          const courseCodes = options
            .filter(({ optionKind }) => optionKind === "course")
            .map(({ optionCode }) => optionCode);
          const structureOptions = options.filter(
            ({ optionKind }) => optionKind === "structure",
          );
          const structureKinds = new Set(
            structureOptions.map(({ structureKind }) => structureKind),
          );
          if (structureKinds.size > 1) {
            throw new TypeError(
              `Requirement condition ${condition.key} mixes structure kinds.`,
            );
          }
          return {
            type: "condition" as const,
            key: condition.key,
            conditionKind: condition.conditionKind,
            minimumUnits: condition.minimumUnits,
            maximumUnits: condition.maximumUnits,
            minimumCourses: condition.minimumCourses,
            courseCodes,
            structureKind:
              structureOptions.length > 0
                ? (structureOptions[0]!.structureKind as AcademicStructureKind)
                : condition.structureKind,
            structureCodes: structureOptions.map(
              ({ optionCode }) => optionCode,
            ),
            subjectCode: condition.subjectCode,
            minimumLevel: condition.minimumLevel,
            maximumLevel: condition.maximumLevel,
            tag: condition.tag,
            freeText: condition.freeText,
            sourceText: condition.sourceText,
            sourceLocator: condition.sourceLocator,
          };
        },
      }));
    const children = [...childGroups, ...childConditions]
      .sort(
        (left, right) =>
          left.position - right.position || left.key.localeCompare(right.key),
      )
      .map(({ rule }) => rule());
    if (children.length === 0) {
      throw new TypeError(`Requirement group ${key} must have a child.`);
    }
    if (
      new Set(
        [...childGroups, ...childConditions].map(({ position }) => position),
      ).size !==
      childGroups.length + childConditions.length
    ) {
      throw new TypeError(
        `Requirement group ${key} has duplicate child positions.`,
      );
    }
    visiting.delete(key);
    visited.add(key);
    return {
      type: "group",
      key: group.key,
      operator: group.operator,
      minimumCount: group.minimumCount,
      title: group.title,
      sourceText: group.sourceText,
      sourceLocator: group.sourceLocator,
      children,
    };
  };

  const rule = buildGroup(root.key);
  if (visited.size !== groups.size) {
    throw new TypeError(
      "Every requirement group must belong to the root tree.",
    );
  }
  return rule;
}

function summaryFieldsFromManualProjection(
  projection: AcademicStructureManualSnapshotProjection,
): AcademicStructureExtraction["summaryFields"] {
  const rowsByPosition = new Map<
    number,
    AcademicStructureManualSnapshotProjection["summaryFields"]
  >();
  for (const row of projection.summaryFields) {
    rowsByPosition.set(row.position, [
      ...(rowsByPosition.get(row.position) ?? []),
      row,
    ]);
  }
  const positions = [...rowsByPosition].sort(([left], [right]) => left - right);
  assertUnique(
    positions.map(([, rows]) => rows[0]?.fieldKey ?? ""),
    "Summary field keys",
  );
  return positions.map(([position, rows], index) => {
    if (position !== index + 1) {
      throw new TypeError("Summary field positions must be contiguous.");
    }
    const [first] = rows;
    if (!first) throw new TypeError("A summary field must contain one value.");
    if (
      rows.some(
        (row) =>
          row.fieldKey !== first.fieldKey ||
          row.label !== first.label ||
          row.sourceText !== first.sourceText,
      )
    ) {
      throw new TypeError(
        `Summary field ${first.fieldKey} has inconsistent metadata.`,
      );
    }
    const orderedValues = [...rows].sort(
      (left, right) => left.valuePosition - right.valuePosition,
    );
    assertUnique(
      orderedValues.map(({ valuePosition }) => String(valuePosition)),
      `Value positions for summary field ${first.fieldKey}`,
    );
    if (
      orderedValues.some(
        ({ valuePosition }, valueIndex) => valuePosition !== valueIndex + 1,
      )
    ) {
      throw new TypeError(
        `Value positions for summary field ${first.fieldKey} must be contiguous.`,
      );
    }
    return {
      position,
      key: first.fieldKey,
      label: first.label,
      values: orderedValues.map(({ fieldValue }) => fieldValue),
      sourceText: first.sourceText,
    };
  });
}

function extractionFromManualProjection(
  projection: AcademicStructureManualSnapshotProjection,
): AcademicStructureExtraction {
  const rule = treeRule(projection);
  return {
    schemaVersion: ACADEMIC_STRUCTURE_EXTRACTION_SCHEMA_VERSION,
    kind: projection.structureKind,
    code: projection.structureCode,
    year: projection.academicYear,
    ...projection.snapshot,
    summaryFields: summaryFieldsFromManualProjection(projection),
    sections: projection.sections.map((section) => ({
      position: section.position,
      key: section.sectionKey,
      heading: section.heading,
      markdown: section.markdown,
      sourceText: section.sourceText,
      sourceLocator: section.sourceLocator,
    })),
    learningOutcomes: projection.learningOutcomes.map((outcome) => ({
      position: outcome.position,
      text: outcome.outcomeText,
      sourceText: outcome.sourceText,
      sourceLocator: outcome.sourceLocator,
    })),
    fees: projection.fees,
    relationships: projection.relationships,
    requirements: {
      sourceText: rule?.type === "group" ? rule.sourceText : null,
      sourceLocator: rule?.type === "group" ? rule.sourceLocator : null,
      rule,
      unmodelledText: projection.unmodelledRequirements.map(
        ({ sourceText }) => sourceText,
      ),
    },
    evidence: projection.evidence.map(
      ({ fieldKey, sourceLocator, evidenceExcerpt, confidence, method }) => ({
        fieldKey,
        sourceLocator,
        evidenceExcerpt,
        confidence,
        method,
      }),
    ),
    reviewItems: [],
  };
}

export function parseAcademicStructureManualSnapshotProjection(
  value: unknown,
  options: AcademicStructureManualSnapshotValidationOptions = {},
) {
  const projection = manualProjectionSchema.parse(value);
  const evidencePositions = projection.evidence
    .map(({ position }) => position)
    .sort((left, right) => left - right);
  assertUnique(evidencePositions.map(String), "Evidence positions");
  if (evidencePositions.some((position, index) => position !== index + 1)) {
    throw new TypeError("Evidence positions must be contiguous.");
  }
  parseAcademicStructureExtraction(extractionFromManualProjection(projection), {
    expectedKind: options.expectedKind,
    expectedCode: options.expectedCode,
    expectedYear: options.expectedYear,
  });
  return projection;
}

export function normaliseAcademicStructureManualSnapshotProjection(
  value: AcademicStructureManualSnapshotProjection,
) {
  const normalisePositioned = <T extends { position: number }>(rows: T[]) =>
    rows.map((row, index) => ({ ...row, position: index + 1 }));
  const relationships = canonicaliseAcademicStructureRelationships(
    value.relationships,
  );
  const summaryFieldRows = [...value.summaryFields].sort(
    (left, right) =>
      left.position - right.position ||
      left.valuePosition - right.valuePosition ||
      left.fieldKey.localeCompare(right.fieldKey),
  );
  const summaryFieldGroups = new Map<
    string,
    AcademicStructureManualSnapshotProjection["summaryFields"]
  >();
  for (const row of summaryFieldRows) {
    const groupKey = `${row.position}:${row.fieldKey}`;
    summaryFieldGroups.set(groupKey, [
      ...(summaryFieldGroups.get(groupKey) ?? []),
      row,
    ]);
  }
  const summaryFields = [...summaryFieldGroups.values()].flatMap(
    (rows, fieldIndex) =>
      rows.map((row, valueIndex) => ({
        ...row,
        position: fieldIndex + 1,
        valuePosition: valueIndex + 1,
      })),
  );
  const groupsByParent = new Map<
    string | null,
    AcademicStructureManualSnapshotProjection["requirementGroups"]
  >();
  for (const group of value.requirementGroups) {
    groupsByParent.set(group.parentGroupKey, [
      ...(groupsByParent.get(group.parentGroupKey) ?? []),
      group,
    ]);
  }
  const conditionsByGroup = new Map<
    string,
    AcademicStructureManualSnapshotProjection["requirementConditions"]
  >();
  for (const condition of value.requirementConditions) {
    conditionsByGroup.set(condition.groupKey, [
      ...(conditionsByGroup.get(condition.groupKey) ?? []),
      condition,
    ]);
  }
  const requirementGroups: AcademicStructureManualSnapshotProjection["requirementGroups"] =
    [];
  const requirementConditions: AcademicStructureManualSnapshotProjection["requirementConditions"] =
    [];
  const visitedGroups = new Set<string>();
  const walkGroup = (
    group: AcademicStructureManualSnapshotProjection["requirementGroups"][number],
    position: number,
  ) => {
    if (visitedGroups.has(group.key)) {
      throw new TypeError(`Requirement group ${group.key} contains a cycle.`);
    }
    visitedGroups.add(group.key);
    requirementGroups.push({ ...group, position });
    const children = [
      ...(groupsByParent.get(group.key) ?? []).map((child) => ({
        position: child.position,
        key: child.key,
        kind: "group" as const,
        value: child,
      })),
      ...(conditionsByGroup.get(group.key) ?? []).map((child) => ({
        position: child.position,
        key: child.key,
        kind: "condition" as const,
        value: child,
      })),
    ].sort(
      (left, right) =>
        left.position - right.position || left.key.localeCompare(right.key),
    );
    children.forEach((child, index) => {
      if (child.kind === "group") walkGroup(child.value, index + 1);
      else requirementConditions.push({ ...child.value, position: index + 1 });
    });
  };
  if (value.requirementRootKey !== null) {
    const root = value.requirementGroups.find(
      ({ key }) => key === value.requirementRootKey,
    );
    if (!root) throw new TypeError("The requirement root group is missing.");
    walkGroup(root, 1);
  }
  const requirementOptions = requirementConditions.flatMap((condition) =>
    normalisePositioned(
      value.requirementOptions.filter(
        ({ conditionKey }) => conditionKey === condition.key,
      ),
    ),
  );
  return parseAcademicStructureManualSnapshotProjection({
    ...value,
    summaryFields,
    sections: normalisePositioned(value.sections),
    learningOutcomes: normalisePositioned(value.learningOutcomes),
    fees: normalisePositioned(value.fees),
    relationships,
    requirementGroups,
    requirementConditions,
    requirementOptions,
    unmodelledRequirements: normalisePositioned(value.unmodelledRequirements),
    evidence: normalisePositioned(value.evidence),
  });
}
