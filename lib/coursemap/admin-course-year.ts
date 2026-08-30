import "server-only";

import type { CourseSnapshotProjectionData } from "@/lib/course-import/project-snapshot";
import type { CourseImportArtifact } from "@/lib/coursemap/admin-course-imports";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SnapshotRow = Database["public"]["Tables"]["course_snapshots"]["Row"];
type SourcePageRow = Database["public"]["Tables"]["course_source_pages"]["Row"];
type ImportStageRow =
  Database["public"]["Tables"]["course_import_stages"]["Row"];
type ExtractionRow = Database["public"]["Tables"]["course_extractions"]["Row"];
type FieldEvidenceRow =
  Database["public"]["Tables"]["course_snapshot_field_evidence"]["Row"];
type RuleGroupRow = Database["public"]["Tables"]["course_rule_groups"]["Row"];
type RuleConditionRow =
  Database["public"]["Tables"]["course_rule_conditions"]["Row"];
type ReviewItemRow = Database["public"]["Tables"]["course_review_items"]["Row"];

const PUBLIC_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}[A-Z]?$/u;
const RULE_ORDER = [
  "prerequisite",
  "corequisite",
  "incompatibility",
  "permission",
  "assumed_knowledge",
];

export type AdminCourseYearOption = {
  courseYearId: number;
  draftSnapshotId: number | null;
  lifecycleStatus: string;
  publishedSnapshotId: number | null;
  year: number;
};

export type AdminCourseSnapshotOption = {
  createdAt: string;
  id: number;
  origin: string;
  sealedAt: string | null;
  snapshotNumber: number;
};

export type AdminCourseYearRecord = {
  artifacts: CourseImportArtifact[];
  activeSnapshotId: number | null;
  availableYears: AdminCourseYearOption[];
  blockingReviewItems: ReviewItemRow[];
  code: string;
  courseId: number;
  courseYearId: number;
  currentSnapshotId: number | null;
  draftSnapshotId: number | null;
  evidence: FieldEvidenceRow[];
  importTarget: {
    extractions: ExtractionRow[];
    runId: string;
    stages: ImportStageRow[];
    targetId: string;
  } | null;
  lifecycleStatus: string;
  projection: CourseSnapshotProjectionData | null;
  publicId: string;
  publishedProjection: CourseSnapshotProjectionData | null;
  publishedSnapshotId: number | null;
  snapshot: SnapshotRow | null;
  sourcePage: SourcePageRow | null;
  snapshotHistory: AdminCourseSnapshotOption[];
  year: number;
};

function requiredProjectionKey(
  value: string | null | undefined,
  entity: string,
) {
  if (typeof value === "string" && value.trim()) return value;
  throw new Error(`${entity} has no canonical projection key.`);
}

function requiredNativeText(value: string | null, field: string) {
  if (value !== null) return value;
  throw new Error(`${field} is missing from a native course snapshot.`);
}

function requiredNativeNumber(value: number | null, field: string) {
  if (value !== null) return value;
  throw new Error(`${field} is missing from a native course snapshot.`);
}

function ruleKind(value: string) {
  if (
    value === "prerequisite" ||
    value === "corequisite" ||
    value === "incompatibility" ||
    value === "permission" ||
    value === "assumed_knowledge"
  ) {
    return value;
  }
  throw new Error(`Course snapshot has invalid rule kind '${value}'.`);
}

function unitValueKind(
  value: string,
): CourseSnapshotProjectionData["snapshot"]["unitValueKind"] {
  if (value === "range" || value === "variable" || value === "unknown") {
    return value;
  }
  if (value === "fixed") return value;
  throw new Error(`Course snapshot has invalid unit value kind '${value}'.`);
}

function academicCareer(
  value: string | null,
): CourseSnapshotProjectionData["snapshot"]["academicCareer"] {
  if (value === null) return null;
  if (
    value === "UGRD" ||
    value === "PGRD" ||
    value === "RSCH" ||
    value === "OTHER"
  ) {
    return value;
  }
  throw new Error(`Course snapshot has invalid academic career '${value}'.`);
}

