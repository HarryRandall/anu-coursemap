import "server-only";

import { cumulativeGrowthSeries } from "@/lib/coursemap/admin-catalogue-history";
import {
  preservedRuleField,
  reviewedTreeFromStored,
  type ReviewedRuleTree,
  type StoredRuleCondition,
  type StoredRuleGroup,
} from "@/lib/coursemap/requisite-conditions";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AdminCourseRecord = {
  code: string;
  publicId: string;
  id: number;
  publicationStatus: string;
  reviewState: string;
  subject: string;
  title: string;
  units: number;
  year: number;
};

export type AdminStructureRecord = {
  code: string;
  publicId: string;
  description: string;
  id: number;
  kind: string;
  name: string;
  publicationStatus: string;
  reviewState: string;
  units: number;
  year: number;
};

export type PaginatedAdminResult<T> = {
  page: number;
  pageSize: number;
  records: T[];
  total: number;
};

export type AdminCatalogueSummary = {
  courseDrafts: number;
  courseHistory: number[];
  courses: number;
  draftHistory: number[];
  structureDrafts: number;
  structureHistory: number[];
  structures: number;
};

export type AdminCourseReviewRule = {
  confidence: number;
  hardness: string;
  id: number;
  kind: string;
  reviewed: ReviewedRuleTree | null;
  reviewState: string;
  sourceChanged: boolean;
  sourceText: string;
};

export type AdminCourseReviewOffering = {
  deliveryMode: string | null;
  id: number;
  location: string | null;
  sessions: Array<{
    deliveryMode: string | null;
    location: string | null;
    period: string;
  }>;
  status: string;
};

export type AdminCourseReviewRecord = {
  code: string;
  publicId: string;
  convener: string | null;
  deliverySummary: string | null;
  description: string;
  id: number;
  level: number;
  offerings: AdminCourseReviewOffering[];
  publicationStatus: string;
  reviewState: string;
  rules: AdminCourseReviewRule[];
  school: string;
  source: {
    canonicalUrl: string;
    contentHash: string | null;
    fetchedAt: string | null;
    lastModified: string | null;
  } | null;
  sourceUpdatedAt: string | null;
  subject: string;
  title: string;
  units: number;
  year: number;
};

type CourseVersionRow = {
  course_id: number;
  id: number;
  publication_status: string;
  review_state: string;
  subject: string;
  title: string;
  units: number;
};
type CourseRow = { code: string; id: number; public_id: string };
type StructureVersionRow = {
  description: string;
  id: number;
  name: string;
  publication_status: string;
  review_state: string;
  structure_id: number;
  units: number;
};
type StructureRow = {
  code: string;
  id: number;
  kind: string;
  public_id: string;
};

type CourseReviewVersionRow = {
  convener: string | null;
  delivery_summary: string | null;
  description: string;
  id: number;
  level: number;
  publication_status: string;
  review_state: string;
  school: string;
  source_document_id: number;
  source_updated_at: string | null;
  subject: string;
  title: string;
  units: number;
};

type CourseReviewRuleRow = {
  confidence: number;
  hardness: string;
  id: number;
  review_state: string;
  rule_kind: string;
  source_text: string;
};

type CourseReviewGroupRow = {
  course_rule_id: number;
  id: number;
  minimum_count: number | null;
  operator: string;
  parent_group_id: number | null;
  position: number;
};

type CourseReviewConditionRow = {
  condition_kind: string;
  confidence: number;
  course_rule_id: number;
  id: number;
  free_text: string | null;
  group_id: number;
  maximum_course_level: number | null;
  minimum_course_level: number | null;
  minimum_gpa: number | null;
  minimum_mark: number | null;
  minimum_units: number | null;
  position: number;
  required_course_id: number | null;
  required_structure_id: number | null;
  review_state: string;
  source_text: string | null;
  subject_code: string | null;
};

type ReviewChangeRow = {
  field: string;
  new_value: unknown;
  old_value: unknown;
};

type CourseReviewOfferingRow = {
  delivery_mode: string | null;
  id: number;
  location: string | null;
  status: string;
};

type OfferingSessionRow = {
  academic_period_id: number;
  course_offering_id: number;
  delivery_mode: string | null;
  location: string | null;
};

type AcademicPeriodRow = { id: number; name: string };

type SourceDocumentRow = {
  canonical_url: string;
  content_sha256: string;
  fetched_at: string;
  source_last_modified: string | null;
};

