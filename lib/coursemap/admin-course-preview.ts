import type { AdminCourseReviewRecord } from "@/lib/coursemap/admin-catalogue";
import { accentFor } from "@/lib/coursemap/catalogue-accent";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";
import { parseRequisiteSummary } from "@/lib/coursemap/requisite-summary";

const COURSE_CODE_PATTERN = /\b[A-Z]{4}\d{4}\b/gu;

function reviewState(value: string): CatalogueCourse["reviewState"] {
  return value === "verified"
    ? "verified"
    : value === "review"
      ? "review"
      : "automatic";
}

function ruleText(record: AdminCourseReviewRecord, kind: string) {
  return record.rules
    .filter((rule) => rule.kind === kind)
    .map((rule) => rule.sourceText.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Builds the student-facing course shape from a draft admin record so the
 * review screen can render the real student view rather than an imitation of
 * it. Referenced courses are marked available only when they are published,
 * which is exactly what a student would see today.
 */
export function toStudentPreviewCourse(
  record: AdminCourseReviewRecord,
  publishedCourseCodes: readonly string[] = [],
): CatalogueCourse {
  const prerequisiteRule =
    record.rules.find((rule) => rule.kind === "prerequisite") ?? null;
  const prerequisiteText =
    ruleText(record, "prerequisite") || "No prerequisites listed.";
  const incompatibilityText = ruleText(record, "incompatibility");
  const published = new Set(
    publishedCourseCodes.map((code) => code.toUpperCase()),
  );
  const prerequisiteCodes = [
    ...new Set(prerequisiteText.match(COURSE_CODE_PATTERN) ?? []),
  ].filter((code) => code !== record.code);
  const sessions = [
    ...new Set(
      record.offerings.flatMap((offering) =>
        offering.sessions.map((session) => session.period),
      ),
    ),
  ].sort();
  const delivery =
    record.offerings
      .flatMap((offering) => [
        offering.deliveryMode,
        ...offering.sessions.map((session) => session.deliveryMode),
      ])
      .find((mode): mode is string => Boolean(mode)) ??
    record.deliverySummary ??
    "Not listed";

  return {
    accent: accentFor(record.code),
    code: record.code,
    name: record.title,
    year: record.year,
    units: record.units,
    level: record.level,
    subject: record.subject,
    school: record.school,
    convener: record.convener ?? "Not listed",
    sessions,
    delivery,
    description: record.description,
    prerequisiteText,
    prerequisiteCodes,
    prerequisiteEdges: prerequisiteCodes.map((from) => ({
      from,
      to: record.code,
      fromIsAvailable: published.has(from),
      toIsAvailable: record.publicationStatus === "published",
    })),
    prerequisiteRule: prerequisiteRule
      ? {
          confidence: prerequisiteRule.confidence,
          expression: parseRequisiteSummary(prerequisiteRule.sourceText),
          reviewState: reviewState(prerequisiteRule.reviewState),
          sourceText: prerequisiteRule.sourceText,
        }
      : null,
    availableCourseCodes: [
      ...new Set([
        ...prerequisiteCodes.filter((code) => published.has(code)),
        ...(record.publicationStatus === "published" ? [record.code] : []),
      ]),
    ].sort(),
    incompatibilityText,
    sourceUrl:
      record.source?.canonicalUrl ??
      `https://programsandcourses.anu.edu.au/${record.year}/course/${record.code}`,
    sourceUpdatedAt: record.sourceUpdatedAt,
    publicationStatus:
      record.publicationStatus === "published" ? "published" : "draft",
    reviewState: reviewState(record.reviewState),
  };
}
