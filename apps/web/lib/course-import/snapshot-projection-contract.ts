import { z } from "zod";
import type { CourseSnapshotProjectionData } from "./project-snapshot.ts";

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}[A-Z]?$/u;
const SUBJECT_CODE_PATTERN = /^[A-Z]{4}$/u;
const STRUCTURE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const text = z.string().refine((value) => value.trim().length > 0, {
  message: "must not be blank",
});
const nullableText = text.nullable();
const number = z.number().finite();
const nullableNumber = number.nullable();
const position = z.number().int().positive();
const treePosition = z.number().int().nonnegative();
const courseCode = text.regex(COURSE_CODE_PATTERN);
const ruleKind = z.enum([
  "prerequisite",
  "corequisite",
  "incompatibility",
  "permission",
  "assumed_knowledge",
]);
const hardness = z.enum(["hard", "advisory"]);

const snapshot = z
  .object({
    title: text,
    unitValueKind: z.enum(["fixed", "range", "variable", "unknown"]),
    units: nullableNumber,
    minimumUnits: nullableNumber,
    maximumUnits: nullableNumber,
    eftsl: nullableNumber,
    level: z.number().int().min(0).max(9999),
    subjectCode: text.regex(SUBJECT_CODE_PATTERN),
    subjectName: nullableText,
    school: nullableText,
    college: nullableText,
    academicCareer: z.enum(["UGRD", "PGRD", "RSCH", "OTHER"]).nullable(),
    convenerText: nullableText,
    deliverySummary: nullableText,
    introduction: nullableText,
    description: nullableText,
    workloadText: nullableText,
    workloadHours: nullableNumber,
    inherentRequirements: nullableText,
    prescribedTexts: nullableText,
    offeringStatus: z.enum(["offered", "not_offered", "unknown"]),
    sourceUpdatedAt: nullableText,
  })
  .strict();

const unitOption = z
  .object({
    position,
    units: number.nonnegative(),
    label: nullableText,
    sourceText: text,
  })
  .strict();

const fee = z
  .object({
    position,
    feeYear: z.number().int().min(2000).max(2200).nullable(),
    audience: z.enum([
      "domestic",
      "international",
      "commonwealth_supported",
      "other",
    ]),
    feeType: z.enum(["student_contribution", "tuition", "indicative", "other"]),
    amount: number.nonnegative().nullable(),
    currency: text.regex(/^[A-Z]{3}$/u).nullable(),
    basis: z.enum(["course", "unit", "eftsl", "annual", "unknown"]),
    studentContributionBand: z.number().int().positive().nullable(),
    sourceLabel: nullableText,
    sourceText: text,
  })
  .strict();

const areaOfInterest = z.object({ position, name: text }).strict();
const attribute = z
  .object({
    position,
    attributeKind: z.enum(["graduate_attribute", "stem", "other"]),
    value: text,
    sourceText: text,
  })
  .strict();
const relatedCourse = z
  .object({
    position,
    relationKind: z.enum(["co_taught", "equivalent", "other"]),
    sourceCourseCode: courseCode,
    sourceCourseTitle: nullableText,
    sourceText: text,
  })
  .strict();
const courseOffering = z
  .object({ deliveryMode: nullableText, location: nullableText })
  .strict()
  .nullable();
const offeringSession = z
  .object({
    position,
    calendarYear: z.number().int().min(2000).max(2200),
    academicPeriodCode: text,
    academicPeriodName: text,
    classNumber: nullableText,
    startsOn: text.regex(DATE_PATTERN).nullable(),
    enrolClosesOn: text.regex(DATE_PATTERN).nullable(),
    censusOn: text.regex(DATE_PATTERN).nullable(),
    endsOn: text.regex(DATE_PATTERN).nullable(),
    deliveryMode: nullableText,
    location: nullableText,
    classSummaryUrl: nullableText,
    sourceText: text,
  })
  .strict();
const learningOutcome = z.object({ position, body: text }).strict();
const assessmentItem = z
  .object({
    position,
    title: text,
    weight: number.min(0).max(100).nullable(),
    hurdle: z.boolean().nullable(),
    dueText: nullableText,
    sourceText: text,
  })
  .strict();
const assessmentOutcome = z
  .object({
    assessmentPosition: position,
    learningOutcomePosition: position,
  })
  .strict();
const rule = z
  .object({ key: ruleKind, ruleKind, hardness, sourceText: text })
  .strict();
const ruleGroup = z
  .object({
    key: text,
    ruleKey: ruleKind,
    parentGroupKey: nullableText,
    operator: z.enum(["all_of", "any_of", "at_least"]),
    minimumCount: z.number().int().positive().nullable(),
    position: treePosition,
  })
  .strict();