async function currentCatalogueYear() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogue_years")
    .select("id,year")
    .eq("status", "published")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Admin routes address records by public_id; codes stay valid as a redirect. */
export const PUBLIC_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function safePage(value?: number) {
  return value !== undefined && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : 1;
}

function safeQuery(value?: string) {
  return (
    value
      ?.trim()
      .slice(0, 120)
      .replace(/[,%()]/g, " ") ?? ""
  );
}

export type AdminCourseListStatus =
  "all" | "draft" | "published" | "archived" | "needs-review" | "verified";

export async function loadAdminCourseSubjects(): Promise<string[]> {
  if (isDemoMode()) return [];
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) return [];
  const { data, error } = await supabase
    .from("course_versions")
    .select("subject")
    .eq("catalogue_year_id", year.id)
    .limit(5000);
  if (error) return [];
  return [...new Set((data ?? []).map((row) => row.subject))].sort();
}

export async function loadAdminCoursePage({
  page,
  pageSize = 24,
  query,
  status = "all",
  subject,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: AdminCourseListStatus;
  subject?: string;
} = {}): Promise<PaginatedAdminResult<AdminCourseRecord>> {
  const currentPage = safePage(page);
  const currentPageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  if (isDemoMode()) {
    return {
      page: currentPage,
      pageSize: currentPageSize,
      records: [],
      total: 0,
    };
  }
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) {
    return {
      page: currentPage,
      pageSize: currentPageSize,
      records: [],
      total: 0,
    };
  }
  const search = safeQuery(query);
  const { data: matchingCourses, error: matchingCoursesError } = search
    ? await supabase
        .from("courses")
        .select("id")
        .ilike("code", `%${search}%`)
        .limit(500)
    : { data: [], error: null };
  if (matchingCoursesError) throw matchingCoursesError;
  const matchingCourseIds = (matchingCourses ?? []).map((course) => course.id);

  let versionsQuery = supabase
    .from("course_versions")
    .select(
      "course_id,id,publication_status,review_state,subject,title,units",
      { count: "exact" },
    )
    .eq("catalogue_year_id", year.id);
  if (search) {
    const pattern = `*${search}*`;
    const codeClause = matchingCourseIds.length
      ? `,course_id.in.(${matchingCourseIds.join(",")})`
      : "";
    versionsQuery = versionsQuery.or(
      `title.ilike.${pattern},subject.ilike.${pattern}${codeClause}`,
    );
  }
  if (subject) versionsQuery = versionsQuery.eq("subject", subject);
  if (status === "archived") {
    versionsQuery = versionsQuery.eq("publication_status", "archived");
  } else if (status === "draft" || status === "published") {
    versionsQuery = versionsQuery.eq("publication_status", status);
  } else if (status === "verified") {
    versionsQuery = versionsQuery.eq("review_state", "verified");
  } else if (status === "needs-review") {
    versionsQuery = versionsQuery.neq("review_state", "verified");
  }
  const start = (currentPage - 1) * currentPageSize;
  const {
    data: versions,
    count,
    error: versionsError,
  } = await versionsQuery
    .order("subject")
    .order("title")
    .range(start, start + currentPageSize - 1);
  if (versionsError) throw versionsError;
  const rows = (versions ?? []) as CourseVersionRow[];
  const courseIds = [...new Set(rows.map((row) => row.course_id))];
  const { data: courses, error: coursesError } = courseIds.length
    ? await supabase
        .from("courses")
        .select("code,id,public_id")
        .in("id", courseIds)
    : { data: [], error: null };
  if (coursesError) throw coursesError;
  const courseById = new Map(
    ((courses ?? []) as CourseRow[]).map((course) => [course.id, course]),
  );
  return {
    page: currentPage,
    pageSize: currentPageSize,
    total: count ?? 0,
    records: rows.flatMap((row) => {
      const course = courseById.get(row.course_id);
      return course
        ? [
            {
              code: course.code,
              publicId: course.public_id,
              id: row.id,
              publicationStatus: row.publication_status,
              reviewState: row.review_state,
              subject: row.subject,
              title: row.title,
              units: row.units,
              year: year.year,
            },
          ]
        : [];
    }),
  };
}

