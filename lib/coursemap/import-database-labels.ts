const tableLabels: Record<string, string> = {
  courses: "Courses",
  course_years: "Course years",
  course_snapshots: "Course details",
  course_unit_options: "Unit options",
  course_fees: "Fees",
  course_areas_of_interest: "Areas of interest",
  course_related_courses: "Related courses",
  course_attributes: "Attributes",
  course_offerings: "Offerings",
  offering_sessions: "Teaching sessions",
  course_learning_outcomes: "Learning outcomes",
  course_assessment_items: "Assessment",
  course_assessment_outcomes: "Assessment outcomes",
  course_rules: "Requisites",
  course_rule_groups: "Requisite groups",
  course_rule_conditions: "Requisite conditions",
  course_rule_condition_options: "Requisite options",
  course_snapshot_evidence: "Source evidence",
  course_snapshot_field_evidence: "Source evidence",
  course_rule_course_references: "Referenced courses",
  course_rule_condition_courses: "Condition courses",
  academic_structures: "Majors, minors and programmes",
  academic_structure_years: "Catalogue years",
  academic_structure_snapshots: "Details",
  academic_structure_snapshot_sections: "Content sections",
  academic_structure_summary_fields: "Summary fields",
  academic_structure_learning_outcomes: "Learning outcomes",
  academic_structure_fees: "Fees",
  academic_structure_snapshot_relationships:
    "Related programmes and structures",
  academic_structure_requirement_groups: "Requirement groups",
  academic_structure_requirement_conditions: "Requirement conditions",
  academic_structure_requirement_options: "Requirement options",
  academic_structure_unmodelled_requirements: "Additional requirements",
  academic_structure_snapshot_evidence: "Source evidence",
  academic_structure_review_items: "Review issues",
};

const fieldLabels: Record<string, string> = {
  id: "ID",
  projection_sha256: "Projection fingerprint",
  semantic_hash: "Content fingerprint",
  eftsl: "Full-time study load",
  atar: "ATAR",
};

/** Labels never replace the original keys in the JSON inspection view. */
export function importDatabaseFieldLabel(key: string): string {
  if (fieldLabels[key]) return fieldLabels[key];
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ");
  return (words.charAt(0).toUpperCase() + words.slice(1)).replace(
    /\bid\b/gi,
    "ID",
  );
}

export function importDatabaseTableLabel(name: string): string {
  return tableLabels[name] ?? importDatabaseFieldLabel(name);
}

export function filterImportDatabaseTables<
  T extends { name: string; rows: unknown[] },
>(tables: T[], query: string, showEmpty: boolean): T[] {
  const search = query.trim().toLowerCase();
  return tables.filter(
    (table) =>
      (showEmpty || table.rows.length > 0) &&
      `${table.name} ${importDatabaseTableLabel(table.name)}`
        .toLowerCase()
        .includes(search),
  );
}
