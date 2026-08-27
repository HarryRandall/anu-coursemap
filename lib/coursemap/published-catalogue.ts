import "server-only";

import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course } from "@/lib/coursemap/types";
import { isDemoMode } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public-server";
import type { Database, Json } from "@/types/database";
import type {
  CatalogueCourse,
  CataloguePrerequisiteEdge,
  CatalogueRequisiteRule,
} from "./catalogue-types";
import { accentFor } from "@/lib/coursemap/catalogue-accent";
import { parseRequisiteSummary } from "./requisite-summary";
import { readPublishedRequisiteRule } from "./published-requisite-rule";

const ANU_SOURCE_BASE_URL = "https://programsandcourses.anu.edu.au";

type CourseVersionRow = {
  id: number;
  course_id: number;
  title: string;
  units: number;
  level: number;
  subject: string;
  school: string;
  convener: string | null;
  delivery_summary: string | null;
  description: string;
  publication_status: string;
  review_state: string;
  source_updated_at: string | null;
};

type CourseIdentityRow = { id: number; code: string };
type OfferingRow = {
  id: number;
  course_version_id: number;
  delivery_mode: string | null;
};
type OfferingSessionRow = {
  course_offering_id: number;
  academic_period_id: number;
  delivery_mode: string | null;
};
type AcademicPeriodRow = { id: number; name: string; short_name: string };

const COURSE_VERSION_SELECT =
  "id,course_id,title,units,level,subject,school,convener,delivery_summary,description,publication_status,review_state,source_updated_at";

export type PublishedCourseFilters = {
  query?: string;
  subject?: string;
  level?: string;
  session?: string;
};

export type PublishedCoursePage = {
  courses: CatalogueCourse[];
  page: number;
  pageSize: number;
  total: number;
};

type CourseDetailPayload = {
  code: string;
  year: number;
  name: string;
  units: number;
  level: number;
  subject: string;
  school: string;
  convener: string;
  delivery: string;
  description: string;
  sessions: string[];
  prerequisiteText: string;
  prerequisiteCodes: string[];
  prerequisiteEdges: CataloguePrerequisiteEdge[];
  prerequisiteRule: CatalogueRequisiteRule | null;
  incompatibilityText: string;
  sourceUpdatedAt: string | null;
  reviewState: CatalogueCourse["reviewState"];
};

function sourceUrl(year: number, code: string) {
  return `${ANU_SOURCE_BASE_URL}/${year}/course/${code}`;
}

function demoPrerequisiteEdges(
  code: string,
  courses: Course[],
): CataloguePrerequisiteEdge[] {
  const edges = new Map<string, CataloguePrerequisiteEdge>();
  const visited = new Set<string>();
  const courseByCode = (courseCode: string) =>
    courses.find((course) => course.code === courseCode);

  const addEdge = (from: string, to: string) => {
    edges.set(`${from}:${to}`, {
      from,
      to,
      fromIsAvailable: Boolean(courseByCode(from)),
      toIsAvailable: Boolean(courseByCode(to)),
    });
  };
  const visit = (courseCode: string) => {
    if (visited.has(courseCode)) return;
    visited.add(courseCode);
    const course = courseByCode(courseCode);
    if (!course) return;
    for (const prerequisite of course.prerequisiteCodes) {
      addEdge(prerequisite, courseCode);
      visit(prerequisite);
    }
  };

  visit(code);
  for (const course of courses) {
    if (course.prerequisiteCodes.includes(code)) addEdge(code, course.code);
  }
  return [...edges.values()].sort(
    (left, right) =>
      left.from.localeCompare(right.from) || left.to.localeCompare(right.to),
  );
}