export async function loadAdminStructurePage({
  page,
  pageSize = 24,
  query,
  status = "all",
  kind,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: AdminCourseListStatus;
  kind?: string;
} = {}): Promise<PaginatedAdminResult<AdminStructureRecord>> {
  const currentPage = safePage(page);
  const currentPageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  if (isDemoMode()) {
    return {
      page: currentPage,
      pageSize: currentPageSize,
      records: [],
      total: 0,
    };
  }
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) {
    return {
      page: currentPage,
      pageSize: currentPageSize,
      records: [],
      total: 0,
    };
  }
  const search = safeQuery(query);
  const { data: matchingStructures, error: matchingStructuresError } = search
    ? await supabase
        .from("academic_structures")
        .select("id")
        .ilike("code", `%${search}%`)
        .limit(500)
    : { data: [], error: null };
  if (matchingStructuresError) throw matchingStructuresError;
  const structureIds = (matchingStructures ?? []).map(
    (structure) => structure.id,
  );
  const { data: kindStructures, error: kindStructuresError } = kind
    ? await supabase
        .from("academic_structures")
        .select("id")
        .eq("kind", kind)
        .limit(2000)
    : { data: null, error: null };
  if (kindStructuresError) throw kindStructuresError;

  let versionsQuery = supabase
    .from("academic_structure_versions")
    .select(
      "description,id,name,publication_status,review_state,structure_id,units",
      { count: "exact" },
    )
    .eq("catalogue_year_id", year.id);
  if (search) {
    const pattern = `*${search}*`;
    const codeClause = structureIds.length
      ? `,structure_id.in.(${structureIds.join(",")})`
      : "";
    versionsQuery = versionsQuery.or(`name.ilike.${pattern}${codeClause}`);
  }
  if (kindStructures) {
    const kindIds = kindStructures.map((structure) => structure.id);
    versionsQuery = kindIds.length
      ? versionsQuery.in("structure_id", kindIds)
      : versionsQuery.eq("structure_id", -1);
  }
  if (status === "archived") {
    versionsQuery = versionsQuery.eq("publication_status", "archived");
  } else if (status === "draft" || status === "published") {
    versionsQuery = versionsQuery.eq("publication_status", status);
  } else if (status === "verified") {
    versionsQuery = versionsQuery.eq("review_state", "verified");
  } else if (status === "needs-review") {
    versionsQuery = versionsQuery.neq("review_state", "verified");
  }
  const start = (currentPage - 1) * currentPageSize;
  const {
    data: versions,
    count,
    error: versionsError,
  } = await versionsQuery
    .order("name")
    .range(start, start + currentPageSize - 1);
  if (versionsError) throw versionsError;
  const rows = (versions ?? []) as StructureVersionRow[];
  const ids = [...new Set(rows.map((row) => row.structure_id))];
  const { data: structures, error: structuresError } = ids.length
    ? await supabase
        .from("academic_structures")
        .select("code,id,kind,public_id")
        .in("id", ids)
    : { data: [], error: null };
  if (structuresError) throw structuresError;
  const structureById = new Map(
    ((structures ?? []) as StructureRow[]).map((structure) => [
      structure.id,
      structure,
    ]),
  );
  return {
    page: currentPage,
    pageSize: currentPageSize,
    total: count ?? 0,
    records: rows.flatMap((row) => {
      const structure = structureById.get(row.structure_id);
      return structure
        ? [
            {
              code: structure.code,
              publicId: structure.public_id,
              description: row.description,
              id: row.id,
              kind: structure.kind,
              name: row.name,
              publicationStatus: row.publication_status,
              reviewState: row.review_state,
              units: row.units,
              year: year.year,
            },
          ]
        : [];
    }),
  };
}

const emptyCatalogueSummary = (): AdminCatalogueSummary => ({
  courseDrafts: 0,
  courseHistory: [],
  courses: 0,
  draftHistory: [],
  structureDrafts: 0,
  structureHistory: [],
  structures: 0,
});

