const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}[A-Z]?$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readCourseCode(value: unknown) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return COURSE_CODE_PATTERN.test(code) ? code : null;
}

/**
 * Derive prerequisite identities only from one immutable snapshot projection.
 * This deliberately does not inspect a current course year or published graph.
 */
export function prerequisiteCodesFromSnapshotProjection(projection: unknown) {
  if (!isRecord(projection)) return [];

  const codes = new Set<string>();
  for (const value of readArray(projection.prerequisiteCodes)) {
    const code = readCourseCode(value);
    if (code) codes.add(code);
  }

  const prerequisiteConditionKeys = new Set<string>();
  for (const value of readArray(projection.ruleConditions)) {
    if (!isRecord(value) || value.ruleKey !== "prerequisite") continue;
    if (typeof value.key === "string" && value.key.trim()) {
      prerequisiteConditionKeys.add(value.key);
    }
    const code = readCourseCode(value.requiredCourseCode);
    if (code) codes.add(code);
  }

  for (const value of readArray(projection.ruleConditionCourses)) {
    if (
      !isRecord(value) ||
      typeof value.conditionKey !== "string" ||
      !prerequisiteConditionKeys.has(value.conditionKey)
    ) {
      continue;
    }
    const code = readCourseCode(value.sourceCourseCode);
    if (code) codes.add(code);
  }

  for (const value of readArray(projection.ruleCourseReferences)) {
    if (!isRecord(value) || value.ruleKey !== "prerequisite") continue;
    const code = readCourseCode(value.referencedCourseCode);
    if (code) codes.add(code);
  }

  return [...codes].sort();
}