function ruleHardness(
  value: string | null,
): CourseSnapshotProjectionData["rules"][number]["hardness"] {
  if (value === "hard" || value === "advisory") return value;
  throw new Error("Course rule condition has invalid hardness.");
}

function courseRequirementMode(
  value: string | null,
): CourseSnapshotProjectionData["ruleConditions"][number]["courseRequirementMode"] {
  if (
    value === null ||
    value === "completed" ||
    value === "completed_or_concurrent"
  ) {
    return value;
  }
  throw new Error("Course rule condition has invalid completion mode.");
}

function offeringStatus(
  value: string,
): CourseSnapshotProjectionData["snapshot"]["offeringStatus"] {
  if (value === "offered" || value === "not_offered" || value === "unknown") {
    return value;
  }
  throw new Error(`Course snapshot has invalid offering status '${value}'.`);
}

function groupOperator(
  value: string,
): CourseSnapshotProjectionData["ruleGroups"][number]["operator"] {
  if (value === "all_of" || value === "any_of" || value === "at_least") {
    return value;
  }
  throw new Error(`Course snapshot has invalid rule operator '${value}'.`);
}

function conditionKind(
  value: string,
): CourseSnapshotProjectionData["ruleConditions"][number]["conditionKind"] {
  if (
    value === "course" ||
    value === "incompatible" ||
    value === "units_total" ||
    value === "subject_units" ||
    value === "level_units" ||
    value === "course_set_units" ||
    value === "year_standing" ||
    value === "permission" ||
    value === "admission" ||
    value === "gpa" ||
    value === "wam" ||
    value === "other"
  ) {
    return value;
  }
  throw new Error(`Course snapshot has invalid condition kind '${value}'.`);
}