const ruleCondition = z
  .object({
    key: text,
    ruleKey: ruleKind,
    groupKey: text,
    position: treePosition,
    conditionKind: z.enum([
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
    ]),
    requiredCourseCode: courseCode.nullable(),
    requiredStructureCode: text.regex(STRUCTURE_CODE_PATTERN).nullable(),
    minimumUnits: nullableNumber,
    minimumMark: nullableNumber,
    subjectCode: text.regex(SUBJECT_CODE_PATTERN).nullable(),
    minimumCourseLevel: z.number().int().min(0).max(9999).nullable(),
    maximumCourseLevel: z.number().int().min(0).max(9999).nullable(),
    minimumGpa: number.min(0).max(7).nullable(),
    minimumYear: z.number().int().min(1).max(10).nullable(),
    minimumWam: number.min(0).max(100).nullable(),
    freeText: nullableText,
    courseRequirementMode: z
      .enum(["completed", "completed_or_concurrent"])
      .nullable(),
    hardness,
    sourceText: text,
  })
  .strict();
const ruleConditionCourse = z
  .object({
    conditionKey: text,
    position,
    sourceCourseCode: courseCode,
    sourceText: text,
  })
  .strict();
const ruleCourseReference = z
  .object({
    ruleKey: ruleKind,
    referencedCourseCode: courseCode,
    sourceText: text,
  })
  .strict();

function addIssue(
  context: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
) {
  context.addIssue({ code: "custom", path, message });
}

function requireCanonicalPositions(
  context: z.RefinementCtx,
  key: string,
  rows: readonly { position: number }[],
) {
  if (rows.some((row, index) => row.position !== index + 1)) {
    addIssue(context, [key], "must use contiguous positions starting at one");
  }
}

