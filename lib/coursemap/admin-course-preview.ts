import type { AdminCourseYearRecord } from "@/lib/coursemap/admin-course-year";
import { accentFor } from "@/lib/coursemap/course-accent";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import { parseRequisiteSummary } from "@/lib/coursemap/requisite-summary";
import {
  prerequisiteCodesFromSnapshotProjection,
  prerequisiteEdgesWithSnapshotFallback,
} from "@/lib/coursemap/snapshot-prerequisite-codes";

type PublishedPrerequisite = Pick<CourseDetails, "code" | "prerequisiteEdges">;

export function toStudentPreviewCourseYear(
  record: AdminCourseYearRecord,
  publishedPrerequisites: readonly PublishedPrerequisite[] = [],
): CourseDetails | null {
  const projection = record.projection;
  if (!projection) return null;
  const prerequisiteRules = projection.rules.filter(
    (rule) => rule.ruleKind === "prerequisite",
  );
  const incompatibilityRules = projection.rules.filter(
    (rule) => rule.ruleKind === "incompatibility",
  );
  const prerequisiteText =
    prerequisiteRules
      .map((rule) => rule.sourceText.trim())
      .filter(Boolean)
      .join("\n\n") || "No prerequisites listed.";
  const incompatibilityText = incompatibilityRules
    .map((rule) => rule.sourceText.trim())
    .filter(Boolean)
    .join("\n\n");
  const prerequisiteCodes = prerequisiteCodesFromSnapshotProjection(
    projection,
  ).filter((code) => code !== record.code);
  const prerequisiteEdges = prerequisiteEdgesWithSnapshotFallback({
    courseCode: record.code,
    fallbackDetails: Object.fromEntries(
      publishedPrerequisites.map((course) => [
        course.code.toUpperCase(),
        {
          isAvailable: true,
          prerequisiteEdges: course.prerequisiteEdges,
        },
      ]),
    ),
    projection,
    storedEdges: [],
  });
  const sessions = [
    ...new Set(
      projection.offeringSessions.map((session) => session.academicPeriodName),
    ),
  ];
  const delivery =
    projection.offeringSessions.find((session) => session.deliveryMode)
      ?.deliveryMode ??
    projection.snapshot.deliverySummary ??
    "Not listed";
  const publicationStatus =
    record.publishedSnapshotId === record.currentSnapshotId
      ? "published"
      : "draft";
  const confidence = record.snapshot?.overall_confidence ?? 0;
  const reviewState = record.snapshot?.has_critical_uncertainty
    ? "review"
    : "verified";
  const snapshot = projection.snapshot;
  const unitValue: CourseDetails["unitValue"] = (() => {
    switch (snapshot.unitValueKind) {
      case "fixed":
        if (snapshot.units === null) {
          throw new Error("A fixed-unit snapshot has no unit value.");
        }
        return { kind: "fixed", units: snapshot.units };
      case "range":
        if (snapshot.minimumUnits === null || snapshot.maximumUnits === null) {
          throw new Error("A unit-range snapshot has incomplete bounds.");
        }
        return {
          kind: "range",
          maximumUnits: snapshot.maximumUnits,
          minimumUnits: snapshot.minimumUnits,
        };
      case "variable":
      case "unknown":
        return {
          kind: snapshot.unitValueKind,
          options: projection.unitOptions.map((option) => ({
            label: option.label,
            units: option.units,
          })),
        };
    }
  })();
  const assessmentOutcomes = new Map<number, number[]>();
  for (const link of projection.assessmentOutcomes) {
    const positions = assessmentOutcomes.get(link.assessmentPosition) ?? [];
    positions.push(link.learningOutcomePosition);
    assessmentOutcomes.set(link.assessmentPosition, positions);
  }

  return {
    academicCareer: snapshot.academicCareer,
    accent: accentFor(record.code),
    areasOfInterest: projection.areasOfInterest.map((area) => area.name),
    assessments: projection.assessmentItems.map((assessment) => ({
      dueText: assessment.dueText,
      hurdle: assessment.hurdle,
      learningOutcomePositions:
        assessmentOutcomes.get(assessment.position)?.sort((a, b) => a - b) ??
        [],
      position: assessment.position,
      title: assessment.title,
      weight: assessment.weight,
    })),
    attributes: projection.attributes.map((attribute) => ({
      kind: attribute.attributeKind,
      value: attribute.value,
    })),
    code: record.code,
    college: snapshot.college,
    name: snapshot.title,
    year: record.year,
    units: snapshot.units ?? snapshot.minimumUnits ?? 0,
    unitValue,
    eftsl: snapshot.eftsl,
    level: snapshot.level,
    subject: snapshot.subjectName ?? snapshot.subjectCode,
    subjectName: snapshot.subjectName,
    school: snapshot.school ?? "Not listed",
    convener: snapshot.convenerText ?? "Not listed",
    sessions,
    offerings: projection.offeringSessions.map((session) => ({
      calendarYear: session.calendarYear,
      censusOn: session.censusOn,
      classNumber: session.classNumber,
      classSummaryUrl: session.classSummaryUrl,
      deliveryMode: session.deliveryMode,
      endsOn: session.endsOn,
      enrolClosesOn: session.enrolClosesOn,
      location: session.location,
      periodCode: session.academicPeriodCode,
      periodName: session.academicPeriodName,
      startsOn: session.startsOn,
    })),
    offeringStatus: snapshot.offeringStatus,
    delivery,
    introduction: snapshot.introduction,
    description:
      snapshot.description ??
      snapshot.introduction ??
      "No description is recorded.",
    workloadText: snapshot.workloadText,
    workloadHours: snapshot.workloadHours,
    inherentRequirements: snapshot.inherentRequirements,
    prescribedTexts: snapshot.prescribedTexts,
    fees: projection.fees.map((fee) => ({
      amount: fee.amount,
      audience: fee.audience,
      basis: fee.basis,
      currency: fee.currency,
      feeType: fee.feeType,
      feeYear: fee.feeYear,
      sourceLabel: fee.sourceLabel,
      sourceText: fee.sourceText,
      studentContributionBand: fee.studentContributionBand,
    })),
    learningOutcomes: projection.learningOutcomes.map((outcome) => ({
      body: outcome.body,
      position: outcome.position,
    })),
    relatedCourses: projection.relatedCourses.map((related) => ({
      code: related.sourceCourseCode,
      kind: related.relationKind,
      sourceText: related.sourceText,
      title: related.sourceCourseTitle,
    })),
    prerequisiteText,
    assumedKnowledgeText: projection.rules
      .filter((rule) => rule.ruleKind === "assumed_knowledge")
      .map((rule) => rule.sourceText.trim())
      .filter(Boolean)
      .join("\n\n"),
    corequisiteText: projection.rules
      .filter((rule) => rule.ruleKind === "corequisite")
      .map((rule) => rule.sourceText.trim())
      .filter(Boolean)
      .join("\n\n"),
    permissionText: projection.rules
      .filter((rule) => rule.ruleKind === "permission")
      .map((rule) => rule.sourceText.trim())
      .filter(Boolean)
      .join("\n\n"),
    prerequisiteCodes,
    prerequisiteEdges,
    prerequisiteRule: prerequisiteRules[0]
      ? {
          confidence,
          expression: parseRequisiteSummary(prerequisiteRules[0].sourceText),
          hardness:
            prerequisiteRules[0].hardness === "advisory" ? "advisory" : "hard",
          relationalExpression: null,
          reviewState,
          sourceText: prerequisiteRules[0].sourceText,
        }
      : null,
    availableCourseCodes: [
      ...new Set([
        ...prerequisiteEdges.flatMap((edge) => [
          ...(edge.fromIsAvailable ? [edge.from] : []),
          ...(edge.toIsAvailable ? [edge.to] : []),
        ]),
        ...(publicationStatus === "published" ? [record.code] : []),
      ]),
    ].sort(),
    incompatibilityText,
    sourceUrl:
      record.sourcePage?.canonical_url ??
      `https://programsandcourses.anu.edu.au/${record.year}/course/${record.code}`,
    sourceUpdatedAt: projection.snapshot.sourceUpdatedAt,
    publicationStatus,
    reviewState,
  };
}
