import { stableStringify } from "./canonical.ts";
import type { CourseSnapshotProjectionData } from "./project-snapshot.ts";

export const COURSE_MODEL_EVALUATION_SCHEMA_VERSION =
  "course-model-evaluation.v1" as const;

type ProjectionSection =
  | "identityCore"
  | "descriptive"
  | "fees"
  | "offerings"
  | "learningAndAssessment"
  | "requisites";

type ProjectionLeafMap = Map<string, string>;

export type CourseModelRuleScore = {
  expectedCount: number;
  actualCount: number;
  matchedCount: number;
  precision: number;
  recall: number;
  f1: number;
};

export type CourseModelContributionScore = {
  requiredPathCount: number;
  proposedPathCount: number;
  correctRequiredPathCount: number;
  correctProposedPathCount: number;
  precision: number;
  recall: number;
  f1: number;
};

export type CourseModelProjectionEvaluation = {
  schemaVersion: typeof COURSE_MODEL_EVALUATION_SCHEMA_VERSION;
  courseCode: string;
  academicYear: number;
  exactProjectionMatch: boolean;
  weightedFieldScore: number;
  sectionScores: Record<ProjectionSection, number>;
  contribution: CourseModelContributionScore;
  rules: {
    all: CourseModelRuleScore;
    prerequisiteAndCorequisite: CourseModelRuleScore;
    incompatibility: CourseModelRuleScore;
  };
  criticalMismatches: string[];
};

const SECTION_WEIGHTS: Record<ProjectionSection, number> = {
  identityCore: 0.1,
  descriptive: 0.15,
  fees: 0.1,
  offerings: 0.15,
  learningAndAssessment: 0.15,
  requisites: 0.35,
};

const MISSING = Symbol("missing projection leaf");

function cleanString(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\u200b/gu, "")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalisedLeaf(value: unknown) {
  return stableStringify(
    typeof value === "string" ? cleanString(value) : value,
  );
}

function flattenValue(value: unknown, path: string, output: ProjectionLeafMap) {
  if (Array.isArray(value)) {
    if (value.length === 0) output.set(`${path}[]`, "[]");
    value.forEach((item, index) =>
      flattenValue(item, `${path}[${index}]`, output),
    );
    return;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    if (entries.length === 0) output.set(path, "{}");
    entries.forEach(([key, item]) =>
      flattenValue(item, path ? `${path}.${key}` : key, output),
    );
    return;
  }

  output.set(path, normalisedLeaf(value));
}

function leafMap(value: unknown) {
  const output: ProjectionLeafMap = new Map();
  flattenValue(value, "", output);
  return output;
}

function leafValue(map: ProjectionLeafMap, path: string) {
  return map.has(path) ? map.get(path)! : MISSING;
}

function sameLeaf(
  left: string | typeof MISSING,
  right: string | typeof MISSING,
) {
  return left === right;
}

function mapAccuracy(actual: ProjectionLeafMap, expected: ProjectionLeafMap) {
  const paths = new Set([...actual.keys(), ...expected.keys()]);
  if (paths.size === 0) return 1;
  let matches = 0;
  paths.forEach((path) => {
    if (sameLeaf(leafValue(actual, path), leafValue(expected, path))) {
      matches += 1;
    }
  });
  return matches / paths.size;
}

