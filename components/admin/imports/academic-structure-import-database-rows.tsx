import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ImportDatabaseRowTable } from "@/components/admin/imports/import-database-row-table";
import type { AcademicStructureImportRelationalData } from "@/lib/coursemap/admin-academic-structure-imports";

const ACADEMIC_STRUCTURE_DESTINATION_TABLES = [
  "academic_structures",
  "academic_structure_years",
  "academic_structure_snapshots",
  "academic_structure_snapshot_sections",
  "academic_structure_summary_fields",
  "academic_structure_learning_outcomes",
  "academic_structure_fees",
  "academic_structure_snapshot_relationships",
  "academic_structure_requirement_groups",
  "academic_structure_requirement_conditions",
  "academic_structure_requirement_options",
  "academic_structure_unmodelled_requirements",
  "academic_structure_snapshot_evidence",
  "academic_structure_review_items",
] as const satisfies readonly (keyof AcademicStructureImportRelationalData)[];

export type AcademicStructureImportDatabaseTable = {
  name: string;
  rows: unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rows(value: unknown, key: string) {
  if (!isRecord(value) || !Array.isArray(value[key])) return [];
  return value[key] as unknown[];
}

function field(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

function mapRecords(
  value: unknown,
  key: string,
  mapper: (row: Record<string, unknown>, index: number) => unknown,
) {
  return rows(value, key)
    .filter(isRecord)
    .map((row, index) => mapper(row, index));
}

/**
 * Convert the worker's database projection artefact into the concrete public
 * table names and snake-case rows an administrator will review. Generated
 * identifiers stay explicit placeholders until persistence assigns them.
 */
export function projectedAcademicStructureDatabaseTables(
  value: unknown,
): AcademicStructureImportDatabaseTable[] {
  if (!isRecord(value)) return [];
  const snapshot = isRecord(value.snapshot) ? value.snapshot : {};
  const projectionHash = field(value, "projectionSha256");
  const structureCode = field(value, "structureCode");
  const structureKind = field(value, "structureKind");
  const academicYear = field(value, "academicYear");
  const snapshotReference = "<academic_structure_snapshots.id>";

  const mapped: Record<string, unknown[]> = {
    academic_structures: [
      {
        id: "<generated>",
        public_id: "<generated UUID>",
        kind: structureKind,
        code: structureCode,
      },
    ],
    academic_structure_years: [
      {
        id: "<generated>",
        structure_id: "<academic_structures.id>",
        academic_year_id: `<academic_years.id for ${String(academicYear ?? "selected year")}>`,
        draft_snapshot_id: null,
        published_snapshot_id: null,
      },
    ],
    academic_structure_snapshots: [
      {
        id: "<generated>",
        structure_year_id: "<academic_structure_years.id>",
        academic_year_id: `<academic_years.id for ${String(academicYear ?? "selected year")}>`,
        source_page_id: "<academic_structure_source_pages.id>",
        import_target_id: "<academic_structure_import_targets.id>",
        parent_snapshot_id: "<baseline draft snapshot id or null>",
        origin: "imported",
        schema_version: field(value, "schemaVersion"),
        semantic_hash: projectionHash,
        name: field(snapshot, "title"),
        acronym: field(snapshot, "acronym"),
        short_name: field(snapshot, "shortName"),
        introduction: field(snapshot, "introduction"),
        description: field(snapshot, "description"),
        units: field(snapshot, "totalUnits"),
        duration_years: field(snapshot, "durationYears"),
        academic_career: field(snapshot, "academicCareer"),
        college: field(snapshot, "college"),
        mode_of_delivery: field(snapshot, "deliveryMode"),
        selection_rank: field(snapshot, "selectionRank"),
        atar: field(snapshot, "atar"),
        can_combine: field(snapshot, "canCombine"),
        can_combine_vertical: field(snapshot, "canCombineVertical"),
        study_as: field(snapshot, "studyAs"),
        contact_text: field(snapshot, "contactText"),
        overall_confidence: field(snapshot, "overallConfidence"),
      },
    ],
    academic_structure_snapshot_sections: mapRecords(
      value,
      "sections",
      (row) => ({
        snapshot_id: snapshotReference,
        section_key: row.sectionKey,
        heading: row.heading,
        markdown: row.markdown,
        source_text: row.sourceText,
        source_locator: row.sourceLocator,
        position: row.position,
      }),
    ),
    academic_structure_summary_fields: mapRecords(
      value,
      "summaryFields",
      (row) => ({
        snapshot_id: snapshotReference,
        position: row.position,
        field_key: row.fieldKey,
        label: row.label,
        value_position: row.valuePosition,
        field_value: row.fieldValue,
        source_text: row.sourceText,
      }),
    ),
    academic_structure_learning_outcomes: mapRecords(
      value,
      "learningOutcomes",
      (row) => ({
        snapshot_id: snapshotReference,
        position: row.position,
        outcome_text: row.outcomeText,
        source_text: row.sourceText,
        source_locator: row.sourceLocator,
      }),
    ),
    academic_structure_fees: mapRecords(value, "fees", (row) => ({
      snapshot_id: snapshotReference,
      position: row.position,
      fee_year: row.feeYear,
      audience: row.audience,
      fee_type: row.feeType,
      amount: row.amount,
      currency: row.currency,
      basis: row.basis,
      source_label: row.sourceLabel,
      source_text: row.sourceText,
      source_locator: row.sourceLocator,
    })),
    academic_structure_snapshot_relationships: mapRecords(
      value,
      "relationships",
      (row) => ({
        snapshot_id: snapshotReference,
        position: row.position,
        relationship_kind: row.relationshipKind,
        target_kind: row.targetKind,
        target_code: row.targetCode,
        target_title: row.targetTitle,
        source_text: row.sourceText,
        source_locator: row.sourceLocator,
      }),
    ),
    academic_structure_requirement_groups: mapRecords(
      value,
      "requirementGroups",
      (row) => ({
        id: `<group:${String(row.key)}>`,
        snapshot_id: snapshotReference,
        parent_group_id:
          row.parentGroupKey === null
            ? null
            : `<group:${String(row.parentGroupKey)}>`,
        group_key: row.key,
        title: row.title,
        description: row.description,
        operator: row.operator,
        minimum_count: row.minimumCount,
        minimum_units: row.minimumUnits,
        maximum_units: row.maximumUnits,
        source_text: row.sourceText,
        source_locator: row.sourceLocator,
        position: row.position,
      }),
    ),
    academic_structure_requirement_conditions: mapRecords(
      value,
      "requirementConditions",
      (row) => ({
        id: `<condition:${String(row.key)}>`,
        snapshot_id: snapshotReference,
        requirement_group_id: `<group:${String(row.groupKey)}>`,
        position: row.position,
        projection_key: row.key,
        condition_kind: row.conditionKind,
        structure_kind: row.structureKind,
        subject_code: row.subjectCode,
        minimum_level: row.minimumLevel,
        maximum_level: row.maximumLevel,
        minimum_units: row.minimumUnits,
        maximum_units: row.maximumUnits,
        minimum_courses: row.minimumCourses,
        tag: row.tag,
        free_text: row.freeText,
        source_text: row.sourceText,
        source_locator: row.sourceLocator,
      }),
    ),
    academic_structure_requirement_options: mapRecords(
      value,
      "requirementOptions",
      (row) => ({
        snapshot_id: snapshotReference,
        requirement_condition_id: `<condition:${String(row.conditionKey)}>`,
        position: row.position,
        option_kind: row.optionKind,
        option_code: row.optionCode,
        structure_kind: row.structureKind,
      }),
    ),
    academic_structure_unmodelled_requirements: mapRecords(
      value,
      "unmodelledRequirements",
      (row) => ({
        snapshot_id: snapshotReference,
        position: row.position,
        source_text: row.sourceText,
        source_locator: row.sourceLocator,
      }),
    ),
    academic_structure_snapshot_evidence: mapRecords(
      value,
      "evidence",
      (row) => ({
        snapshot_id: snapshotReference,
        position: row.position,
        field_key: row.fieldKey,
        source_locator: row.sourceLocator,
        evidence_excerpt: row.evidenceExcerpt,
        confidence: row.confidence,
        method: row.method,
      }),
    ),
    academic_structure_review_items: mapRecords(
      value,
      "reviewItems",
      (row) => ({
        id: "<generated UUID>",
        target_id: "<academic_structure_import_targets.id>",
        snapshot_id: snapshotReference,
        field_key: row.fieldKey,
        item_kind: row.kind,
        severity: row.severity,
        message: row.message,
        source_text: null,
        status: "open",
      }),
    ),
  };

  return ACADEMIC_STRUCTURE_DESTINATION_TABLES.map((name) => ({
    name,
    rows: mapped[name] ?? [],
  }));
}

export function persistedAcademicStructureDatabaseTables(
  data: AcademicStructureImportRelationalData,
): AcademicStructureImportDatabaseTable[] {
  return ACADEMIC_STRUCTURE_DESTINATION_TABLES.map((name) => ({
    name,
    rows: data[name],
  }));
}

export function AcademicStructureImportDatabaseRows({
  emptyLabel = "No rows",
  tables,
}: {
  emptyLabel?: string;
  tables: AcademicStructureImportDatabaseTable[];
}) {
  return (
    <div className="space-y-3">
      {tables.map((table) => (
        <Card className="overflow-hidden" key={table.name}>
          <CardHeader
            action={
              <Badge tone={table.rows.length ? "neutral" : "info"}>
                {table.rows.length || emptyLabel}
              </Badge>
            }
            title={<span className="font-mono text-sm">{table.name}</span>}
          />
          {table.rows.length ? (
            <ImportDatabaseRowTable rows={table.rows} tableName={table.name} />
          ) : (
            <p className="border-t border-zinc-200 px-5 py-4 text-xs text-zinc-500">
              This candidate does not write a row to this table.
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