export async function loadAdminCatalogueSummary(): Promise<AdminCatalogueSummary> {
  if (isDemoMode()) return emptyCatalogueSummary();
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) return emptyCatalogueSummary();
  const [
    courses,
    courseDrafts,
    structures,
    structureDrafts,
    courseCreated,
    structureCreated,
  ] = await Promise.all([
    supabase
      .from("course_versions")
      .select("id", { count: "exact", head: true })
      .eq("catalogue_year_id", year.id),
    supabase
      .from("course_versions")
      .select("id", { count: "exact", head: true })
      .eq("catalogue_year_id", year.id)
      .neq("publication_status", "published"),
    supabase
      .from("academic_structure_versions")
      .select("id", { count: "exact", head: true })
      .eq("catalogue_year_id", year.id),
    supabase
      .from("academic_structure_versions")
      .select("id", { count: "exact", head: true })
      .eq("catalogue_year_id", year.id)
      .neq("publication_status", "published"),
    supabase
      .from("course_versions")
      .select("created_at,publication_status")
      .eq("catalogue_year_id", year.id)
      .limit(5000),
    supabase
      .from("academic_structure_versions")
      .select("created_at,publication_status")
      .eq("catalogue_year_id", year.id)
      .limit(5000),
  ]);
  const firstError = [
    courses,
    courseDrafts,
    structures,
    structureDrafts,
    courseCreated,
    structureCreated,
  ]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw firstError;

  const courseRows = (courseCreated.data ?? []) as Array<{
    created_at: string;
    publication_status: string;
  }>;
  const structureRows = (structureCreated.data ?? []) as Array<{
    created_at: string;
    publication_status: string;
  }>;
  const draftCreatedAt = [...courseRows, ...structureRows]
    .filter((row) => row.publication_status !== "published")
    .map((row) => row.created_at);

  return {
    courses: courses.count ?? 0,
    courseDrafts: courseDrafts.count ?? 0,
    courseHistory: cumulativeGrowthSeries(
      courseRows.map((row) => row.created_at),
    ),
    structures: structures.count ?? 0,
    structureDrafts: structureDrafts.count ?? 0,
    structureHistory: cumulativeGrowthSeries(
      structureRows.map((row) => row.created_at),
    ),
    draftHistory: cumulativeGrowthSeries(draftCreatedAt),
  };
}

export async function loadAdminCourseRecords(): Promise<AdminCourseRecord[]> {
  if (isDemoMode()) return [];
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) return [];

  const { data: versions, error: versionsError } = await supabase
    .from("course_versions")
    .select("course_id,id,publication_status,review_state,subject,title,units")
    .eq("catalogue_year_id", year.id)
    .order("subject")
    .order("title");
  if (versionsError) throw versionsError;

  const rows = (versions ?? []) as CourseVersionRow[];
  const courseIds = [...new Set(rows.map((row) => row.course_id))];
  const { data: courses, error: coursesError } = courseIds.length
    ? await supabase
        .from("courses")
        .select("code,id,public_id")
        .in("id", courseIds)
    : { data: [], error: null };
  if (coursesError) throw coursesError;
  const courseById = new Map(
    ((courses ?? []) as CourseRow[]).map((course) => [course.id, course]),
  );

  return rows.flatMap((row) => {
    const course = courseById.get(row.course_id);
    return course
      ? [
          {
            code: course.code,
            publicId: course.public_id,
            id: row.id,
            publicationStatus: row.publication_status,
            reviewState: row.review_state,
            subject: row.subject,
            title: row.title,
            units: row.units,
            year: year.year,
          },
        ]
      : [];
  });
}

