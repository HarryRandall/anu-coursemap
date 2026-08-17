import "server-only";

import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AdminCourseRecord = {
  code: string;
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
  description: string;
  id: number;
  kind: string;
  name: string;
  publicationStatus: string;
  reviewState: string;
  units: number;
  year: number;
};

export type AdminRuleRecord = {
  code: string;
  id: number;
  kind: string;
  reviewState: string;
  sourceText: string;
};

export type PaginatedAdminResult<T> = {
  page: number;
  pageSize: number;
  records: T[];
  total: number;
};

export type AdminCatalogueSummary = {
  courseDrafts: number;
  courses: number;
  reviewItems: number;
  structureDrafts: number;
  structures: number;
};

export type AdminCourseReviewRule = {
  confidence: number;
  hardness: string;
  id: number;
  kind: string;
  reviewState: string;
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
type CourseRow = { code: string; id: number };
type StructureVersionRow = {
  description: string;
  id: number;
  name: string;
  publication_status: string;
  review_state: string;
  structure_id: number;
  units: number;
};
type StructureRow = { code: string; id: number; kind: string };
type RuleRow = {
  course_version_id: number;
  id: number;
  review_state: string;
  rule_kind: string;
  source_text: string;
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

function safePage(value?: number) {
  return Math.max(1, Math.floor(value ?? 1));
}

function safeQuery(value?: string) {
  return (
    value
      ?.trim()
      .slice(0, 120)
      .replace(/[,%()]/g, " ") ?? ""
  );
}

export async function loadAdminCoursePage({
  page,
  pageSize = 24,
  query,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
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
    ? await supabase.from("courses").select("code,id").in("id", courseIds)
    : { data: [], error: null };
  if (coursesError) throw coursesError;
  const codeById = new Map(
    ((courses ?? []) as CourseRow[]).map((course) => [course.id, course.code]),
  );
  return {
    page: currentPage,
    pageSize: currentPageSize,
    total: count ?? 0,
    records: rows.flatMap((row) => {
      const code = codeById.get(row.course_id);
      return code
        ? [
            {
              code,
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
}: {
  page?: number;
  pageSize?: number;
  query?: string;
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
        .select("code,id,kind")
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

export async function loadAdminRulePage({
  page,
  pageSize = 30,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedAdminResult<AdminRuleRecord>> {
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
  const start = (currentPage - 1) * currentPageSize;
  const {
    data: rules,
    count,
    error: rulesError,
  } = await supabase
    .from("course_rules")
    .select("course_version_id,id,review_state,rule_kind,source_text", {
      count: "exact",
    })
    .eq("catalogue_year_id", year.id)
    .order("id")
    .range(start, start + currentPageSize - 1);
  if (rulesError) throw rulesError;
  const ruleRows = (rules ?? []) as RuleRow[];
  const versionIds = [
    ...new Set(ruleRows.map((rule) => rule.course_version_id)),
  ];
  const { data: versions, error: versionsError } = versionIds.length
    ? await supabase
        .from("course_versions")
        .select("course_id,id")
        .in("id", versionIds)
    : { data: [], error: null };
  if (versionsError) throw versionsError;
  const courseIds = [
    ...new Set((versions ?? []).map((version) => version.course_id)),
  ];
  const { data: courses, error: coursesError } = courseIds.length
    ? await supabase.from("courses").select("code,id").in("id", courseIds)
    : { data: [], error: null };
  if (coursesError) throw coursesError;
  const codeByCourseId = new Map(
    ((courses ?? []) as CourseRow[]).map((course) => [course.id, course.code]),
  );
  const courseIdByVersionId = new Map(
    (versions ?? []).map((version) => [version.id, version.course_id]),
  );
  return {
    page: currentPage,
    pageSize: currentPageSize,
    total: count ?? 0,
    records: ruleRows.flatMap((rule) => {
      const code = codeByCourseId.get(
        courseIdByVersionId.get(rule.course_version_id) ?? -1,
      );
      return code
        ? [
            {
              code,
              id: rule.id,
              kind: rule.rule_kind,
              reviewState: rule.review_state,
              sourceText: rule.source_text,
            },
          ]
        : [];
    }),
  };
}

export async function loadAdminCatalogueSummary(): Promise<AdminCatalogueSummary> {
  if (isDemoMode()) {
    return {
      courseDrafts: 0,
      courses: 0,
      reviewItems: 0,
      structureDrafts: 0,
      structures: 0,
    };
  }
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) {
    return {
      courseDrafts: 0,
      courses: 0,
      reviewItems: 0,
      structureDrafts: 0,
      structures: 0,
    };
  }
  const [
    courses,
    courseDrafts,
    courseReview,
    structures,
    structureDrafts,
    structureReview,
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
      .from("course_versions")
      .select("id", { count: "exact", head: true })
      .eq("catalogue_year_id", year.id)
      .eq("review_state", "review"),
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
      .from("academic_structure_versions")
      .select("id", { count: "exact", head: true })
      .eq("catalogue_year_id", year.id)
      .eq("review_state", "review"),
  ]);
  const firstError = [
    courses,
    courseDrafts,
    courseReview,
    structures,
    structureDrafts,
    structureReview,
  ]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw firstError;
  return {
    courses: courses.count ?? 0,
    courseDrafts: courseDrafts.count ?? 0,
    structures: structures.count ?? 0,
    structureDrafts: structureDrafts.count ?? 0,
    reviewItems: (courseReview.count ?? 0) + (structureReview.count ?? 0),
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
    ? await supabase.from("courses").select("code,id").in("id", courseIds)
    : { data: [], error: null };
  if (coursesError) throw coursesError;
  const codeById = new Map(
    ((courses ?? []) as CourseRow[]).map((course) => [course.id, course.code]),
  );

  return rows.flatMap((row) => {
    const code = codeById.get(row.course_id);
    return code
      ? [
          {
            code,
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

/**
 * Loads every field an administrator needs to compare a draft against its
 * source. The source document remains separate from mutable draft fields so
 * review never loses provenance.
 */
export async function loadAdminCourseReview(
  courseCode: string,
): Promise<AdminCourseReviewRecord | null> {
  const code = courseCode.trim().toUpperCase();
  if (!/^[A-Z]{4}\d{4}$/.test(code)) return null;

  if (isDemoMode()) {
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
        reviewState,
        sourceText: course.prerequisiteText,
      });
    }
    if (course.incompatibilities.length > 0) {
      rules.push({
        confidence: 0,
        hardness: "hard",
        id: 2,
        kind: "incompatibility",
        reviewState,
        sourceText: `You are not able to enrol in this course if you have successfully completed ${course.incompatibilities.join(", ")}.`,
      });
    }

    return {
      code: course.code,
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
    .select("id,code")
    .eq("code", code)
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

  const [sourceResult, rulesResult, offeringsResult] = await Promise.all([
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
  ]);
  if (sourceResult.error) throw sourceResult.error;
  if (rulesResult.error) throw rulesResult.error;
  if (offeringsResult.error) throw offeringsResult.error;

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
  return {
    code,
    convener: versionRow.convener,
    deliverySummary: versionRow.delivery_summary,
    description: versionRow.description,
    id: versionRow.id,
    level: versionRow.level,
    offerings: offeringRows.map((offering) => ({
      deliveryMode: offering.delivery_mode,
      id: offering.id,
      location: offering.location,
      sessions: sessionRows
        .filter((session) => session.course_offering_id === offering.id)
        .map((session) => ({
          deliveryMode: session.delivery_mode,
          location: session.location,
          period:
            periodNameById.get(session.academic_period_id) ?? "Unmapped period",
        })),
      status: offering.status,
    })),
    publicationStatus: versionRow.publication_status,
    reviewState: versionRow.review_state,
    rules: ((rulesResult.data ?? []) as CourseReviewRuleRow[]).map((rule) => ({
      confidence: rule.confidence,
      hardness: rule.hardness,
      id: rule.id,
      kind: rule.rule_kind,
      reviewState: rule.review_state,
      sourceText: rule.source_text,
    })),
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
        .select("code,id,kind")
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

export async function loadAdminRuleRecords(): Promise<AdminRuleRecord[]> {
  if (isDemoMode()) return [];
  const [supabase, year] = await Promise.all([
    createClient(),
    currentCatalogueYear(),
  ]);
  if (!year) return [];

  const [
    { data: rules, error: rulesError },
    { data: versions, error: versionsError },
  ] = await Promise.all([
    supabase
      .from("course_rules")
      .select("course_version_id,id,review_state,rule_kind,source_text")
      .eq("catalogue_year_id", year.id)
      .order("id"),
    supabase
      .from("course_versions")
      .select("course_id,id")
      .eq("catalogue_year_id", year.id),
  ]);
  if (rulesError) throw rulesError;
  if (versionsError) throw versionsError;

  const versionRows = (versions ?? []) as Array<{
    course_id: number;
    id: number;
  }>;
  const courseIds = [
    ...new Set(versionRows.map((version) => version.course_id)),
  ];
  const { data: courses, error: coursesError } = courseIds.length
    ? await supabase.from("courses").select("code,id").in("id", courseIds)
    : { data: [], error: null };
  if (coursesError) throw coursesError;
  const codeByCourseId = new Map(
    ((courses ?? []) as CourseRow[]).map((course) => [course.id, course.code]),
  );
  const courseIdByVersionId = new Map(
    versionRows.map((version) => [version.id, version.course_id]),
  );

  return ((rules ?? []) as RuleRow[]).flatMap((rule) => {
    const code = codeByCourseId.get(
      courseIdByVersionId.get(rule.course_version_id) ?? -1,
    );
    return code
      ? [
          {
            code,
            id: rule.id,
            kind: rule.rule_kind,
            reviewState: rule.review_state,
            sourceText: rule.source_text,
          },
        ]
      : [];
  });
}
