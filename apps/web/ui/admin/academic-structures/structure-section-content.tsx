"use client";
import type { AdminStructureReviewRecord } from "@/lib/coursemap/admin-catalogue";
import { type StructureEditorSection } from "@/ui/admin/academic-structures/manual-snapshot-editor";
import { Row } from "@/ui/admin/academic-structures/structure-review-fields";

export const detailSections: { key: StructureEditorSection; label: string }[] =
  [
    { key: "details", label: "Overview" },
    { key: "summary", label: "Course information" },
    { key: "sections", label: "Content" },
    { key: "outcomes", label: "Learning outcomes" },
    { key: "fees", label: "Fees" },
    { key: "relationships", label: "Related programmes and plans" },
  ];
export function StructureSectionContent({
  record,
  section,
}: {
  record: AdminStructureReviewRecord;
  section: StructureEditorSection;
}) {
  const projection = record.projection;
  switch (section) {
    case "details":
      return (
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Row label="Name" value={record.name} />
          <Row label="Code" value={record.code} />
          <Row label="Units" value={record.units} />
          <Row label="College" value={projection.snapshot.college} />
          <div className="sm:col-span-2">
            <Row
              label="Introduction"
              value={projection.snapshot.introduction}
            />
            <Row label="Description" value={record.description} />
          </div>
        </dl>
      );
    case "summary":
      return (
        <dl>
          {projection.summaryFields.map((field) => (
            <Row
              key={`${field.fieldKey}:${field.valuePosition}`}
              label={field.label}
              value={field.fieldValue}
            />
          ))}
        </dl>
      );
    case "sections":
      return (
        <div className="space-y-5">
          {projection.sections.map((item) => (
            <section key={item.sectionKey}>
              <h3 className="mb-2 text-sm font-semibold">{item.heading}</h3>
              <p className="text-sm leading-7 whitespace-pre-wrap">
                {item.markdown}
              </p>
            </section>
          ))}
        </div>
      );
    case "outcomes":
      return (
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-7">
          {projection.learningOutcomes.map((item) => (
            <li key={item.position}>{item.outcomeText}</li>
          ))}
        </ol>
      );
    case "fees":
      return (
        <dl>
          {projection.fees.map((item) => (
            <Row
              key={item.position}
              label={item.sourceLabel ?? item.audience.replaceAll("_", " ")}
              value={
                item.amount === null
                  ? item.sourceText
                  : `${item.currency ?? "AUD"} ${item.amount.toLocaleString("en-AU")} (${item.basis})`
              }
            />
          ))}
        </dl>
      );
    case "relationships":
      return (
        <ul className="space-y-3 text-sm">
          {projection.relationships.map((item) => (
            <li key={item.position}>
              <span className="font-medium">{item.targetCode}</span>
              {item.targetTitle ? ` · ${item.targetTitle}` : ""}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}
