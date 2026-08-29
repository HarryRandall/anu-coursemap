import "server-only";

import { cumulativeGrowthSeries } from "@/lib/coursemap/admin-catalogue-history";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const [year, courses, courseDrafts, courseCreated, courseDraftCreated] =
    await Promise.all([
      currentCatalogueYear(),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase
        .from("course_years")
        .select("id", { count: "exact", head: true })
        .not("draft_snapshot_id", "is", null),
      supabase.from("courses").select("created_at").limit(5000),
      supabase
        .from("course_years")
        .select("created_at")
        .not("draft_snapshot_id", "is", null)
        .limit(5000),
    ]);
  const courseError = [courses, courseDrafts, courseCreated, courseDraftCreated]
    .map((result) => result.error)
    .find(Boolean);
  if (courseError) throw courseError;

  let structures = 0;
  let structureDrafts = 0;
  let structureRows: Array<{
    created_at: string;
    publication_status: string;
  }> = [];
  if (year) {
    const [structureCount, draftCount, structureCreated] = await Promise.all([
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
        .select("created_at,publication_status")
        .eq("catalogue_year_id", year.id)
        .limit(5000),
    ]);
    const structureError = [structureCount, draftCount, structureCreated]
      .map((result) => result.error)
      .find(Boolean);
    if (structureError) throw structureError;
    structures = structureCount.count ?? 0;
    structureDrafts = draftCount.count ?? 0;
    structureRows = structureCreated.data ?? [];
  }

  const courseRows = courseCreated.data ?? [];
  const draftCreatedAt = [
    ...(courseDraftCreated.data ?? []).map((row) => row.created_at),
    ...structureRows
      .filter((row) => row.publication_status !== "published")
      .map((row) => row.created_at),
  ];

  return {
    courses: courses.count ?? 0,
    courseDrafts: courseDrafts.count ?? 0,
    courseHistory: cumulativeGrowthSeries(
      courseRows.map((row) => row.created_at),
    ),
    structures,
    structureDrafts,
    structureHistory: cumulativeGrowthSeries(
      structureRows.map((row) => row.created_at),
    ),
    draftHistory: cumulativeGrowthSeries(draftCreatedAt),
  };
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