async function demoCatalogue(): Promise<CatalogueCourse[]> {
  const { courses } = await import("@/lib/catalogue");
  return courses.map((course) => {
    const prerequisiteEdges = demoPrerequisiteEdges(course.code, courses);
    const availableCourseCodes = new Set<string>([course.code]);
    for (const edge of prerequisiteEdges) {
      if (edge.fromIsAvailable) availableCourseCodes.add(edge.from);
      if (edge.toIsAvailable) availableCourseCodes.add(edge.to);
    }
    return {
      accent: course.accent,
      code: course.code,
      name: course.name,
      year: course.year,
      units: course.units,
      level: course.level,
      subject: course.subject,
      school: course.school,
      convener: course.convener,
      sessions: course.sessions,
      delivery: course.delivery,
      description: course.description,
      prerequisiteText: course.prerequisiteText,
      prerequisiteCodes: course.prerequisiteCodes,
      prerequisiteEdges,
      prerequisiteRule:
        course.prerequisiteText && course.prerequisiteText !== "None"
          ? {
              confidence: 0,
              expression: parseRequisiteSummary(course.prerequisiteText),
              reviewState:
                course.parseState === "Verified"
                  ? "verified"
                  : course.parseState === "Review"
                    ? "review"
                    : "automatic",
              sourceText: course.prerequisiteText,
            }
          : null,
      availableCourseCodes: [...availableCourseCodes].sort(),
      incompatibilityText: course.incompatibilities.join(", "),
      sourceUrl: course.sourceUrl,
      sourceUpdatedAt: null,
      publicationStatus: "published",
      reviewState:
        course.parseState === "Verified"
          ? "verified"
          : course.parseState === "Review"
            ? "review"
            : "automatic",
    };
  });
}