function projectionSections(projection: CourseSnapshotProjectionData) {
  const {
    title,
    unitValueKind,
    units,
    minimumUnits,
    maximumUnits,
    eftsl,
    level,
    subjectCode,
    academicCareer,
    offeringStatus,
    ...descriptionFields
  } = projection.snapshot;

  return {
    identityCore: {
      courseCode: projection.courseCode,
      academicYear: projection.academicYear,
      title,
      unitValueKind,
      units,
      minimumUnits,
      maximumUnits,
      eftsl,
      level,
      subjectCode,
      academicCareer,
      offeringStatus,
      unitOptions: projection.unitOptions,
    },
    descriptive: {
      ...descriptionFields,
      areasOfInterest: projection.areasOfInterest,
      attributes: projection.attributes,
      relatedCourses: projection.relatedCourses,
    },
    fees: projection.fees,
    offerings: {
      courseOffering: projection.courseOffering,
      offeringSessions: projection.offeringSessions,
    },
    learningAndAssessment: {
      learningOutcomes: projection.learningOutcomes,
      assessmentItems: projection.assessmentItems,
      assessmentOutcomes: projection.assessmentOutcomes,
    },
    requisites: {
      rules: projection.rules,
      ruleGroups: projection.ruleGroups,
      ruleConditions: projection.ruleConditions,
      ruleConditionCourses: projection.ruleConditionCourses,
      ruleCourseReferences: projection.ruleCourseReferences,
    },
  } satisfies Record<ProjectionSection, unknown>;
}

type RuleKey = CourseSnapshotProjectionData["rules"][number]["ruleKind"];
type RuleOperator =
  CourseSnapshotProjectionData["ruleGroups"][number]["operator"];
type CanonicalRuleChild =
  | { type: "condition"; value: Record<string, unknown> }
  | { type: "group"; value: CanonicalRuleExpression };
type CanonicalRuleExpression =
  | { invalidGroup: true }
  | {
      operator: RuleOperator;
      minimumCount: number | null;
      children: CanonicalRuleChild[];
    };

function semanticRuleTokens(
  projection: CourseSnapshotProjectionData,
  includedRuleKeys?: ReadonlySet<RuleKey>,
) {
  const include = (ruleKey: RuleKey) =>
    includedRuleKeys === undefined || includedRuleKeys.has(ruleKey);
  const rawTokens: string[] = [];
  const groupsByKey = new Map(
    projection.ruleGroups.map((group) => [group.key, group]),
  );
  const childGroups = new Map<string, string[]>();
  projection.ruleGroups.forEach((group) => {
    if (group.parentGroupKey === null) return;
    const children = childGroups.get(group.parentGroupKey) ?? [];
    children.push(group.key);
    childGroups.set(group.parentGroupKey, children);
  });
  const conditionsByGroup = new Map<
    string,
    CourseSnapshotProjectionData["ruleConditions"]
  >();
  projection.ruleConditions.forEach((condition) => {
    const conditions = conditionsByGroup.get(condition.groupKey) ?? [];
    conditions.push(condition);
    conditionsByGroup.set(condition.groupKey, conditions);
  });
  const courseMembersByCondition = new Map<string, string[]>();
  projection.ruleConditionCourses.forEach((member) => {
    const members = courseMembersByCondition.get(member.conditionKey) ?? [];
    members.push(member.sourceCourseCode);
    courseMembersByCondition.set(member.conditionKey, members);
  });

  const canonicalCondition = (
    condition: CourseSnapshotProjectionData["ruleConditions"][number],
  ) => ({
    conditionKind: condition.conditionKind,
    requiredCourseCode: condition.requiredCourseCode,
    requiredStructureCode: condition.requiredStructureCode,
    minimumUnits: condition.minimumUnits,
    minimumMark: condition.minimumMark,
    subjectCode: condition.subjectCode,
    minimumCourseLevel: condition.minimumCourseLevel,
    maximumCourseLevel: condition.maximumCourseLevel,
    minimumGpa: condition.minimumGpa,
    minimumYear: condition.minimumYear,
    minimumWam: condition.minimumWam,
    freeText: condition.freeText,
    courseRequirementMode: condition.courseRequirementMode,
    hardness: condition.hardness,
    courseMembers: [
      ...(courseMembersByCondition.get(condition.key) ?? []),
    ].sort((left, right) => left.localeCompare(right)),
  });

  const canonicalGroup = (
    key: string,
    ancestors = new Set<string>(),
  ): CanonicalRuleExpression => {
    const group = groupsByKey.get(key);
    if (!group || ancestors.has(key)) {
      return { invalidGroup: true };
    }
    const nextAncestors = new Set(ancestors).add(key);
    const children: CanonicalRuleChild[] = (
      conditionsByGroup.get(key) ?? []
    ).map((condition) => ({
      type: "condition",
      value: canonicalCondition(condition),
    }));
    (childGroups.get(key) ?? []).forEach((childKey) => {
      const value = canonicalGroup(childKey, nextAncestors);
      const associativeOperator =
        group.operator === "all_of" || group.operator === "any_of";
      if (
        associativeOperator &&
        group.minimumCount === null &&
        "operator" in value &&
        value.operator === group.operator &&
        value.minimumCount === null
      ) {
        children.push(...value.children);
      } else {
        children.push({ type: "group", value });
      }
    });
    children.sort((left, right) =>
      stableStringify(left).localeCompare(stableStringify(right)),
    );
    return {
      operator: group.operator,
      minimumCount: group.minimumCount,
      children,
    };
  };

  projection.rules.forEach((rule) => {
    if (!include(rule.ruleKind)) return;
    rawTokens.push(
      stableStringify({
        type: "rule",
        ruleKey: rule.ruleKind,
        hardness: rule.hardness,
      }),
    );
    const ruleGroups = projection.ruleGroups.filter(
      (group) => group.ruleKey === rule.ruleKind,
    );
    const roots = ruleGroups
      .filter(({ parentGroupKey }) => parentGroupKey === null)
      .map(({ key }) => canonicalGroup(key))
      .sort((left, right) =>
        stableStringify(left).localeCompare(stableStringify(right)),
      );
    rawTokens.push(
      stableStringify({ type: "tree", ruleKey: rule.ruleKind, roots }),
    );
  });
  projection.ruleCourseReferences.forEach((reference) => {
    if (!include(reference.ruleKey)) return;
    rawTokens.push(
      stableStringify({
        type: "reference",
        ruleKey: reference.ruleKey,
        referencedCourseCode: reference.referencedCourseCode,
      }),
    );
  });

  // Preserve duplicate semantics without letting generated keys distinguish
  // otherwise identical trees.
  const occurrences = new Map<string, number>();
  return new Set(
    rawTokens.map((token) => {
      const occurrence = (occurrences.get(token) ?? 0) + 1;
      occurrences.set(token, occurrence);
      return stableStringify({ token, occurrence });
    }),
  );
}