export const courseSnapshotProjectionSchema = z
  .object({
    courseCode,
    academicYear: z.number().int().min(2000).max(2200),
    snapshot,
    unitOptions: z.array(unitOption),
    fees: z.array(fee),
    areasOfInterest: z.array(areaOfInterest),
    attributes: z.array(attribute),
    relatedCourses: z.array(relatedCourse),
    courseOffering,
    offeringSessions: z.array(offeringSession),
    learningOutcomes: z.array(learningOutcome),
    assessmentItems: z.array(assessmentItem),
    assessmentOutcomes: z.array(assessmentOutcome),
    rules: z.array(rule),
    ruleGroups: z.array(ruleGroup),
    ruleConditions: z.array(ruleCondition),
    ruleConditionCourses: z.array(ruleConditionCourse),
    ruleCourseReferences: z.array(ruleCourseReference),
  })
  .strict()
  .superRefine((value, context) => {
    for (const key of [
      "unitOptions",
      "fees",
      "areasOfInterest",
      "attributes",
      "relatedCourses",
      "offeringSessions",
      "learningOutcomes",
      "assessmentItems",
    ] as const) {
      requireCanonicalPositions(context, key, value[key]);
    }

    const unitValues = value.unitOptions.map((option) => option.units);
    const unitKind = value.snapshot.unitValueKind;
    const validUnits =
      (unitKind === "fixed" &&
        value.snapshot.units !== null &&
        value.snapshot.minimumUnits === null &&
        value.snapshot.maximumUnits === null &&
        unitValues.length === 0) ||
      (unitKind === "range" &&
        value.snapshot.units === null &&
        value.snapshot.minimumUnits !== null &&
        value.snapshot.maximumUnits !== null &&
        value.snapshot.maximumUnits >= value.snapshot.minimumUnits &&
        unitValues.length === 0) ||
      (unitKind === "variable" &&
        value.snapshot.units === null &&
        unitValues.length > 0 &&
        value.snapshot.minimumUnits === Math.min(...unitValues) &&
        value.snapshot.maximumUnits === Math.max(...unitValues)) ||
      (unitKind === "unknown" &&
        value.snapshot.units === null &&
        value.snapshot.minimumUnits === null &&
        value.snapshot.maximumUnits === null &&
        unitValues.length === 0);
    if (!validUnits) {
      addIssue(
        context,
        ["snapshot", "unitValueKind"],
        "is inconsistent with unit values",
      );
    }

    if (
      (value.courseOffering === null) !==
      (value.offeringSessions.length === 0)
    ) {
      addIssue(
        context,
        ["courseOffering"],
        "must be supplied with offering sessions",
      );
    }
    value.offeringSessions.forEach((session, index) => {
      if (session.calendarYear !== value.academicYear) {
        addIssue(
          context,
          ["offeringSessions", index, "calendarYear"],
          "must match academicYear",
        );
      }
    });

    const ruleKeys = new Set<string>();
    value.rules.forEach((row, index) => {
      if (row.key !== row.ruleKind) {
        addIssue(context, ["rules", index, "key"], "must equal ruleKind");
      }
      if (ruleKeys.has(row.key)) {
        addIssue(context, ["rules", index, "key"], "must be unique");
      }
      ruleKeys.add(row.key);
    });

    const groups = new Map<string, (typeof value.ruleGroups)[number]>();
    value.ruleGroups.forEach((row, index) => {
      if (groups.has(row.key)) {
        addIssue(context, ["ruleGroups", index, "key"], "must be unique");
      }
      if (!ruleKeys.has(row.ruleKey)) {
        addIssue(
          context,
          ["ruleGroups", index, "ruleKey"],
          "must reference a saved rule",
        );
      }
      if ((row.operator === "at_least") !== (row.minimumCount !== null)) {
        addIssue(
          context,
          ["ruleGroups", index, "minimumCount"],
          "is inconsistent with operator",
        );
      }
      groups.set(row.key, row);
    });
    value.ruleGroups.forEach((row, index) => {
      if (row.parentGroupKey === null) return;
      const parent = groups.get(row.parentGroupKey);
      if (!parent || parent.ruleKey !== row.ruleKey) {
        addIssue(
          context,
          ["ruleGroups", index, "parentGroupKey"],
          "must reference a group in the same rule",
        );
      }
      const visited = new Set([row.key]);
      let cursor = parent;
      while (cursor) {
        if (visited.has(cursor.key)) {
          addIssue(
            context,
            ["ruleGroups", index, "parentGroupKey"],
            "creates a cycle",
          );
          break;
        }
        visited.add(cursor.key);
        cursor = cursor.parentGroupKey
          ? groups.get(cursor.parentGroupKey)
          : undefined;
      }
    });

    const conditions = new Map<string, (typeof value.ruleConditions)[number]>();
    value.ruleConditions.forEach((row, index) => {
      if (conditions.has(row.key)) {
        addIssue(context, ["ruleConditions", index, "key"], "must be unique");
      }
      const group = groups.get(row.groupKey);
      if (
        !ruleKeys.has(row.ruleKey) ||
        !group ||
        group.ruleKey !== row.ruleKey
      ) {
        addIssue(
          context,
          ["ruleConditions", index, "groupKey"],
          "must reference a group in the same rule",
        );
      }
      if (row.conditionKind === "course") {
        if (
          row.requiredCourseCode === null ||
          row.courseRequirementMode === null
        ) {
          addIssue(
            context,
            ["ruleConditions", index],
            "course conditions require a course and completion mode",
          );
        }
      } else if (row.courseRequirementMode !== null) {
        addIssue(
          context,
          ["ruleConditions", index, "courseRequirementMode"],
          "is only valid for course conditions",
        );
      }
      if (
        row.conditionKind === "incompatible" &&
        row.requiredCourseCode === null
      ) {
        addIssue(
          context,
          ["ruleConditions", index, "requiredCourseCode"],
          "is required for an incompatibility",
        );
      }
      if (
        row.conditionKind === "admission" &&
        Number(row.requiredStructureCode !== null) +
          Number(row.freeText !== null) !==
          1
      ) {
        addIssue(
          context,
          ["ruleConditions", index],
          "admission requires one structure code or free-text requirement",
        );
      }
      conditions.set(row.key, row);
    });

    const memberPositions = new Map<string, Set<number>>();
    value.ruleConditionCourses.forEach((row, index) => {
      if (!conditions.has(row.conditionKey)) {
        addIssue(
          context,
          ["ruleConditionCourses", index, "conditionKey"],
          "must reference a saved condition",
        );
      }
      const positions =
        memberPositions.get(row.conditionKey) ?? new Set<number>();
      if (positions.has(row.position)) {
        addIssue(
          context,
          ["ruleConditionCourses", index, "position"],
          "must be unique within the condition",
        );
      }
      positions.add(row.position);
      memberPositions.set(row.conditionKey, positions);
    });
    value.ruleConditions.forEach((row, index) => {
      if (
        row.conditionKind === "course_set_units" &&
        !memberPositions.has(row.key)
      ) {
        addIssue(
          context,
          ["ruleConditions", index],
          "course-set conditions require at least one course",
        );
      }
    });

    const outcomePositions = new Set(
      value.learningOutcomes.map((row) => row.position),
    );
    const assessmentPositions = new Set(
      value.assessmentItems.map((row) => row.position),
    );
    const assessmentLinks = new Set<string>();
    value.assessmentOutcomes.forEach((row, index) => {
      const key = `${row.assessmentPosition}:${row.learningOutcomePosition}`;
      if (
        !assessmentPositions.has(row.assessmentPosition) ||
        !outcomePositions.has(row.learningOutcomePosition) ||
        assessmentLinks.has(key)
      ) {
        addIssue(
          context,
          ["assessmentOutcomes", index],
          "must be a unique link between saved positions",
        );
      }
      assessmentLinks.add(key);
    });
    value.ruleCourseReferences.forEach((row, index) => {
      if (!ruleKeys.has(row.ruleKey)) {
        addIssue(
          context,
          ["ruleCourseReferences", index, "ruleKey"],
          "must reference a saved rule",
        );
      }
    });
  });

export function parseCourseSnapshotProjection(
  value: unknown,
): CourseSnapshotProjectionData {
  const result = courseSnapshotProjectionSchema.safeParse(value);
  if (result.success) return result.data as CourseSnapshotProjectionData;
  const issue = result.error.issues[0];
  const path = issue?.path.length ? issue.path.join(".") : "projection";
  throw new TypeError(`${path}: ${issue?.message ?? "is invalid"}`);
}