async function loadAdminCourseReviewRules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ruleRows: CourseReviewRuleRow[],
  reviewChanges: ReviewChangeRow[],
): Promise<AdminCourseReviewRule[]> {
  const ruleIds = ruleRows.map((rule) => rule.id);
  const [groupsResult, conditionsResult] = ruleIds.length
    ? await Promise.all([
        supabase
          .from("course_rule_groups")
          .select(
            "course_rule_id,id,minimum_count,operator,parent_group_id,position",
          )
          .in("course_rule_id", ruleIds)
          .order("position"),
        supabase
          .from("course_rule_conditions")
          .select(
            "condition_kind,confidence,course_rule_id,free_text,group_id,id,maximum_course_level,minimum_course_level,minimum_gpa,minimum_mark,minimum_units,position,required_course_id,required_structure_id,review_state,source_text,subject_code",
          )
          .in("course_rule_id", ruleIds)
          .order("position"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (groupsResult.error) throw groupsResult.error;
  if (conditionsResult.error) throw conditionsResult.error;

  const groupRows = (groupsResult.data ?? []) as CourseReviewGroupRow[];
  const conditionRows = (conditionsResult.data ??
    []) as CourseReviewConditionRow[];
  const courseIds = [
    ...new Set(
      conditionRows
        .map((row) => row.required_course_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const structureIds = [
    ...new Set(
      conditionRows
        .map((row) => row.required_structure_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const [coursesResult, structuresResult] = await Promise.all([
    courseIds.length
      ? supabase.from("courses").select("id,code").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    structureIds.length
      ? supabase
          .from("academic_structures")
          .select("id,code")
          .in("id", structureIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (coursesResult.error) throw coursesResult.error;
  if (structuresResult.error) throw structuresResult.error;

  const courseCodeById = new Map(
    ((coursesResult.data ?? []) as Array<{ code: string; id: number }>).map(
      (row) => [row.id, row.code],
    ),
  );
  const structureCodeById = new Map(
    ((structuresResult.data ?? []) as Array<{ code: string; id: number }>).map(
      (row) => [row.id, row.code],
    ),
  );

  const titleByCourseId = new Map<number, string>();
  if (courseIds.length) {
    const { data: versions, error: versionsError } = await supabase
      .from("course_versions")
      .select("course_id,title")
      .in("course_id", courseIds);
    if (versionsError) throw versionsError;
    for (const version of versions ?? []) {
      if (!titleByCourseId.has(version.course_id)) {
        titleByCourseId.set(version.course_id, version.title);
      }
    }
  }
  const nameByStructureId = new Map<number, string>();
  if (structureIds.length) {
    const { data: versions, error: versionsError } = await supabase
      .from("academic_structure_versions")
      .select("structure_id,name")
      .in("structure_id", structureIds);
    if (versionsError) throw versionsError;
    for (const version of versions ?? []) {
      if (!nameByStructureId.has(version.structure_id)) {
        nameByStructureId.set(version.structure_id, version.name);
      }
    }
  }

  const groupsByRule = new Map<number, StoredRuleGroup[]>();
  for (const row of groupRows) {
    const groups = groupsByRule.get(row.course_rule_id) ?? [];
    groups.push({
      id: row.id,
      parentId: row.parent_group_id,
      operator: row.operator,
      minimumCount: row.minimum_count,
      position: row.position,
    });
    groupsByRule.set(row.course_rule_id, groups);
  }

  const conditionsByRule = new Map<number, StoredRuleCondition[]>();
  for (const row of conditionRows) {
    const conditions = conditionsByRule.get(row.course_rule_id) ?? [];
    conditions.push({
      id: row.id,
      groupId: row.group_id,
      kind: row.condition_kind,
      courseCode: row.required_course_id
        ? (courseCodeById.get(row.required_course_id) ?? null)
        : null,
      courseTitle: row.required_course_id
        ? (titleByCourseId.get(row.required_course_id) ?? null)
        : null,
      structureCode: row.required_structure_id
        ? (structureCodeById.get(row.required_structure_id) ?? null)
        : null,
      structureName: row.required_structure_id
        ? (nameByStructureId.get(row.required_structure_id) ?? null)
        : null,
      units: row.minimum_units == null ? null : Number(row.minimum_units),
      subjectCode: row.subject_code,
      level: row.minimum_course_level,
      gpa: row.minimum_gpa == null ? null : Number(row.minimum_gpa),
      mark: row.minimum_mark == null ? null : Number(row.minimum_mark),
      freeText: row.free_text,
      sourceText: row.source_text,
      confidence: Number(row.confidence),
      reviewState: row.review_state,
      position: row.position,
    });
    conditionsByRule.set(row.course_rule_id, conditions);
  }

  return ruleRows.map((rule) => {
    const groups = groupsByRule.get(rule.id) ?? [];
    const conditions = conditionsByRule.get(rule.id) ?? [];
    const change = reviewChanges.find(
      (item) => item.field === preservedRuleField(rule.rule_kind),
    );
    return {
      confidence: Number(rule.confidence),
      hardness: rule.hardness,
      id: rule.id,
      kind: rule.rule_kind,
      reviewed: reviewedTreeFromStored({
        confidence: Number(rule.confidence),
        reviewState: rule.review_state,
        sourceText: rule.source_text,
        groups,
        conditions,
      }),
      reviewState: rule.review_state,
      sourceChanged: Boolean(change),
      sourceText: rule.source_text,
    };
  });
}

/**
 * Loads every field an administrator needs to compare a draft against its
 * source. The source document remains separate from mutable draft fields so
 * review never loses provenance.
 */
export async function loadAdminCourseReview(
  identifier: string,
): Promise<AdminCourseReviewRecord | null> {
  const value = identifier.trim();
  const publicId = PUBLIC_ID_PATTERN.test(value) ? value : null;
  const code = publicId ? null : value.toUpperCase();
  if (!publicId && !/^[A-Z]{4}\d{4}[A-Z]?$/.test(code ?? "")) return null;

  if (isDemoMode()) {
    if (!code) return null;
    const { courseByCode } = await import("@/lib/catalogue");
    const course = courseByCode(code);
    if (!course) return null;

    const reviewState =
      course.parseState === "Verified"
        ? "verified"
        : course.parseState === "Review"
          ? "review"
          : "automatic";
    const rules: AdminCourseReviewRule[] = [];
    if (course.prerequisiteText !== "None") {
      rules.push({
        confidence: 0,
        hardness: "hard",
        id: 1,
        kind: "prerequisite",
        reviewed: null,
        reviewState,
        sourceChanged: false,
        sourceText: course.prerequisiteText,
      });
    }
    if (course.incompatibilities.length > 0) {
      rules.push({
        confidence: 0,
        hardness: "hard",
        id: 2,
        kind: "incompatibility",
        reviewed: null,
        reviewState,
        sourceChanged: false,
        sourceText: `You are not able to enrol in this course if you have successfully completed ${course.incompatibilities.join(", ")}.`,
      });
    }

    return {
      code: course.code,
      publicId: course.code,
      convener: course.convener,
      deliverySummary: course.delivery,
      description: course.description,
      id: 0,
      level: course.level,
      offerings: [
        {
          deliveryMode: course.delivery,
          id: 0,
          location: null,
          sessions: course.sessions.map((period) => ({
            deliveryMode: course.delivery,
            location: null,
            period,
          })),
          status: "draft",
        },
      ],
      publicationStatus: "draft",
      reviewState,
      rules,
      school: course.school,
      source: {
        canonicalUrl: course.sourceUrl,
        contentHash: null,
        fetchedAt: null,
        lastModified: null,
      },
      sourceUpdatedAt: null,
      subject: course.subject,
      title: course.name,
      units: course.units,
      year: course.year,
    };
  }

  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) return null;

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,code,public_id")
    .eq(publicId ? "public_id" : "code", publicId ?? (code as string))
    .maybeSingle();
  if (courseError) throw courseError;
  if (!course) return null;

  const { data: version, error: versionError } = await supabase
    .from("course_versions")
    .select(
      "convener,delivery_summary,description,id,level,publication_status,review_state,school,source_document_id,source_updated_at,subject,title,units",
    )
    .eq("catalogue_year_id", year.id)
    .eq("course_id", course.id)
    .maybeSingle();
  if (versionError) throw versionError;
  if (!version) return null;
  const versionRow = version as CourseReviewVersionRow;

  const [sourceResult, rulesResult, offeringsResult, reviewChangesResult] =
    await Promise.all([
      supabase
        .from("catalogue_source_documents")
        .select("canonical_url,content_sha256,fetched_at,source_last_modified")
        .eq("id", versionRow.source_document_id)
        .maybeSingle(),
      supabase
        .from("course_rules")
        .select("confidence,hardness,id,review_state,rule_kind,source_text")
        .eq("course_version_id", versionRow.id)
        .order("rule_kind"),
      supabase
        .from("course_offerings")
        .select("delivery_mode,id,location,status")
        .eq("course_version_id", versionRow.id)
        .order("id"),
      supabase
        .from("catalogue_review_items")
        .select("field,old_value,new_value")
        .eq("catalogue_year_id", year.id)
        .eq("target_kind", "course_version")
        .eq("target_key", course.code)
        .eq("issue_code", "STRUCTURED_RULE_PRESERVED")
        .eq("status", "open"),
    ]);
  if (sourceResult.error) throw sourceResult.error;
  if (rulesResult.error) throw rulesResult.error;
  if (offeringsResult.error) throw offeringsResult.error;
  if (reviewChangesResult.error) throw reviewChangesResult.error;

  const offeringRows = (offeringsResult.data ??
    []) as CourseReviewOfferingRow[];
  const offeringIds = offeringRows.map((offering) => offering.id);
  const { data: sessions, error: sessionsError } = offeringIds.length
    ? await supabase
        .from("offering_sessions")
        .select("academic_period_id,course_offering_id,delivery_mode,location")
        .in("course_offering_id", offeringIds)
    : { data: [], error: null };
  if (sessionsError) throw sessionsError;

  const sessionRows = (sessions ?? []) as OfferingSessionRow[];
  const periodIds = [
    ...new Set(sessionRows.map((session) => session.academic_period_id)),
  ];
  const { data: periods, error: periodsError } = periodIds.length
    ? await supabase
        .from("academic_periods")
        .select("id,name")
        .in("id", periodIds)
    : { data: [], error: null };
  if (periodsError) throw periodsError;
  const periodNameById = new Map(
    ((periods ?? []) as AcademicPeriodRow[]).map((period) => [
      period.id,
      period.name,
    ]),
  );

  const source = sourceResult.data as SourceDocumentRow | null;
  const ruleRows = (rulesResult.data ?? []) as CourseReviewRuleRow[];
  const rules = await loadAdminCourseReviewRules(
    supabase,
    ruleRows,
    (reviewChangesResult.data ?? []) as ReviewChangeRow[],
  );
  return {
    code: course.code,
    publicId: course.public_id,
    convener: versionRow.convener,
    deliverySummary: versionRow.delivery_summary,
    description: versionRow.description,
    id: versionRow.id,
    level: versionRow.level,
    offerings: offeringRows.map((offering) => ({
      deliveryMode: offering.delivery_mode,
      id: offering.id,
      location: offering.location,
      // offering_sessions is keyed per class. The review view summarises by
      // period, so collapse the classes of a period to the first row rather
      // than listing the same period several times.
      sessions: [
        ...new Map(
          sessionRows
            .filter((session) => session.course_offering_id === offering.id)
            .map((session) => [
              session.academic_period_id,
              {
                deliveryMode: session.delivery_mode,
                location: session.location,
                period:
                  periodNameById.get(session.academic_period_id) ??
                  "Unmapped period",
              },
            ]),
        ).values(),
      ],
      status: offering.status,
    })),
    publicationStatus: versionRow.publication_status,
    reviewState: versionRow.review_state,
    rules,
    school: versionRow.school,
    source: source
      ? {
          canonicalUrl: source.canonical_url,
          contentHash: source.content_sha256,
          fetchedAt: source.fetched_at,
          lastModified: source.source_last_modified,
        }
      : null,
    sourceUpdatedAt: versionRow.source_updated_at,
    subject: versionRow.subject,
    title: versionRow.title,
    units: versionRow.units,
    year: year.year,
  };
}

export async function loadAdminStructureRecords(): Promise<
  AdminStructureRecord[]
> {
  if (isDemoMode()) return [];
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) return [];

  const { data: versions, error: versionsError } = await supabase
    .from("academic_structure_versions")
    .select(
      "description,id,name,publication_status,review_state,structure_id,units",
    )
    .eq("catalogue_year_id", year.id)
    .order("name");
  if (versionsError) throw versionsError;

  const rows = (versions ?? []) as StructureVersionRow[];
  const structureIds = [...new Set(rows.map((row) => row.structure_id))];
  const { data: structures, error: structuresError } = structureIds.length
    ? await supabase
        .from("academic_structures")
        .select("code,id,kind,public_id")
        .in("id", structureIds)
    : { data: [], error: null };
  if (structuresError) throw structuresError;
  const structureById = new Map(
    ((structures ?? []) as StructureRow[]).map((structure) => [
      structure.id,
      structure,
    ]),
  );

  return rows.flatMap((row) => {
    const structure = structureById.get(row.structure_id);
    return structure
      ? [
          {
            code: structure.code,
            publicId: structure.public_id,
            description: row.description,
            id: row.id,
            kind: structure.kind,
            name: row.name,
            publicationStatus: row.publication_status,
            reviewState: row.review_state,
            units: row.units,
            year: year.year,
          },
        ]
      : [];
  });
}

export type AdminStructureReviewCondition = {
  courseCode: string | null;
  id: number;
  kind: string;
  maximumLevel: number | null;
  minimumLevel: number | null;
  minimumUnits: number | null;
  sourceText: string | null;
  subjectCode: string | null;
  targetStructureCode: string | null;
};

export type AdminStructureReviewGroup = {
  code: string;
  conditions: AdminStructureReviewCondition[];
  description: string | null;
  id: number;
  minimumCount: number | null;
  minimumUnits: number | null;
  name: string;
  operator: string;
  parentGroupId: number | null;
};

export type AdminStructureReviewRecord = {
  code: string;
  publicId: string;
  description: string;
  groups: AdminStructureReviewGroup[];
  id: number;
  kind: string;
  name: string;
  publicationStatus: string;
  reviewState: string;
  source: {
    canonicalUrl: string;
    contentHash: string | null;
    fetchedAt: string | null;
    lastModified: string | null;
  } | null;
  units: number;
  year: number;
};

/**
 * Loads one programme version with its requirement tree so a reviewer can
 * check the imported structure against the ANU page before publishing it.
 */
export async function loadAdminStructureReview(
  identifier: string,
): Promise<AdminStructureReviewRecord | null> {
  const value = identifier.trim();
  const publicId = PUBLIC_ID_PATTERN.test(value) ? value : null;
  const code = publicId ? null : value.toUpperCase();
  if (!publicId && !/^[A-Z0-9][A-Z0-9-]*$/.test(code ?? "")) return null;
  if (isDemoMode()) return null;

  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) return null;

  const { data: structure, error: structureError } = await supabase
    .from("academic_structures")
    .select("id,code,kind,public_id")
    .eq(publicId ? "public_id" : "code", publicId ?? (code as string))
    .maybeSingle();
  if (structureError) throw structureError;
  if (!structure) return null;

  const { data: version, error: versionError } = await supabase
    .from("academic_structure_versions")
    .select("description,id,name,publication_status,review_state,units")
    .eq("structure_id", structure.id)
    .eq("catalogue_year_id", year.id)
    .maybeSingle();
  if (versionError) throw versionError;
  if (!version) return null;

  const { data: groupRows, error: groupsError } = await supabase
    .from("requirement_groups")
    .select(
      "code,description,id,minimum_count,minimum_units,name,operator,parent_group_id,position,source_document_id",
    )
    .eq("structure_version_id", version.id)
    .order("position");
  if (groupsError) throw groupsError;
  const groups = groupRows ?? [];

  const { data: conditionRows, error: conditionsError } = groups.length
    ? await supabase
        .from("requirement_conditions")
        .select(
          "condition_kind,course_id,id,maximum_course_level,minimum_course_level,minimum_units,position,requirement_group_id,source_text,subject_code,target_structure_id",
        )
        .in(
          "requirement_group_id",
          groups.map((group) => group.id),
        )
        .order("position")
    : { data: [], error: null };
  if (conditionsError) throw conditionsError;
  const conditions = conditionRows ?? [];

  const courseIds = [
    ...new Set(
      conditions
        .map((condition) => condition.course_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const { data: conditionCourses } = courseIds.length
    ? await supabase
        .from("courses")
        .select("code,id,public_id")
        .in("id", courseIds)
    : { data: [] };
  const courseCodeById = new Map(
    ((conditionCourses ?? []) as CourseRow[]).map((course) => [
      course.id,
      course.code,
    ]),
  );

  const targetIds = [
    ...new Set(
      conditions
        .map((condition) => condition.target_structure_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const { data: targetStructures } = targetIds.length
    ? await supabase
        .from("academic_structures")
        .select("code,id")
        .in("id", targetIds)
    : { data: [] };
  const structureCodeById = new Map(
    ((targetStructures ?? []) as Array<{ code: string; id: number }>).map(
      (item) => [item.id, item.code],
    ),
  );

  const sourceDocumentId = groups[0]?.source_document_id ?? null;
  const { data: sourceDocument } = sourceDocumentId
    ? await supabase
        .from("catalogue_source_documents")
        .select("canonical_url,content_sha256,fetched_at,source_last_modified")
        .eq("id", sourceDocumentId)
        .maybeSingle()
    : { data: null };

  return {
    code: structure.code,
    publicId: structure.public_id,
    description: version.description,
    id: version.id,
    kind: structure.kind,
    name: version.name,
    publicationStatus: version.publication_status,
    reviewState: version.review_state,
    units: version.units,
    year: year.year,
    source: sourceDocument
      ? {
          canonicalUrl: sourceDocument.canonical_url,
          contentHash: sourceDocument.content_sha256,
          fetchedAt: sourceDocument.fetched_at,
          lastModified: sourceDocument.source_last_modified,
        }
      : null,
    groups: groups.map((group) => ({
      code: group.code,
      description: group.description,
      id: group.id,
      minimumCount: group.minimum_count,
      minimumUnits:
        group.minimum_units === null ? null : Number(group.minimum_units),
      name: group.name,
      operator: group.operator,
      parentGroupId: group.parent_group_id,
      conditions: conditions
        .filter((condition) => condition.requirement_group_id === group.id)
        .map((condition) => ({
          courseCode:
            condition.course_id === null
              ? null
              : (courseCodeById.get(condition.course_id) ?? null),
          id: condition.id,
          kind: condition.condition_kind,
          maximumLevel: condition.maximum_course_level,
          minimumLevel: condition.minimum_course_level,
          minimumUnits:
            condition.minimum_units === null
              ? null
              : Number(condition.minimum_units),
          sourceText: condition.source_text,
          subjectCode: condition.subject_code,
          targetStructureCode:
            condition.target_structure_id === null
              ? null
              : (structureCodeById.get(condition.target_structure_id) ?? null),
        })),
    })),
  };
}
