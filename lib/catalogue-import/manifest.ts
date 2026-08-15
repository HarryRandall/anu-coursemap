export type CatalogueDiagnostic = {
  code: string;
  severity: "warning" | "error";
  message: string;
  field?: string;
  sourceFragment?: string;
};

export type CatalogueManifestScope = {
  kind: "course_codes";
  courseCodes: string[];
};

export type CatalogueManifestSource = {
  name: string;
  kind: string;
  baseUrl: string;
};

export type CatalogueCourseRequisites = {
  observed: boolean;
  rawText: string | null;
  rawRequisiteText: string | null;
  rawIncompatibilityText: string | null;
  linkedCourseCodes: string[];
};

export type CatalogueCourse = {
  code: string | null;
  title: string | null;
  units: number | null;
  description: string | null;
  level: number | null;
  subject: string | null;
  subjectName?: string;
  school: string | null;
  academicCareer?: string;
  convener?: string;
  deliverySummary?: string;
  rich?: CatalogueCourseRichDetails;
  sourceUpdatedAt?: string;
  requisites: CatalogueCourseRequisites;
};

export type CatalogueCourseAssessment = {
  title: string;
  weight: number | null;
  outcomes: number[];
};

export type CatalogueCourseRichDetails = {
  introduction?: string;
  college?: string;
  areasOfInterest?: string[];
  coTaughtCourses?: string[];
  learningOutcomes?: string[];
  indicativeAssessment?: CatalogueCourseAssessment[];
  workload?: string;
  workloadHours?: number;
  feeBand?: number;
  domesticFee?: number;
  internationalFee?: number;
};

export type CatalogueAcademicPeriod = {
  calendarYear: number;
  code: string;
  name: string;
  shortName: string;
  startsOn: string;
  endsOn: string;
  sortOrder: number;
};

export type CatalogueOfferingSession = {
  periodCode: string;
  calendarYear: number;
  startsOn: string;
  endsOn: string;
  deliveryMode?: string;
  location?: string;
  classNumber?: string;
  lastEnrolmentDate?: string;
  censusDate?: string;
  classSummaryUrl?: string;
  sourceFragment?: string;
};

export type CatalogueCourseOffering = {
  deliveryMode?: string;
  location?: string;
  status?: "draft" | "published" | "cancelled";
  sessions: CatalogueOfferingSession[];
};

export type CatalogueCourseDocument = {
  entityKind: "course";
  externalKey: string;
  canonicalUrl: string;
  fetchedAt: string;
  contentSha256: string;
  httpEtag?: string;
  sourceLastModified?: string;
  course: CatalogueCourse;
  offeringObserved: boolean;
  periods: CatalogueAcademicPeriod[];
  offering?: CatalogueCourseOffering;
  diagnostics: CatalogueDiagnostic[];
  sourceFragment?: string;
};

export type CatalogueManifest = {
  schemaVersion: 1;
  parserVersion: string;
  catalogueYear: number;
  source: CatalogueManifestSource;
  scope: CatalogueManifestScope;
  documents: CatalogueCourseDocument[];
  diagnostics: CatalogueDiagnostic[];
};

export type CatalogueManifestValidationResult =
  { valid: true; issues: [] } | { valid: false; issues: string[] };