function setScore(actual: ReadonlySet<string>, expected: ReadonlySet<string>) {
  let matchedCount = 0;
  actual.forEach((value) => {
    if (expected.has(value)) matchedCount += 1;
  });
  const precision =
    actual.size === 0
      ? expected.size === 0
        ? 1
        : 0
      : matchedCount / actual.size;
  const recall =
    expected.size === 0
      ? actual.size === 0
        ? 1
        : 0
      : matchedCount / expected.size;
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return {
    expectedCount: expected.size,
    actualCount: actual.size,
    matchedCount,
    precision,
    recall,
    f1,
  } satisfies CourseModelRuleScore;
}

function contributionScore({
  deterministic,
  candidate,
  reference,
}: {
  deterministic: ProjectionLeafMap;
  candidate: ProjectionLeafMap;
  reference: ProjectionLeafMap;
}) {
  const paths = new Set([
    ...deterministic.keys(),
    ...candidate.keys(),
    ...reference.keys(),
  ]);
  let requiredPathCount = 0;
  let proposedPathCount = 0;
  let correctRequiredPathCount = 0;
  let correctProposedPathCount = 0;

  paths.forEach((path) => {
    const baseline = leafValue(deterministic, path);
    const actual = leafValue(candidate, path);
    const expected = leafValue(reference, path);
    const required = !sameLeaf(baseline, expected);
    const proposed = !sameLeaf(baseline, actual);
    const correct = sameLeaf(actual, expected);
    if (required) {
      requiredPathCount += 1;
      if (correct) correctRequiredPathCount += 1;
    }
    if (proposed) {
      proposedPathCount += 1;
      if (correct) correctProposedPathCount += 1;
    }
  });

  const precision =
    proposedPathCount === 0
      ? requiredPathCount === 0
        ? 1
        : 0
      : correctProposedPathCount / proposedPathCount;
  const recall =
    requiredPathCount === 0
      ? proposedPathCount === 0
        ? 1
        : 0
      : correctRequiredPathCount / requiredPathCount;
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return {
    requiredPathCount,
    proposedPathCount,
    correctRequiredPathCount,
    correctProposedPathCount,
    precision,
    recall,
    f1,
  } satisfies CourseModelContributionScore;
}