export async function loadCourseSnapshotProjection(
  snapshot: SnapshotRow,
  courseCode: string,
  year: number,
): Promise<CourseSnapshotProjectionData> {
  const supabase = await createClient();
  const [
    unitOptionsResult,
    feesResult,
    areasResult,
    attributesResult,
    relatedResult,
    offeringsResult,
    sessionsResult,
    outcomesResult,
    assessmentsResult,
    assessmentOutcomesResult,
    rulesResult,
    groupsResult,
    conditionsResult,
    conditionCoursesResult,
    referencesResult,
  ] = await Promise.all([
    supabase
      .from("course_unit_options")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_fees")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_areas_of_interest")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_attributes")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_related_courses")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_offerings")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("id"),
    supabase
      .from("offering_sessions")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_learning_outcomes")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_assessment_items")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_assessment_outcomes")
      .select("*")
      .eq("course_snapshot_id", snapshot.id),
    supabase
      .from("course_rules")
      .select("*")
      .eq("course_snapshot_id", snapshot.id),
    supabase
      .from("course_rule_groups")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_rule_conditions")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_rule_condition_courses")
      .select("*")
      .eq("course_snapshot_id", snapshot.id)
      .order("position"),
    supabase
      .from("course_rule_course_references")
      .select("*")
      .eq("course_snapshot_id", snapshot.id),
  ]);
  const results = [
    unitOptionsResult,
    feesResult,
    areasResult,
    attributesResult,
    relatedResult,
    offeringsResult,
    sessionsResult,
    outcomesResult,
    assessmentsResult,
    assessmentOutcomesResult,
    rulesResult,
    groupsResult,
    conditionsResult,
    conditionCoursesResult,
    referencesResult,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  const rules = (rulesResult.data ?? [])
    .map((row) => {
      const key = ruleKind(row.rule_kind);
      return {
        id: row.id,
        key,
        ruleKind: key,
        hardness: ruleHardness(row.hardness),
        sourceText: row.source_text,
      } as const;
    })
    .sort(
      (left, right) =>
        RULE_ORDER.indexOf(left.ruleKind) - RULE_ORDER.indexOf(right.ruleKind),
    );
  const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
  const rawGroups = (groupsResult.data ?? []) as RuleGroupRow[];
  const groupById = new Map(rawGroups.map((group) => [group.id, group]));
  const computedGroupKeys = new Map<number, string>();

  function groupKey(group: RuleGroupRow): string {
    const existing = computedGroupKeys.get(group.id);
    if (existing) return existing;
    const rule = ruleById.get(group.course_rule_id);
    if (!rule) throw new Error("A stored course rule group has no rule.");
    const key = requiredProjectionKey(
      group.projection_key,
      `Course rule group ${group.id}`,
    );
    computedGroupKeys.set(group.id, key);
    return key;
  }

  const groupProjection = rawGroups
    .map((group) => {
      const rule = ruleById.get(group.course_rule_id);
      if (!rule) throw new Error("A stored course rule group has no rule.");
      return {
        key: groupKey(group),
        ruleKey: rule.key,
        parentGroupKey:
          group.parent_group_id === null
            ? null
            : groupKey(groupById.get(group.parent_group_id)!),
        operator: groupOperator(group.operator),
        minimumCount: group.minimum_count,
        position: group.position,
      } as const;
    })
    .sort(
      (left, right) =>
        RULE_ORDER.indexOf(left.ruleKey) - RULE_ORDER.indexOf(right.ruleKey) ||
        left.key.localeCompare(right.key),
    );

  const rawConditions = (conditionsResult.data ?? []) as RuleConditionRow[];
  const conditionProjection = rawConditions
    .map((condition) => {
      const rule = ruleById.get(condition.course_rule_id);
      const group = groupById.get(condition.group_id);
      if (!rule || !group) {
        throw new Error("A stored course rule condition has no rule group.");
      }
      const storedGroupKey = groupKey(group);
      return {
        id: condition.id,
        key: requiredProjectionKey(
          condition.projection_key,
          `Course rule condition ${condition.id}`,
        ),
        ruleKey: rule.key,
        groupKey: storedGroupKey,
        position: condition.position,
        conditionKind: condition.condition_kind,
        requiredCourseId: condition.required_course_id,
        requiredStructureId: condition.required_structure_id,
        minimumUnits: condition.minimum_units,
        minimumMark: condition.minimum_mark,
        subjectCode: condition.subject_code,
        minimumCourseLevel: condition.minimum_course_level,
        maximumCourseLevel: condition.maximum_course_level,
        minimumGpa: condition.minimum_gpa,
        minimumYear: condition.minimum_year,
        minimumWam: condition.minimum_wam,
        freeText: condition.free_text,
        courseRequirementMode: condition.course_requirement_mode,
        hardness: ruleHardness(condition.hardness),
        sourceText: requiredNativeText(
          condition.source_text,
          `Course rule condition ${condition.id} source text`,
        ),
      };
    })
    .sort(
      (left, right) =>
        RULE_ORDER.indexOf(left.ruleKey) - RULE_ORDER.indexOf(right.ruleKey) ||
        left.key.localeCompare(right.key),
    );
  const conditionById = new Map(
    conditionProjection.map((condition) => [condition.id, condition]),
  );

  const referencedCourseIds = [
    ...conditionProjection.flatMap((condition) =>
      condition.requiredCourseId === null ? [] : [condition.requiredCourseId],
    ),
    ...(referencesResult.data ?? []).map(
      (reference) => reference.referenced_course_id,
    ),
  ];
  const { data: referencedCourses, error: referencedCoursesError } =
    referencedCourseIds.length
      ? await supabase
          .from("courses")
          .select("id,code")
          .in("id", [...new Set(referencedCourseIds)])
      : { data: [], error: null };
  if (referencedCoursesError) throw referencedCoursesError;
  const courseCodeById = new Map(
    (referencedCourses ?? []).map((course) => [course.id, course.code]),
  );
  const requiredStructureIds = [
    ...new Set(
      conditionProjection.flatMap((condition) =>
        condition.requiredStructureId === null
          ? []
          : [condition.requiredStructureId],
      ),
    ),
  ];
  const { data: requiredStructures, error: requiredStructuresError } =
    requiredStructureIds.length
      ? await supabase
          .from("academic_structures")
          .select("id,code")
          .in("id", requiredStructureIds)
      : { data: [], error: null };
  if (requiredStructuresError) throw requiredStructuresError;
  const structureCodeById = new Map(
    (requiredStructures ?? []).map((structure) => [
      structure.id,
      structure.code,
    ]),
  );

  const outcomePositionById = new Map(
    (outcomesResult.data ?? []).map((outcome) => [
      outcome.id,
      outcome.position,
    ]),
  );
  const assessmentPositionById = new Map(
    (assessmentsResult.data ?? []).map((assessment) => [
      assessment.id,
      assessment.position,
    ]),
  );

  const courseOffering = (offeringsResult.data ?? [])[0] ?? null;
  const ruleConditionCourses = (conditionCoursesResult.data ?? [])
    .flatMap((row) => {
      const condition = conditionById.get(row.condition_id);
      return condition
        ? [
            {
              conditionKey: condition.key,
              position: row.position,
              sourceCourseCode: row.source_course_code,
              sourceText: row.source_text,
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        left.conditionKey.localeCompare(right.conditionKey) ||
        left.position - right.position,
    );
  const ruleCourseReferences = (referencesResult.data ?? [])
    .flatMap((row) => {
      const rule = ruleById.get(row.course_rule_id);
      const referencedCourseCode = courseCodeById.get(row.referenced_course_id);
      return rule && referencedCourseCode
        ? [
            {
              ruleKey: rule.key,
              referencedCourseCode,
              sourceText: row.source_text,
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        left.ruleKey.localeCompare(right.ruleKey) ||
        left.referencedCourseCode.localeCompare(right.referencedCourseCode),
    );

  return {
    courseCode,
    academicYear: year,
    snapshot: {
      title: snapshot.title,
      unitValueKind: unitValueKind(snapshot.unit_value_kind),
      units: snapshot.units,
      minimumUnits: snapshot.minimum_units,
      maximumUnits: snapshot.maximum_units,
      eftsl: snapshot.eftsl,
      level: requiredNativeNumber(snapshot.level, "Course level"),
      subjectCode: requiredNativeText(snapshot.subject_code, "Subject code"),
      subjectName: snapshot.subject_name,
      school: snapshot.school,
      college: snapshot.college,
      academicCareer: academicCareer(snapshot.academic_career),
      convenerText: snapshot.convener_text,
      deliverySummary: snapshot.delivery_summary,
      introduction: snapshot.introduction,
      description: snapshot.description,
      workloadText: snapshot.workload_text,
      workloadHours: snapshot.workload_hours,
      inherentRequirements: snapshot.inherent_requirements,
      prescribedTexts: snapshot.prescribed_texts,
      offeringStatus: offeringStatus(snapshot.offering_status),
      sourceUpdatedAt: snapshot.source_updated_at,
    },
    unitOptions: (unitOptionsResult.data ?? []).map((row) => ({
      position: row.position,
      units: row.units,
      label: row.label,
      sourceText: row.source_text,
    })),
    fees: (feesResult.data ?? []).map((row) => ({
      position: row.position,
      feeYear: row.fee_year,
      audience:
        row.audience as CourseSnapshotProjectionData["fees"][number]["audience"],
      feeType:
        row.fee_type as CourseSnapshotProjectionData["fees"][number]["feeType"],
      amount: row.amount,
      currency: row.currency,
      basis: row.basis as CourseSnapshotProjectionData["fees"][number]["basis"],
      studentContributionBand: row.student_contribution_band,
      sourceLabel: row.source_label,
      sourceText: row.source_text ?? "",
    })),
    areasOfInterest: (areasResult.data ?? []).map((row) => ({
      position: row.position,
      name: row.name,
    })),
    attributes: (attributesResult.data ?? []).map((row) => ({
      position: row.position,
      attributeKind:
        row.attribute_kind as CourseSnapshotProjectionData["attributes"][number]["attributeKind"],
      value: row.value,
      sourceText: row.source_text,
    })),
    relatedCourses: (relatedResult.data ?? []).map((row) => ({
      position: row.position,
      relationKind:
        row.relation_kind as CourseSnapshotProjectionData["relatedCourses"][number]["relationKind"],
      sourceCourseCode: row.source_course_code,
      sourceCourseTitle: row.source_course_title,
      sourceText: row.source_text ?? "",
    })),
    courseOffering: courseOffering
      ? {
          deliveryMode: courseOffering.delivery_mode,
          location: courseOffering.location,
        }
      : null,
    offeringSessions: (sessionsResult.data ?? []).map((row) => {
      return {
        position: requiredNativeNumber(
          row.position,
          `Offering session ${row.id} position`,
        ),
        calendarYear: year,
        academicPeriodCode: requiredNativeText(
          row.academic_period_code,
          `Offering session ${row.id} academic period code`,
        ),
        academicPeriodName: requiredNativeText(
          row.academic_period_name,
          `Offering session ${row.id} academic period name`,
        ),
        classNumber: row.class_number,
        startsOn: row.starts_on,
        enrolClosesOn: row.enrol_closes_on,
        censusOn: row.census_on,
        endsOn: row.ends_on,
        deliveryMode: row.delivery_mode,
        location: row.location,
        classSummaryUrl: row.class_summary_url,
        sourceText: requiredNativeText(
          row.source_text,
          `Offering session ${row.id} source text`,
        ),
      };
    }),
    learningOutcomes: (outcomesResult.data ?? []).map((row) => ({
      position: row.position,
      body: row.body,
    })),
    assessmentItems: (assessmentsResult.data ?? []).map((row) => ({
      position: row.position,
      title: row.title,
      weight: row.weight,
      hurdle: row.hurdle,
      dueText: row.due_text,
      sourceText: row.source_text,
    })),
    assessmentOutcomes: (assessmentOutcomesResult.data ?? [])
      .flatMap((row) => {
        const assessmentPosition = assessmentPositionById.get(
          row.assessment_item_id,
        );
        const learningOutcomePosition = outcomePositionById.get(
          row.learning_outcome_id,
        );
        return assessmentPosition === undefined ||
          learningOutcomePosition === undefined
          ? []
          : [{ assessmentPosition, learningOutcomePosition }];
      })
      .sort(
        (left, right) =>
          left.assessmentPosition - right.assessmentPosition ||
          left.learningOutcomePosition - right.learningOutcomePosition,
      ),
    rules: rules.map((rule) => ({
      key: rule.key,
      ruleKind: rule.ruleKind,
      hardness: rule.hardness,
      sourceText: rule.sourceText,
    })),
    ruleGroups: groupProjection,
    ruleConditions: conditionProjection.map((condition) => ({
      key: condition.key,
      ruleKey: condition.ruleKey,
      groupKey: condition.groupKey,
      position: condition.position,
      conditionKind: conditionKind(condition.conditionKind),
      requiredCourseCode:
        condition.requiredCourseId === null
          ? null
          : (courseCodeById.get(condition.requiredCourseId) ?? null),
      requiredStructureCode:
        condition.requiredStructureId === null
          ? null
          : (structureCodeById.get(condition.requiredStructureId) ?? null),
      minimumUnits: condition.minimumUnits,
      minimumMark: condition.minimumMark,
      subjectCode: condition.subjectCode,
      minimumCourseLevel: condition.minimumCourseLevel,
      maximumCourseLevel: condition.maximumCourseLevel,
      minimumGpa: condition.minimumGpa,
      minimumYear: condition.minimumYear,
      minimumWam: condition.minimumWam,
      freeText: condition.freeText,
      courseRequirementMode: courseRequirementMode(
        condition.courseRequirementMode,
      ),
      hardness: condition.hardness,
      sourceText: condition.sourceText,
    })),
    ruleConditionCourses,
    ruleCourseReferences,
  };
}

export async function loadAdminCourseYear(
  identifier: string,
  requestedYear?: number,
  includeImportArtifacts = false,
  requestedSnapshotId?: number,
): Promise<AdminCourseYearRecord | null> {
  const value = identifier.trim();
  const publicId = PUBLIC_ID_PATTERN.test(value) ? value : null;
  const code = publicId ? null : value.toUpperCase();
  if (!publicId && !COURSE_CODE_PATTERN.test(code ?? "")) return null;
  if (isDemoMode()) return null;

  const supabase = await createClient();
  const courseQuery = supabase.from("courses").select("id,code,public_id");
  const { data: course, error: courseError } = publicId
    ? await courseQuery.eq("public_id", publicId).maybeSingle()
    : await courseQuery.eq("code", code!).maybeSingle();
  if (courseError) throw courseError;
  if (!course) return null;

  const { data: courseYears, error: courseYearsError } = await supabase
    .from("course_years")
    .select("*")
    .eq("course_id", course.id);
  if (courseYearsError) throw courseYearsError;
  if (!courseYears?.length) return null;
  const academicYearIds = [
    ...new Set(courseYears.map((courseYear) => courseYear.academic_year_id)),
  ];
  const { data: academicYears, error: academicYearsError } = await supabase
    .from("academic_years")
    .select("id,year")
    .in("id", academicYearIds);
  if (academicYearsError) throw academicYearsError;
  const academicYearById = new Map(
    (academicYears ?? []).map((academicYear) => [
      academicYear.id,
      academicYear.year,
    ]),
  );
  const availableYears = courseYears
    .flatMap((courseYear) => {
      const year = academicYearById.get(courseYear.academic_year_id);
      return year === undefined
        ? []
        : [
            {
              courseYearId: courseYear.id,
              draftSnapshotId: courseYear.draft_snapshot_id,
              lifecycleStatus: courseYear.lifecycle_status,
              publishedSnapshotId: courseYear.published_snapshot_id,
              year,
            },
          ];
    })
    .sort((left, right) => right.year - left.year);
  const selectedYear =
    availableYears.find((option) => option.year === requestedYear) ??
    availableYears[0];
  if (!selectedYear) return null;
  const activeSnapshotId =
    selectedYear.draftSnapshotId ?? selectedYear.publishedSnapshotId;
  const { data: snapshots, error: snapshotsError } = await supabase
    .from("course_snapshots")
    .select("*")
    .eq("course_year_id", selectedYear.courseYearId)
    .order("snapshot_number", { ascending: false });
  if (snapshotsError) throw snapshotsError;
  const snapshotById = new Map(
    (snapshots ?? []).map((snapshot) => [snapshot.id, snapshot]),
  );
  const currentSnapshotId =
    requestedSnapshotId !== undefined && snapshotById.has(requestedSnapshotId)
      ? requestedSnapshotId
      : activeSnapshotId;
  const snapshot =
    currentSnapshotId === null
      ? null
      : (snapshotById.get(currentSnapshotId) ?? null);
  const publishedSnapshot =
    selectedYear.publishedSnapshotId === null
      ? null
      : (snapshotById.get(selectedYear.publishedSnapshotId) ?? null);
  const ancestrySnapshotIds: number[] = [];
  let ancestryCursor = snapshot;
  const seenSnapshotIds = new Set<number>();
  while (ancestryCursor && !seenSnapshotIds.has(ancestryCursor.id)) {
    seenSnapshotIds.add(ancestryCursor.id);
    ancestrySnapshotIds.push(ancestryCursor.id);
    ancestryCursor = ancestryCursor.based_on_snapshot_id
      ? (snapshotById.get(ancestryCursor.based_on_snapshot_id) ?? null)
      : null;
  }
  const [projection, publishedProjection] = await Promise.all([
    snapshot
      ? loadCourseSnapshotProjection(snapshot, course.code, selectedYear.year)
      : null,
    publishedSnapshot && publishedSnapshot.id !== snapshot?.id
      ? loadCourseSnapshotProjection(
          publishedSnapshot,
          course.code,
          selectedYear.year,
        )
      : publishedSnapshot && snapshot
        ? loadCourseSnapshotProjection(snapshot, course.code, selectedYear.year)
        : null,
  ]);

  const [sourceResult, evidenceResult, blockingReviewsResult] =
    await Promise.all([
      snapshot?.source_page_id
        ? supabase
            .from("course_source_pages")
            .select("*")
            .eq("id", snapshot.source_page_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      snapshot
        ? supabase
            .from("course_snapshot_field_evidence")
            .select("*")
            .eq("course_snapshot_id", snapshot.id)
            .order("field_key")
        : Promise.resolve({ data: [], error: null }),
      ancestrySnapshotIds.length > 0
        ? supabase
            .from("course_review_items")
            .select("*")
            .in("course_snapshot_id", ancestrySnapshotIds)
            .eq("status", "open")
            .eq("is_blocking", true)
            .order("created_at")
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (sourceResult.error) throw sourceResult.error;
  if (evidenceResult.error) throw evidenceResult.error;
  if (blockingReviewsResult.error) throw blockingReviewsResult.error;

  let importTarget: AdminCourseYearRecord["importTarget"] = null;
  let artifacts: CourseImportArtifact[] = [];
  if (includeImportArtifacts && ancestrySnapshotIds.length > 0) {
    const { data: target, error: targetError } = await supabase
      .from("course_import_targets")
      .select("id,run_id")
      .eq("course_year_id", selectedYear.courseYearId)
      .in("candidate_snapshot_id", ancestrySnapshotIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (targetError) throw targetError;
    if (target) {
      const [artifactsResult, stagesResult, extractionsResult] =
        await Promise.all([
          supabase
            .from("course_import_artifacts")
            .select("*")
            .eq("target_id", target.id)
            .order("attempt_number", { ascending: false }),
          supabase
            .from("course_import_stages")
            .select("*")
            .eq("target_id", target.id)
            .order("position"),
          supabase
            .from("course_extractions")
            .select("*")
            .eq("target_id", target.id)
            .order("extraction_number", { ascending: false }),
        ]);
      const importDetailError = [
        artifactsResult,
        stagesResult,
        extractionsResult,
      ].find((result) => result.error)?.error;
      if (importDetailError) throw importDetailError;
      importTarget = {
        extractions: extractionsResult.data ?? [],
        runId: target.run_id,
        stages: stagesResult.data ?? [],
        targetId: target.id,
      };
      const artifactRows = artifactsResult.data;
      artifacts = (artifactRows ?? []).map((artifact) => ({
        id: artifact.id,
        kind: artifact.artifact_kind,
        attemptNumber: artifact.attempt_number,
        mediaType: artifact.media_type,
        byteSize: artifact.byte_size,
        contentSha256: artifact.content_sha256,
        createdAt: artifact.created_at,
      }));
    }
  }

  return {
    activeSnapshotId,
    artifacts,
    availableYears,
    blockingReviewItems: blockingReviewsResult.data ?? [],
    code: course.code,
    courseId: course.id,
    courseYearId: selectedYear.courseYearId,
    currentSnapshotId,
    draftSnapshotId: selectedYear.draftSnapshotId,
    evidence: evidenceResult.data ?? [],
    importTarget,
    lifecycleStatus: selectedYear.lifecycleStatus,
    projection,
    publicId: course.public_id,
    publishedProjection,
    publishedSnapshotId: selectedYear.publishedSnapshotId,
    snapshot,
    snapshotHistory: (snapshots ?? []).map((item) => ({
      createdAt: item.created_at,
      id: item.id,
      origin: item.origin,
      sealedAt: item.sealed_at,
      snapshotNumber: item.snapshot_number,
    })),
    sourcePage: sourceResult.data,
    year: selectedYear.year,
  };
}