export class CatalogueManifestValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid catalogue manifest:\n- ${issues.join("\n- ")}`);
    this.name = "CatalogueManifestValidationError";
    this.issues = issues;
  }
}

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}$/;
const SUBJECT_CODE_PATTERN = /^[A-Z]{4}$/;
const CONTENT_SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DIAGNOSTIC_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isNonBlankString(value);
}

function isIsoInstant(value: unknown): value is string {
  if (!isNonBlankString(value)) return false;
  const milliseconds = Date.parse(value);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
  );
}

function isCalendarDate(value: unknown): value is string {
  if (!isNonBlankString(value) || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonBlankString(value)) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function validateDiagnostic(
  value: unknown,
  path: string,
  issues: string[],
): value is CatalogueDiagnostic {
  if (!isObject(value)) {
    issues.push(`${path} must be an object`);
    return false;
  }
  if (
    !isNonBlankString(value.code) ||
    !DIAGNOSTIC_CODE_PATTERN.test(value.code)
  ) {
    issues.push(`${path}.code must be an uppercase diagnostic code`);
  }
  if (value.severity !== "warning" && value.severity !== "error") {
    issues.push(`${path}.severity must be warning or error`);
  }
  if (!isNonBlankString(value.message)) {
    issues.push(`${path}.message must be a non-blank string`);
  }
  if (value.field !== undefined && !isNonBlankString(value.field)) {
    issues.push(`${path}.field must be a non-blank string when supplied`);
  }
  if (
    value.sourceFragment !== undefined &&
    !isNonBlankString(value.sourceFragment)
  ) {
    issues.push(
      `${path}.sourceFragment must be a non-blank string when supplied`,
    );
  }
  return true;
}

function validateDiagnostics(
  value: unknown,
  path: string,
  issues: string[],
): CatalogueDiagnostic[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }
  value.forEach((diagnostic, index) => {
    validateDiagnostic(diagnostic, `${path}[${index}]`, issues);
  });
  return value.filter(isObject) as CatalogueDiagnostic[];
}

function hasFieldError(diagnostics: CatalogueDiagnostic[], field: string) {
  return diagnostics.some(
    (diagnostic) =>
      diagnostic.severity === "error" && diagnostic.field === field,
  );
}

function validateNullableRequiredField(
  value: unknown,
  path: string,
  field: string,
  diagnostics: CatalogueDiagnostic[],
  issues: string[],
) {
  if (!isNullableString(value)) {
    issues.push(`${path} must be a non-blank string or null`);
  } else if (value === null && !hasFieldError(diagnostics, field)) {
    issues.push(`${path} is null without an error diagnostic for ${field}`);
  }
}

function validateCourseDocument(
  value: unknown,
  path: string,
  issues: string[],
  catalogueYear: number | null,
) {
  if (!isObject(value)) {
    issues.push(`${path} must be an object`);
    return;
  }

  if (value.entityKind !== "course") {
    issues.push(`${path}.entityKind must be course`);
  }
  if (
    !isNonBlankString(value.externalKey) ||
    !COURSE_CODE_PATTERN.test(value.externalKey)
  ) {
    issues.push(`${path}.externalKey must be an uppercase ANU course code`);
  }
  if (!isHttpUrl(value.canonicalUrl)) {
    issues.push(`${path}.canonicalUrl must be an HTTP or HTTPS URL`);
  }
  if (!isIsoInstant(value.fetchedAt)) {
    issues.push(`${path}.fetchedAt must be a canonical ISO instant`);
  }
  if (
    !isNonBlankString(value.contentSha256) ||
    !CONTENT_SHA256_PATTERN.test(value.contentSha256)
  ) {
    issues.push(`${path}.contentSha256 must be a lowercase SHA-256 digest`);
  }
  if (value.httpEtag !== undefined && !isNonBlankString(value.httpEtag)) {
    issues.push(`${path}.httpEtag must be non-blank when supplied`);
  }
  if (
    value.sourceLastModified !== undefined &&
    !isIsoInstant(value.sourceLastModified)
  ) {
    issues.push(`${path}.sourceLastModified must be a canonical ISO instant`);
  }
  if (typeof value.offeringObserved !== "boolean") {
    issues.push(`${path}.offeringObserved must be a boolean`);
  }

  const diagnostics = validateDiagnostics(
    value.diagnostics,
    `${path}.diagnostics`,
    issues,
  );
  if (!isObject(value.course)) {
    issues.push(`${path}.course must be an object`);
    return;
  }
  const course = value.course;

  for (const field of ["code", "title", "description", "subject", "school"]) {
    validateNullableRequiredField(
      course[field],
      `${path}.course.${field}`,
      `course.${field}`,
      diagnostics,
      issues,
    );
  }
  if (
    typeof course.subject === "string" &&
    !SUBJECT_CODE_PATTERN.test(course.subject)
  ) {
    issues.push(`${path}.course.subject must be a four-letter subject code`);
  }
  if (
    typeof course.code === "string" &&
    course.code !== value.externalKey &&
    !hasFieldError(diagnostics, "course.code")
  ) {
    issues.push(
      `${path}.course.code must match externalKey or have an error diagnostic`,
    );
  }

  if (course.units !== null && typeof course.units !== "number") {
    issues.push(`${path}.course.units must be a number or null`);
  } else if (
    typeof course.units === "number" &&
    (!Number.isFinite(course.units) ||
      course.units <= 0 ||
      course.units > 999.99 ||
      Number(course.units.toFixed(2)) !== course.units)
  ) {
    issues.push(
      `${path}.course.units must be finite, positive, at most 999.99 and have no more than two decimal places`,
    );
  } else if (
    course.units === null &&
    !hasFieldError(diagnostics, "course.units")
  ) {
    issues.push(`${path}.course.units is null without an error diagnostic`);
  }

  if (course.level !== null && !Number.isInteger(course.level)) {
    issues.push(`${path}.course.level must be an integer or null`);
  } else if (
    typeof course.level === "number" &&
    (course.level < 0 || course.level > 9999)
  ) {
    issues.push(`${path}.course.level must be between 0 and 9999`);
  } else if (
    course.level === null &&
    !hasFieldError(diagnostics, "course.level")
  ) {
    issues.push(`${path}.course.level is null without an error diagnostic`);
  }

  for (const field of [
    "subjectName",
    "academicCareer",
    "convener",
    "deliverySummary",
  ]) {
    if (course[field] !== undefined && !isNonBlankString(course[field])) {
      issues.push(`${path}.course.${field} must be non-blank when supplied`);
    }
  }
  if (
    course.sourceUpdatedAt !== undefined &&
    !isIsoInstant(course.sourceUpdatedAt)
  ) {
    issues.push(`${path}.course.sourceUpdatedAt must be an ISO instant`);
  }

  if (!isObject(course.requisites)) {
    issues.push(`${path}.course.requisites must be an object`);
  } else {
    if (typeof course.requisites.observed !== "boolean") {
      issues.push(`${path}.course.requisites.observed must be a boolean`);
    }
    for (const field of [
      "rawText",
      "rawRequisiteText",
      "rawIncompatibilityText",
    ]) {
      if (!isNullableString(course.requisites[field])) {
        issues.push(
          `${path}.course.requisites.${field} must be a non-blank string or null`,
        );
      }
    }
    if (!Array.isArray(course.requisites.linkedCourseCodes)) {
      issues.push(
        `${path}.course.requisites.linkedCourseCodes must be an array`,
      );
    } else {
      const seen = new Set<string>();
      course.requisites.linkedCourseCodes.forEach((code, index) => {
        if (typeof code !== "string" || !COURSE_CODE_PATTERN.test(code)) {
          issues.push(
            `${path}.course.requisites.linkedCourseCodes[${index}] must be an uppercase ANU course code`,
          );
        } else if (seen.has(code)) {
          issues.push(
            `${path}.course.requisites.linkedCourseCodes contains duplicate ${code}`,
          );
        }
        if (typeof code === "string") seen.add(code);
      });
    }
    if (
      course.requisites.observed === false &&
      (course.requisites.rawText !== null ||
        course.requisites.rawRequisiteText !== null ||
        course.requisites.rawIncompatibilityText !== null ||
        (Array.isArray(course.requisites.linkedCourseCodes) &&
          course.requisites.linkedCourseCodes.length > 0))
    ) {
      issues.push(
        `${path}.course.requisites cannot contain facts when observed is false`,
      );
    }
  }

  const periodKeys = new Set<string>();
  if (!Array.isArray(value.periods)) {
    issues.push(`${path}.periods must be an array`);
  } else {
    value.periods.forEach((period, index) => {
      const periodPath = `${path}.periods[${index}]`;
      if (!isObject(period)) {
        issues.push(`${periodPath} must be an object`);
        return;
      }
      if (!Number.isInteger(period.calendarYear)) {
        issues.push(`${periodPath}.calendarYear must be an integer`);
      } else if (
        catalogueYear !== null &&
        period.calendarYear !== catalogueYear
      ) {
        issues.push(
          `${periodPath}.calendarYear must match the manifest catalogueYear`,
        );
      }
      for (const field of ["code", "name", "shortName"]) {
        if (!isNonBlankString(period[field])) {
          issues.push(`${periodPath}.${field} must be a non-blank string`);
        }
      }
      if (!isCalendarDate(period.startsOn)) {
        issues.push(`${periodPath}.startsOn must be a valid YYYY-MM-DD date`);
      }
      if (!isCalendarDate(period.endsOn)) {
        issues.push(`${periodPath}.endsOn must be a valid YYYY-MM-DD date`);
      }
      if (
        isCalendarDate(period.startsOn) &&
        isCalendarDate(period.endsOn) &&
        period.endsOn < period.startsOn
      ) {
        issues.push(`${periodPath}.endsOn must not precede startsOn`);
      }
      if (
        typeof period.sortOrder !== "number" ||
        !Number.isInteger(period.sortOrder) ||
        period.sortOrder < 0
      ) {
        issues.push(`${periodPath}.sortOrder must be a non-negative integer`);
      }
      if (
        Number.isInteger(period.calendarYear) &&
        isNonBlankString(period.code)
      ) {
        const key = `${period.calendarYear}:${period.code}`;
        if (periodKeys.has(key)) {
          issues.push(`${path}.periods contains duplicate ${key}`);
        }
        periodKeys.add(key);
      }
    });
  }
  if (
    value.offeringObserved === false &&
    Array.isArray(value.periods) &&
    value.periods.length > 0
  ) {
    issues.push(`${path}.periods must be empty when offeringObserved is false`);
  }

  if (value.offering !== undefined) {
    if (value.offeringObserved === false) {
      issues.push(`${path}.offering requires offeringObserved to be true`);
    }
    if (!isObject(value.offering)) {
      issues.push(`${path}.offering must be an object when supplied`);
    } else if (!Array.isArray(value.offering.sessions)) {
      issues.push(`${path}.offering.sessions must be an array`);
    } else {
      for (const field of ["deliveryMode", "location"]) {
        if (
          value.offering[field] !== undefined &&
          !isNonBlankString(value.offering[field])
        ) {
          issues.push(
            `${path}.offering.${field} must be non-blank when supplied`,
          );
        }
      }
      if (
        value.offering.status !== undefined &&
        !["draft", "published", "cancelled"].includes(
          String(value.offering.status),
        )
      ) {
        issues.push(`${path}.offering.status is invalid`);
      }
      value.offering.sessions.forEach((session, index) => {
        const sessionPath = `${path}.offering.sessions[${index}]`;
        if (!isObject(session)) {
          issues.push(`${sessionPath} must be an object`);
          return;
        }
        if (!Number.isInteger(session.calendarYear)) {
          issues.push(`${sessionPath}.calendarYear must be an integer`);
        } else if (
          catalogueYear !== null &&
          session.calendarYear !== catalogueYear
        ) {
          issues.push(
            `${sessionPath}.calendarYear must match the manifest catalogueYear`,
          );
        }
        if (!isNonBlankString(session.periodCode)) {
          issues.push(`${sessionPath}.periodCode must be non-blank`);
        } else if (
          Number.isInteger(session.calendarYear) &&
          !periodKeys.has(`${session.calendarYear}:${session.periodCode}`)
        ) {
          issues.push(`${sessionPath} references an unknown period`);
        }
        if (!isCalendarDate(session.startsOn)) {
          issues.push(`${sessionPath}.startsOn must be a YYYY-MM-DD date`);
        }
        if (!isCalendarDate(session.endsOn)) {
          issues.push(`${sessionPath}.endsOn must be a YYYY-MM-DD date`);
        }
        if (
          isCalendarDate(session.startsOn) &&
          isCalendarDate(session.endsOn) &&
          session.endsOn < session.startsOn
        ) {
          issues.push(`${sessionPath}.endsOn must not precede startsOn`);
        }
        for (const field of [
          "deliveryMode",
          "location",
          "classNumber",
          "sourceFragment",
        ]) {
          if (
            session[field] !== undefined &&
            !isNonBlankString(session[field])
          ) {
            issues.push(
              `${sessionPath}.${field} must be non-blank when supplied`,
            );
          }
        }
        for (const field of ["lastEnrolmentDate", "censusDate"]) {
          if (session[field] !== undefined && !isCalendarDate(session[field])) {
            issues.push(`${sessionPath}.${field} must be a YYYY-MM-DD date`);
          }
        }
        if (
          session.classSummaryUrl !== undefined &&
          !isHttpUrl(session.classSummaryUrl)
        ) {
          issues.push(`${sessionPath}.classSummaryUrl must be an HTTP URL`);
        }
      });
    }
  }

  if (
    value.sourceFragment !== undefined &&
    !isNonBlankString(value.sourceFragment)
  ) {
    issues.push(`${path}.sourceFragment must be non-blank when supplied`);
  }
}

export function validateCatalogueManifest(
  value: unknown,
): CatalogueManifestValidationResult {
  const issues: string[] = [];
  if (!isObject(value)) {
    return { valid: false, issues: ["manifest must be an object"] };
  }

  if (value.schemaVersion !== 1) {
    issues.push("schemaVersion must be 1");
  }
  if (!isNonBlankString(value.parserVersion)) {
    issues.push("parserVersion must be a non-blank string");
  }
  const catalogueYear =
    typeof value.catalogueYear === "number" &&
    Number.isInteger(value.catalogueYear) &&
    value.catalogueYear >= 2000 &&
    value.catalogueYear <= 2200
      ? value.catalogueYear
      : null;
  if (
    !Number.isInteger(value.catalogueYear) ||
    Number(value.catalogueYear) < 2000 ||
    Number(value.catalogueYear) > 2200
  ) {
    issues.push("catalogueYear must be an integer between 2000 and 2200");
  }

  if (!isObject(value.source)) {
    issues.push("source must be an object");
  } else {
    for (const field of ["name", "kind"]) {
      if (!isNonBlankString(value.source[field])) {
        issues.push(`source.${field} must be a non-blank string`);
      }
    }
    if (!isHttpUrl(value.source.baseUrl)) {
      issues.push("source.baseUrl must be an HTTP or HTTPS URL");
    }
  }

  const scopedCodes = new Set<string>();
  if (!isObject(value.scope) || value.scope.kind !== "course_codes") {
    issues.push("scope must be a course_codes scope");
  } else if (!Array.isArray(value.scope.courseCodes)) {
    issues.push("scope.courseCodes must be an array");
  } else {
    value.scope.courseCodes.forEach((code, index) => {
      if (typeof code !== "string" || !COURSE_CODE_PATTERN.test(code)) {
        issues.push(
          `scope.courseCodes[${index}] must be an uppercase ANU course code`,
        );
      } else if (scopedCodes.has(code)) {
        issues.push(`scope.courseCodes contains duplicate ${code}`);
      }
      if (typeof code === "string") scopedCodes.add(code);
    });
  }

  const manifestDiagnostics = validateDiagnostics(
    value.diagnostics,
    "diagnostics",
    issues,
  );
  const documentKeys = new Set<string>();
  if (!Array.isArray(value.documents)) {
    issues.push("documents must be an array");
  } else {
    value.documents.forEach((document, index) => {
      const path = `documents[${index}]`;
      validateCourseDocument(document, path, issues, catalogueYear);
      if (!isObject(document) || !isNonBlankString(document.externalKey))
        return;
      if (!scopedCodes.has(document.externalKey)) {
        issues.push(`${path}.externalKey is outside the declared scope`);
      }
      if (documentKeys.has(document.externalKey)) {
        issues.push(`documents contains duplicate ${document.externalKey}`);
      }
      documentKeys.add(document.externalKey);
    });
  }

  for (const code of scopedCodes) {
    if (documentKeys.has(code)) continue;
    const field = `documents.${code}`;
    const explained = manifestDiagnostics.some(
      (diagnostic) =>
        diagnostic.severity === "error" && diagnostic.field === field,
    );
    if (!explained) {
      issues.push(
        `scope course ${code} has no document or top-level error diagnostic for ${field}`,
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues }
    : { valid: true, issues: [] };
}

export function parseCatalogueManifest(value: unknown): CatalogueManifest {
  const result = validateCatalogueManifest(value);
  if (!result.valid) throw new CatalogueManifestValidationError(result.issues);
  return value as CatalogueManifest;
}