const CRITICAL_PATH =
  /^(?:courseCode|academicYear|snapshot\.(?:unitValueKind|units|minimumUnits|maximumUnits|eftsl|level|subjectCode|offeringStatus)|fees\[\d+\]\.(?:feeYear|amount|currency|basis|studentContributionBand)|offeringSessions\[\d+\]\.(?:calendarYear|academicPeriodCode|classNumber|startsOn|enrolClosesOn|censusOn|endsOn))$/u;

function criticalProjectionMismatches(
  candidate: CourseSnapshotProjectionData,
  reference: CourseSnapshotProjectionData,
  ruleScore: CourseModelRuleScore,
) {
  const actual = leafMap(candidate);
  const expected = leafMap(reference);
  const paths = new Set([...actual.keys(), ...expected.keys()]);
  const mismatches = [...paths]
    .filter((path) => CRITICAL_PATH.test(path))
    .filter(
      (path) => !sameLeaf(leafValue(actual, path), leafValue(expected, path)),
    );
  if (ruleScore.f1 < 1) mismatches.push("requisites.semantic");

  const expectedReferences = new Set(
    reference.ruleCourseReferences.map(
      ({ ruleKey, referencedCourseCode }) =>
        `${ruleKey}:${referencedCourseCode}`,
    ),
  );
  candidate.ruleCourseReferences.forEach(
    ({ ruleKey, referencedCourseCode }) => {
      const referenceKey = `${ruleKey}:${referencedCourseCode}`;
      if (!expectedReferences.has(referenceKey)) {
        mismatches.push(`requisites.unexpectedReference.${referenceKey}`);
      }
    },
  );
  return [...new Set(mismatches)].sort((left, right) =>
    left.localeCompare(right),
  );
}

function semanticProjection(value: CourseSnapshotProjectionData) {
  const projection = structuredClone(value);
  projection.snapshot.sourceUpdatedAt = null;
  const sections = projectionSections(projection);
  return {
    ...sections,
    requisites: {
      semanticRuleTokens: [...semanticRuleTokens(projection)].sort(
        (left, right) => left.localeCompare(right),
      ),
    },
  };
}

