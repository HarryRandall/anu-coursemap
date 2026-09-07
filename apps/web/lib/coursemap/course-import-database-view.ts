export type CourseImportDatabaseTable = {
  name: string;
  rows: Array<Record<string, unknown>>;
};

type UnknownRecord = Record<string, unknown>;

const persistedTableNames: Record<string, string> = {
  fees: "course_fees",
  areasOfInterest: "course_areas_of_interest",
  relatedCourses: "course_related_courses",
  attributes: "course_attributes",
  unitOptions: "course_unit_options",
  offerings: "course_offerings",
  offeringSessions: "offering_sessions",
  learningOutcomes: "course_learning_outcomes",
  assessmentItems: "course_assessment_items",
  assessmentOutcomes: "course_assessment_outcomes",
  rules: "course_rules",
  ruleGroups: "course_rule_groups",
  ruleConditions: "course_rule_conditions",
  ruleConditionCourses: "course_rule_condition_courses",
  ruleCourseReferences: "course_rule_course_references",
  fieldEvidence: "course_snapshot_field_evidence",
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function snakeCase(value: string) {
  return value.replace(/([a-z\d])([A-Z])/gu, "$1_$2").toLowerCase();
}

function snakeCaseRow(value: UnknownRecord): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [snakeCase(key), item]),
  );
}

function reference(label: string) {
  return `<${label}>`;
}

function childRows(
  value: unknown,
  extra: Record<string, unknown> = {},
): Array<Record<string, unknown>> {
  return records(value).map((row) => ({ ...extra, ...snakeCaseRow(row) }));
}

/**
 * Converts the logical import projection into the table-shaped rows that the
 * persistence stage writes. Generated database identifiers are deliberately
 * represented by readable placeholders.
 */
