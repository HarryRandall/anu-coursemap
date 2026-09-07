import type { AcademicStructureManualSnapshotProjection as Projection } from "../structure-import/manual-snapshot.ts";

type Section =
  | "details"
  | "summary"
  | "sections"
  | "outcomes"
  | "fees"
  | "relationships"
  | "requirements"
  | "evidence";

const overviewFields = [
  ["title", "Name"],
  ["acronym", "Acronym"],
  ["shortName", "Short name"],
  ["totalUnits", "Units"],
  ["durationYears", "Duration in years"],
  ["academicCareer", "Academic career"],
  ["college", "College"],
  ["deliveryMode", "Delivery"],
  ["studyAs", "Study options"],
  ["introduction", "Introduction"],
  ["description", "Description"],
] as const;

// The caller must supply the original import, never the currently edited draft.
export function structureSectionSourceTexts(
  original: Projection | null,
  section: Section,
): string[] {
  if (!original) return [];
  let texts: string[];
  switch (section) {
    case "details":
      texts = overviewFields.flatMap(([key, label]) => {
        const evidence = original.evidence
          .filter((item) => item.fieldKey.replace(/^snapshot\./, "") === key)
          .map((item) => item.evidenceExcerpt);
        if (evidence.length) return evidence;
        const value = original.snapshot[key];
        return value === null || value === "" ? [] : [`${label}: ${value}`];
      });
      break;
    case "requirements":
      texts = [
        ...original.requirementGroups.map((item) => item.sourceText),
        ...original.unmodelledRequirements.map((item) => item.sourceText),
      ];
      break;
    case "summary":
      texts = original.summaryFields.map(
        (item) => item.sourceText || `${item.label}: ${item.fieldValue}`,
      );
      break;
    case "sections":
      texts = original.sections.map((item) => item.sourceText || item.markdown);
      break;
    case "outcomes":
      texts = original.learningOutcomes.map(
        (item) => item.sourceText || item.outcomeText,
      );
      break;
    case "fees":
      texts = original.fees.map((item) => item.sourceText);
      break;
    case "relationships":
      texts = original.relationships.map((item) => item.sourceText);
      break;
    case "evidence":
      texts = original.evidence.map((item) => item.evidenceExcerpt);
      break;
  }
  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
}