export function evaluateCourseModelProjection({
  deterministic,
  candidate,
  reference,
}: {
  deterministic: CourseSnapshotProjectionData;
  candidate: CourseSnapshotProjectionData;
  reference: CourseSnapshotProjectionData;
}): CourseModelProjectionEvaluation {
  if (
    deterministic.courseCode !== reference.courseCode ||
    candidate.courseCode !== reference.courseCode ||
    deterministic.academicYear !== reference.academicYear ||
    candidate.academicYear !== reference.academicYear
  ) {
    throw new TypeError(
      "Model evaluation projections must describe the same course and academic year.",
    );
  }

  const candidateSections = projectionSections(candidate);
  const referenceSections = projectionSections(reference);
  const sectionScores = Object.fromEntries(
    (Object.keys(SECTION_WEIGHTS) as ProjectionSection[]).map((section) => [
      section,
      mapAccuracy(
        leafMap(candidateSections[section]),
        leafMap(referenceSections[section]),
      ),
    ]),
  ) as Record<ProjectionSection, number>;

  const allRules = setScore(
    semanticRuleTokens(candidate),
    semanticRuleTokens(reference),
  );
  const prerequisiteAndCorequisite = new Set<RuleKey>([
    "prerequisite",
    "corequisite",
  ]);
  const incompatibility = new Set<RuleKey>(["incompatibility"]);
  const rules = {
    all: allRules,
    prerequisiteAndCorequisite: setScore(
      semanticRuleTokens(candidate, prerequisiteAndCorequisite),
      semanticRuleTokens(reference, prerequisiteAndCorequisite),
    ),
    incompatibility: setScore(
      semanticRuleTokens(candidate, incompatibility),
      semanticRuleTokens(reference, incompatibility),
    ),
  };

  // Generated keys, source wording and child order are not rule semantics.
  sectionScores.requisites = allRules.f1;
  const weightedFieldScore = (
    Object.keys(SECTION_WEIGHTS) as ProjectionSection[]
  ).reduce(
    (total, section) =>
      total + sectionScores[section] * SECTION_WEIGHTS[section],
    0,
  );

  const semanticCandidate = semanticProjection(candidate);
  const semanticReference = semanticProjection(reference);
  return {
    schemaVersion: COURSE_MODEL_EVALUATION_SCHEMA_VERSION,
    courseCode: reference.courseCode,
    academicYear: reference.academicYear,
    exactProjectionMatch:
      stableStringify(semanticCandidate) === stableStringify(semanticReference),
    weightedFieldScore,
    sectionScores,
    contribution: contributionScore({
      deterministic: leafMap(semanticProjection(deterministic)),
      candidate: leafMap(semanticCandidate),
      reference: leafMap(semanticReference),
    }),
    rules,
    criticalMismatches: criticalProjectionMismatches(
      candidate,
      reference,
      allRules,
    ),
  };
}

export function aggregateCourseModelEvaluations(
  evaluations: readonly CourseModelProjectionEvaluation[],
) {
  if (evaluations.length === 0) {
    return {
      caseCount: 0,
      exactProjectionMatchCount: 0,
      meanWeightedFieldScore: 0,
      meanContributionPrecision: 0,
      meanContributionRecall: 0,
      meanContributionF1: 0,
      criticalMismatchCount: 0,
      requisiteRuleMicroF1: 0,
      incompatibilityRuleMicroF1: 0,
    };
  }

  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const microF1 = (
    select: (
      evaluation: CourseModelProjectionEvaluation,
    ) => CourseModelRuleScore,
  ) => {
    const matched = evaluations.reduce(
      (sum, evaluation) => sum + select(evaluation).matchedCount,
      0,
    );
    const actual = evaluations.reduce(
      (sum, evaluation) => sum + select(evaluation).actualCount,
      0,
    );
    const expected = evaluations.reduce(
      (sum, evaluation) => sum + select(evaluation).expectedCount,
      0,
    );
    const precision =
      actual === 0 ? (expected === 0 ? 1 : 0) : matched / actual;
    const recall = expected === 0 ? (actual === 0 ? 1 : 0) : matched / expected;
    return precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  };

  return {
    caseCount: evaluations.length,
    exactProjectionMatchCount: evaluations.filter(
      ({ exactProjectionMatch }) => exactProjectionMatch,
    ).length,
    meanWeightedFieldScore: mean(
      evaluations.map(({ weightedFieldScore }) => weightedFieldScore),
    ),
    meanContributionPrecision: mean(
      evaluations.map(({ contribution }) => contribution.precision),
    ),
    meanContributionRecall: mean(
      evaluations.map(({ contribution }) => contribution.recall),
    ),
    meanContributionF1: mean(
      evaluations.map(({ contribution }) => contribution.f1),
    ),
    criticalMismatchCount: evaluations.reduce(
      (sum, { criticalMismatches }) => sum + criticalMismatches.length,
      0,
    ),
    requisiteRuleMicroF1: microF1(
      ({ rules }) => rules.prerequisiteAndCorequisite,
    ),
    incompatibilityRuleMicroF1: microF1(({ rules }) => rules.incompatibility),
  };
}