async function publishedYear(
  supabase: SupabaseClient<Database>,
  requestedYear?: number,
): Promise<{ id: number; year: number } | null> {
  let query = supabase
    .from("catalogue_years")
    .select("id,year")
    .eq("status", "published");
  if (requestedYear) {
    query = query.eq("year", requestedYear);
  }
  const { data, error } = await query
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadOfferings(
  supabase: SupabaseClient<Database>,
  courseVersionIds: readonly number[],
) {
  if (courseVersionIds.length === 0) return new Map<number, OfferingRow[]>();

  const { data: offerings, error: offeringsError } = await supabase
    .from("course_offerings")
    .select("id,course_version_id,delivery_mode")
    .in("course_version_id", [...courseVersionIds]);
  if (offeringsError) throw offeringsError;

  const offeringRows = (offerings ?? []) as OfferingRow[];
  const offeringIds = offeringRows.map((offering) => offering.id);
  if (offeringIds.length === 0) return new Map<number, OfferingRow[]>();

  const { data: sessions, error: sessionsError } = await supabase
    .from("offering_sessions")
    .select("course_offering_id,academic_period_id,delivery_mode")
    .in("course_offering_id", offeringIds);
  if (sessionsError) throw sessionsError;

  const sessionRows = (sessions ?? []) as OfferingSessionRow[];
  const periodIds = [
    ...new Set(sessionRows.map((session) => session.academic_period_id)),
  ];
  const { data: periods, error: periodsError } = periodIds.length
    ? await supabase
        .from("academic_periods")
        .select("id,name,short_name")
        .in("id", periodIds)
    : { data: [], error: null };
  if (periodsError) throw periodsError;

  const periodsById = new Map(
    ((periods ?? []) as AcademicPeriodRow[]).map((period) => [
      period.id,
      period,
    ]),
  );
  const sessionsByOffering = new Map<number, OfferingSessionRow[]>();
  for (const session of sessionRows) {
    const existing = sessionsByOffering.get(session.course_offering_id) ?? [];
    existing.push(session);
    sessionsByOffering.set(session.course_offering_id, existing);
  }

  const byCourseVersion = new Map<
    number,
    Array<
      OfferingRow & { periodNames: string[]; sessionDeliveryModes: string[] }
    >
  >();
  for (const offering of offeringRows) {
    const sessionsForOffering = sessionsByOffering.get(offering.id) ?? [];
    // offering_sessions is keyed per class, so a period with two classes
    // returns two rows. Students see availability by period, not by class.
    const periodNames = [
      ...new Set(
        sessionsForOffering
          .map((session) => periodsById.get(session.academic_period_id)?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    const enriched = {
      ...offering,
      periodNames,
      sessionDeliveryModes: [
        ...new Set(
          sessionsForOffering
            .map((session) => session.delivery_mode)
            .filter((mode): mode is string => Boolean(mode)),
        ),
      ],
    };
    const existing = byCourseVersion.get(offering.course_version_id) ?? [];
    existing.push(enriched);
    byCourseVersion.set(offering.course_version_id, existing);
  }
  return byCourseVersion;
}

function asCatalogueCourse({
  year,
  version,
  code,
  offerings,
  prerequisiteText = "No prerequisite information is available.",
  prerequisiteCodes = [],
  prerequisiteRule = null,
  prerequisiteEdges = prerequisiteCodes.map((from) => ({
    from,
    to: code,
    fromIsAvailable: true,
    toIsAvailable: true,
  })),
  incompatibilityText = "",
}: {
  year: number;
  version: CourseVersionRow;
  code: string;
  offerings: Array<
    OfferingRow & { periodNames?: string[]; sessionDeliveryModes?: string[] }
  >;
  prerequisiteText?: string;
  prerequisiteCodes?: string[];
  prerequisiteRule?: CatalogueRequisiteRule | null;
  prerequisiteEdges?: CataloguePrerequisiteEdge[];
  incompatibilityText?: string;
}): CatalogueCourse {
  const sessions = [
    ...new Set(offerings.flatMap((offering) => offering.periodNames ?? [])),
  ].sort();
  const delivery =
    offerings
      .flatMap((offering) => [
        offering.delivery_mode,
        ...(offering.sessionDeliveryModes ?? []),
      ])
      .find((mode): mode is string => Boolean(mode)) ??
    version.delivery_summary ??
    "Not listed";
  const availableCourseCodes = new Set<string>([code]);
  for (const edge of prerequisiteEdges) {
    if (edge.fromIsAvailable) availableCourseCodes.add(edge.from);
    if (edge.toIsAvailable) availableCourseCodes.add(edge.to);
  }

  return {
    accent: accentFor(code),
    code,
    name: version.title,
    year,
    units: version.units,
    level: version.level,
    subject: version.subject,
    school: version.school,
    convener: version.convener ?? "Not listed",
    sessions,
    delivery,
    description: version.description,
    prerequisiteText,
    prerequisiteCodes,
    prerequisiteEdges,
    prerequisiteRule,
    availableCourseCodes: [...availableCourseCodes].sort(),
    incompatibilityText,
    sourceUrl: sourceUrl(year, code),
    sourceUpdatedAt: version.source_updated_at,
    publicationStatus: "published",
    reviewState:
      version.review_state === "verified"
        ? "verified"
        : version.review_state === "review"
          ? "review"
          : "automatic",
  };
}

function isRecord(
  value: Json | undefined,
): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Json | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: Json | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStringArray(value: Json | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readPrerequisiteEdges(
  value: Json | undefined,
): CataloguePrerequisiteEdge[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const from = readString(item.from).toUpperCase();
    const to = readString(item.to).toUpperCase();
    if (!/^[A-Z]{4}\d{4}$/u.test(from) || !/^[A-Z]{4}\d{4}$/u.test(to)) {
      return [];
    }
    return [
      {
        from,
        to,
        fromIsAvailable: item.from_is_available === true,
        toIsAvailable: item.to_is_available === true,
      },
    ];
  });
}

function readCourseDetail(value: Json): CourseDetailPayload | null {
  if (!isRecord(value)) return null;
  const code = readString(value.code).toUpperCase();
  if (!/^[A-Z]{4}\d{4}$/u.test(code)) return null;
  const reviewState = readString(value.review_state);
  return {
    code,
    year: readNumber(value.year),
    name: readString(value.name, code),
    units: readNumber(value.units),
    level: readNumber(value.level),
    subject: readString(value.subject, code.slice(0, 4)),
    school: readString(value.school, "Not listed"),
    convener: readString(value.convener, "Not listed"),
    delivery: readString(value.delivery, "Not listed"),
    description: readString(value.description, "No description is listed."),
    sessions: readStringArray(value.sessions),
    prerequisiteText: readString(
      value.prerequisite_text,
      "No prerequisites listed.",
    ),
    prerequisiteCodes: readStringArray(value.prerequisite_codes),
    prerequisiteEdges: readPrerequisiteEdges(value.prerequisite_edges),
    prerequisiteRule: readPublishedRequisiteRule(value.prerequisite_rule),
    incompatibilityText: readString(value.incompatibility_text),
    sourceUpdatedAt:
      typeof value.source_updated_at === "string"
        ? value.source_updated_at
        : null,
    reviewState:
      reviewState === "verified"
        ? "verified"
        : reviewState === "review"
          ? "review"
          : "automatic",
  };
}

function detailAsCatalogueCourse(detail: CourseDetailPayload): CatalogueCourse {
  const availableCourseCodes = new Set<string>([detail.code]);
  for (const edge of detail.prerequisiteEdges) {
    if (edge.fromIsAvailable) availableCourseCodes.add(edge.from);
    if (edge.toIsAvailable) availableCourseCodes.add(edge.to);
  }
  return {
    accent: accentFor(detail.code),
    code: detail.code,
    name: detail.name,
    year: detail.year,
    units: detail.units,
    level: detail.level,
    subject: detail.subject,
    school: detail.school,
    convener: detail.convener,
    sessions: detail.sessions,
    delivery: detail.delivery,
    description: detail.description,
    prerequisiteText: detail.prerequisiteText,
    prerequisiteCodes: detail.prerequisiteCodes,
    prerequisiteEdges: detail.prerequisiteEdges,
    prerequisiteRule: detail.prerequisiteRule,
    availableCourseCodes: [...availableCourseCodes].sort(),
    incompatibilityText: detail.incompatibilityText,
    sourceUrl: sourceUrl(detail.year, detail.code),
    sourceUpdatedAt: detail.sourceUpdatedAt,
    publicationStatus: "published",
    reviewState: detail.reviewState,
  };
}

async function materialiseCatalogueCourses(
  supabase: SupabaseClient<Database>,
  year: { year: number },
  versionRows: CourseVersionRow[],
) {
  const courseIds = [
    ...new Set(versionRows.map((version) => version.course_id)),
  ];
  const [
    { data: courseIdentities, error: identitiesError },
    offeringsByVersion,
  ] = await Promise.all([
    courseIds.length
      ? supabase.from("courses").select("id,code").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    loadOfferings(
      supabase,
      versionRows.map((version) => version.id),
    ),
  ]);
  if (identitiesError) throw identitiesError;

  const codesById = new Map(
    ((courseIdentities ?? []) as CourseIdentityRow[]).map((course) => [
      course.id,
      course.code,
    ]),
  );
  return versionRows.flatMap((version) => {
    const code = codesById.get(version.course_id);
    return code
      ? [
          asCatalogueCourse({
            year: year.year,
            version,
            code,
            offerings: offeringsByVersion.get(version.id) ?? [],
          }),
        ]
      : [];
  });
}

function firstFilterValue(value?: string) {
  return value?.trim().slice(0, 120) ?? "";
}

function searchPattern(value: string) {
  return value
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function courseVersionIdsForSession(
  supabase: SupabaseClient<Database>,
  session: string,
) {
  const { data: periods, error: periodsError } = await supabase
    .from("academic_periods")
    .select("id")
    .eq("name", session);
  if (periodsError) throw periodsError;
  const periodIds = (periods ?? []).map((period) => period.id);
  if (periodIds.length === 0) return [];

  const { data: sessions, error: sessionsError } = await supabase
    .from("offering_sessions")
    .select("course_offering_id")
    .in("academic_period_id", periodIds);
  if (sessionsError) throw sessionsError;
  const offeringIds = [
    ...new Set((sessions ?? []).map((item) => item.course_offering_id)),
  ];
  if (offeringIds.length === 0) return [];

  const { data: offerings, error: offeringsError } = await supabase
    .from("course_offerings")
    .select("course_version_id")
    .in("id", offeringIds);
  if (offeringsError) throw offeringsError;
  return [...new Set((offerings ?? []).map((item) => item.course_version_id))];
}

async function courseIdsForCodeSearch(
  supabase: SupabaseClient<Database>,
  query: string,
) {
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .ilike("code", `%${query}%`)
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((course) => course.id);
}

export async function loadPublishedCoursePage({
  catalogueYear,
  filters = {},
  page = 1,
  pageSize = 24,
}: {
  catalogueYear?: number;
  filters?: PublishedCourseFilters;
  page?: number;
  pageSize?: number;
} = {}): Promise<PublishedCoursePage> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const query = firstFilterValue(filters.query);
  const subject = firstFilterValue(filters.subject).toUpperCase();
  const level = Number(firstFilterValue(filters.level));
  const session = firstFilterValue(filters.session);

  if (isDemoMode()) {
    const courses = (await demoCatalogue()).filter((course) => {
      const text =
        `${course.code} ${course.name} ${course.subject} ${course.school} ${course.convener}`.toLowerCase();
      return (
        (!query || text.includes(query.toLowerCase())) &&
        (!subject || course.subject === subject) &&
        (!level || course.level === level * 1000) &&
        (!session || course.sessions.includes(session))
      );
    });
    const start = (safePage - 1) * safePageSize;
    return {
      courses: courses.slice(start, start + safePageSize),
      page: safePage,
      pageSize: safePageSize,
      total: courses.length,
    };
  }

  const supabase = createPublicClient();
  const year = await publishedYear(supabase, catalogueYear);
  if (!year)
    return { courses: [], page: safePage, pageSize: safePageSize, total: 0 };

  const [codeIds, sessionVersionIds] = await Promise.all([
    query ? courseIdsForCodeSearch(supabase, searchPattern(query)) : [],
    session ? courseVersionIdsForSession(supabase, session) : null,
  ]);
  if (sessionVersionIds?.length === 0) {
    return { courses: [], page: safePage, pageSize: safePageSize, total: 0 };
  }

  let versionsQuery = supabase
    .from("course_versions")
    .select(COURSE_VERSION_SELECT, { count: "exact" })
    .eq("catalogue_year_id", year.id)
    .eq("publication_status", "published");
  if (subject) versionsQuery = versionsQuery.eq("subject", subject);
  if (Number.isInteger(level) && level > 0) {
    versionsQuery = versionsQuery.eq("level", level * 1000);
  }
  if (sessionVersionIds)
    versionsQuery = versionsQuery.in("id", sessionVersionIds);
  if (query) {
    const pattern = `*${searchPattern(query)}*`;
    const codeClause = codeIds.length
      ? `,course_id.in.(${codeIds.join(",")})`
      : "";
    versionsQuery = versionsQuery.or(
      `title.ilike.${pattern},subject.ilike.${pattern},school.ilike.${pattern},convener.ilike.${pattern}${codeClause}`,
    );
  }

  const start = (safePage - 1) * safePageSize;
  const {
    data: versions,
    count,
    error,
  } = await versionsQuery
    .order("subject")
    .order("title")
    .range(start, start + safePageSize - 1);
  if (error) throw error;
  const courses = await materialiseCatalogueCourses(
    supabase,
    year,
    (versions ?? []) as CourseVersionRow[],
  );
  return {
    courses,
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
  };
}

export async function loadPublishedCoursesByCodes(
  codes: readonly string[],
  catalogueYear?: number,
): Promise<CatalogueCourse[]> {
  const normalisedCodes = [
    ...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean)),
  ];
  if (normalisedCodes.length === 0) return [];
  if (isDemoMode()) {
    const courses = await demoCatalogue();
    return courses.filter((course) => normalisedCodes.includes(course.code));
  }

  const supabase = createPublicClient();
  const year = await publishedYear(supabase, catalogueYear);
  if (!year) return [];
  const { data: identities, error: identitiesError } = await supabase
    .from("courses")
    .select("id,code")
    .in("code", normalisedCodes);
  if (identitiesError) throw identitiesError;
  const courseIds = (identities ?? []).map((course) => course.id);
  if (courseIds.length === 0) return [];
  const { data: versions, error: versionsError } = await supabase
    .from("course_versions")
    .select(COURSE_VERSION_SELECT)
    .eq("catalogue_year_id", year.id)
    .eq("publication_status", "published")
    .in("course_id", courseIds);
  if (versionsError) throw versionsError;
  return materialiseCatalogueCourses(
    supabase,
    year,
    (versions ?? []) as CourseVersionRow[],
  );
}

export async function loadPublishedCourseFilterOptions(catalogueYear?: number) {
  if (isDemoMode()) {
    const courses = await demoCatalogue();
    return {
      subjects: [...new Set(courses.map((course) => course.subject))].sort(),
      levels: [...new Set(courses.map((course) => course.level / 1000))].sort(),
      sessions: [
        ...new Set(courses.flatMap((course) => course.sessions)),
      ].sort(),
    };
  }
  const supabase = createPublicClient();
  const year = await publishedYear(supabase, catalogueYear);
  if (!year) return { subjects: [], levels: [], sessions: [] };
  const [
    { data: versions, error: versionsError },
    { data: periods, error: periodsError },
  ] = await Promise.all([
    supabase
      .from("course_versions")
      .select("subject,level")
      .eq("catalogue_year_id", year.id)
      .eq("publication_status", "published"),
    supabase
      .from("academic_periods")
      .select("name")
      .eq("calendar_year", year.year)
      .eq("status", "published"),
  ]);
  if (versionsError) throw versionsError;
  if (periodsError) throw periodsError;
  return {
    subjects: [...new Set((versions ?? []).map((item) => item.subject))].sort(),
    levels: [
      ...new Set((versions ?? []).map((item) => item.level / 1000)),
    ].sort(),
    sessions: [...new Set((periods ?? []).map((item) => item.name))].sort(),
  };
}

export async function loadPublishedCourses(
  catalogueYear?: number,
): Promise<CatalogueCourse[]> {
  return (
    await loadPublishedCoursePage({
      catalogueYear,
      pageSize: 100,
    })
  ).courses;
}

export async function loadPublishedCourse(
  code: string,
): Promise<CatalogueCourse | null> {
  const normalisedCode = code.trim().toUpperCase();
  if (!/^[A-Z]{4}\d{4}$/u.test(normalisedCode)) return null;
  if (isDemoMode()) {
    const courses = await demoCatalogue();
    return courses.find((course) => course.code === normalisedCode) ?? null;
  }

  return unstable_cache(
    async () => {
      const { data, error } = await createPublicClient().rpc(
        "published_course_detail",
        { p_course_code: normalisedCode },
      );
      if (error) throw error;
      const detail = data ? readCourseDetail(data) : null;
      return detail ? detailAsCatalogueCourse(detail) : null;
    },
    ["published-course-detail", normalisedCode],
    {
      revalidate: 300,
      tags: ["published-course-detail", `published-course:${normalisedCode}`],
    },
  )();
}
