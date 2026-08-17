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