export function projectedCourseDatabaseTables(
  value: unknown,
): CourseImportDatabaseTable[] {
  if (!isRecord(value) || !isRecord(value.snapshot)) return [];

  const courseCode =
    typeof value.courseCode === "string" ? value.courseCode : "course";
  const academicYear =
    typeof value.academicYear === "number" ? value.academicYear : "year";
  const snapshotReference = reference("candidate snapshot id");
  const academicYearReference = reference(`academic_years ${academicYear}`);
  const sourcePageReference = reference("source page id");
  const tables: CourseImportDatabaseTable[] = [
    {
      name: "courses",
      rows: [{ code: courseCode }],
    },
    {
      name: "course_years",
      rows: [
        {
          course_id: reference(`courses ${courseCode}`),
          academic_year_id: academicYearReference,
        },
      ],
    },
    {
      name: "course_snapshots",
      rows: [
        {
          course_year_id: reference(
            `course_years ${courseCode} ${academicYear}`,
          ),
          academic_year_id: academicYearReference,
          snapshot_number: reference("next snapshot number"),
          origin: "import",
          based_on_snapshot_id: reference(
            "current draft or published snapshot",
          ),
          source_page_id: sourcePageReference,
          projection_sha256:
            value.projectionSha256 ?? reference("projection hash"),
          schema_version: reference("run schema version"),
          validation_status: reference("validation result"),
          overall_confidence: reference("extraction confidence"),
          has_critical_uncertainty: reference("extraction review result"),
          ...snakeCaseRow(value.snapshot),
        },
      ],
    },
  ];

  const snapshotChildren: Array<[string, unknown]> = [
    ["course_unit_options", value.unitOptions],
    ["course_fees", value.fees],
    ["course_areas_of_interest", value.areasOfInterest],
    ["course_attributes", value.attributes],
    ["course_learning_outcomes", value.learningOutcomes],
    ["course_assessment_items", value.assessmentItems],
  ];
  for (const [name, rows] of snapshotChildren) {
    tables.push({
      name,
      rows: childRows(rows, { course_snapshot_id: snapshotReference }),
    });
  }

  tables.push({
    name: "course_related_courses",
    rows: records(value.relatedCourses).map((row) => ({
      course_snapshot_id: snapshotReference,
      position: row.position,
      relation_kind: row.relationKind,
      related_course_id: reference(
        `courses ${String(row.sourceCourseCode ?? "?")}`,
      ),
      source_course_code: row.sourceCourseCode,
      source_course_title: row.sourceCourseTitle,
      source_text: row.sourceText,
    })),
  });

  const courseOffering = isRecord(value.courseOffering)
    ? value.courseOffering
    : null;
  tables.push({
    name: "course_offerings",
    rows: courseOffering
      ? [
          {
            course_snapshot_id: snapshotReference,
            academic_year_id: academicYearReference,
            course_source_page_id: sourcePageReference,
            ...snakeCaseRow(courseOffering),
          },
        ]
      : [],
  });
  tables.push({
    name: "offering_sessions",
    rows: records(value.offeringSessions).map((row) => ({
      course_offering_id: reference("course offering id"),
      course_snapshot_id: snapshotReference,
      academic_year_id: academicYearReference,
      course_source_page_id: sourcePageReference,
      academic_period_id: reference(
        `academic period ${String(row.academicPeriodCode ?? "?")}`,
      ),
      academic_period_code: row.academicPeriodCode,
      academic_period_name: row.academicPeriodName,
      position: row.position,
      class_number: row.classNumber,
      starts_on: row.startsOn,
      enrol_closes_on: row.enrolClosesOn,
      census_on: row.censusOn,
      ends_on: row.endsOn,
      delivery_mode: row.deliveryMode,
      location: row.location,
      class_summary_url: row.classSummaryUrl,
      source_text: row.sourceText,
    })),
  });
  tables.push({
    name: "course_assessment_outcomes",
    rows: records(value.assessmentOutcomes).map((row) => ({
      course_snapshot_id: snapshotReference,
      assessment_item_id: reference(
        `assessment at position ${String(row.assessmentPosition ?? "?")}`,
      ),
      learning_outcome_id: reference(
        `learning outcome at position ${String(row.learningOutcomePosition ?? "?")}`,
      ),
    })),
  });
  tables.push({
    name: "course_rules",
    rows: records(value.rules).map((row) => ({
      course_snapshot_id: snapshotReference,
      academic_year_id: academicYearReference,
      course_source_page_id: sourcePageReference,
      rule_kind: row.ruleKind,
      hardness: row.hardness,
      source_text: row.sourceText,
      review_state: "review",
      confidence: reference("extraction confidence"),
    })),
  });
  tables.push({
    name: "course_rule_groups",
    rows: records(value.ruleGroups).map((row) => ({
      course_rule_id: reference(`rule ${String(row.ruleKey ?? "?")}`),
      course_snapshot_id: snapshotReference,
      projection_key: row.key,
      parent_group_id:
        row.parentGroupKey === null
          ? null
          : reference(`group ${String(row.parentGroupKey ?? "?")}`),
      operator: row.operator,
      minimum_count: row.minimumCount,
      position: row.position,
    })),
  });
  tables.push({
    name: "course_rule_conditions",
    rows: records(value.ruleConditions).map((row) => ({
      course_rule_id: reference(`rule ${String(row.ruleKey ?? "?")}`),
      course_snapshot_id: snapshotReference,
      group_id: reference(`group ${String(row.groupKey ?? "?")}`),
      projection_key: row.key,
      condition_kind: row.conditionKind,
      required_course_id:
        row.requiredCourseCode === null
          ? null
          : reference(`courses ${String(row.requiredCourseCode ?? "?")}`),
      minimum_units: row.minimumUnits,
      minimum_mark: row.minimumMark,
      subject_code: row.subjectCode,
      minimum_course_level: row.minimumCourseLevel,
      maximum_course_level: row.maximumCourseLevel,
      free_text: row.freeText,
      minimum_gpa: row.minimumGpa,
      minimum_year: row.minimumYear,
      minimum_wam: row.minimumWam,
      course_requirement_mode: row.courseRequirementMode,
      hardness: row.hardness,
      source_text: row.sourceText,
      confidence: reference("extraction confidence"),
      review_state: "review",
      position: row.position,
    })),
  });
  tables.push({
    name: "course_rule_condition_courses",
    rows: records(value.ruleConditionCourses).map((row) => ({
      condition_id: reference(`condition ${String(row.conditionKey ?? "?")}`),
      course_snapshot_id: snapshotReference,
      position: row.position,
      referenced_course_id: reference(
        `courses ${String(row.sourceCourseCode ?? "?")}`,
      ),
      source_course_code: row.sourceCourseCode,
      source_text: row.sourceText,
    })),
  });
  tables.push({
    name: "course_rule_course_references",
    rows: records(value.ruleCourseReferences).map((row) => ({
      course_rule_id: reference(`rule ${String(row.ruleKey ?? "?")}`),
      course_snapshot_id: snapshotReference,
      referenced_course_id: reference(
        `courses ${String(row.referencedCourseCode ?? "?")}`,
      ),
      source_text: row.sourceText,
      confidence: reference("extraction confidence"),
      review_state: "review",
    })),
  });

  return tables;
}

/** Returns the exact rows already saved for a candidate snapshot. */
export function persistedCourseDatabaseTables({
  snapshot,
  relationalData,
}: {
  snapshot: unknown;
  relationalData: unknown;
}): CourseImportDatabaseTable[] {
  const tables: CourseImportDatabaseTable[] = [];
  if (isRecord(snapshot)) {
    tables.push({ name: "course_snapshots", rows: [snapshot] });
  }
  if (!isRecord(relationalData)) return tables;

  for (const [key, value] of Object.entries(relationalData)) {
    const name = persistedTableNames[key];
    if (!name) continue;
    tables.push({ name, rows: records(value) });
  }
  return tables;
}
