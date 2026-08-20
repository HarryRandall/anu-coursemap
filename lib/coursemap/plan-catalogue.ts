import "server-only";

import type { Course, Degree, Major, Term } from "@/lib/coursemap/types";
import { isDemoMode } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public-server";
import { loadPublishedCoursesByCodes } from "@/lib/coursemap/published-catalogue";
import type { CatalogueCourse } from "@/lib/coursemap/catalogue-types";
import { getAuthViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { collectPlanCatalogueCourseIds } from "@/lib/coursemap/plan-course-ids";

export type PlanCatalogue = {
  courses: Course[];
  terms: Term[];
  degrees: Degree[];
  majors: Major[];
  programmeRequirementsImported: boolean;
};

type AcademicPeriodRow = {
  calendar_year: number;
  code: string;
  ends_on: string;
  name: string;
  short_name: string;
  starts_on: string;
};
type StructureVersionRow = {
  duration_years: number | null;
  name: string;
  structure_id: number;
  units: number;
};
type StructureIdentityRow = { code: string; id: number; kind: string };

function formatDateRange(startsOn: string, endsOn: string) {
  const format = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${format.format(new Date(startsOn))} to ${format.format(new Date(endsOn))}`;
}

function planCourseFromCatalogue(course: CatalogueCourse): Course {
  return {
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
    incompatibilities: course.incompatibilityText
      ? [course.incompatibilityText]
      : [],
    // Requirement allocation and permission rules are intentionally omitted
    // until their source structures have been imported and reviewed.
    countsTowards: [],
    sourceUrl: course.sourceUrl,
    lastChanged: course.sourceUpdatedAt ?? "Not listed",
    parseState:
      course.reviewState === "verified"
        ? "Verified"
        : course.reviewState === "review"
          ? "Review"
          : "Automatic",
    accent: course.accent,
  };
}

export async function loadPublishedPlanCatalogue(
  catalogueYear?: number,
  courseCodes: readonly string[] = [],
): Promise<PlanCatalogue> {
  if (isDemoMode()) {
    const {
      courses: demoCourses,
      degrees: demoDegrees,
      majors: demoMajors,
      terms: demoTerms,
    } = await import("@/lib/catalogue");
    return {
      courses: demoCourses,
      terms: demoTerms,
      degrees: demoDegrees,
      majors: demoMajors,
      programmeRequirementsImported: true,
    };
  }

  const supabase = createPublicClient();
  const yearsResult = catalogueYear
    ? await supabase
        .from("catalogue_years")
        .select("id,year")
        .eq("status", "published")
        .eq("year", catalogueYear)
        .maybeSingle()
    : await supabase
        .from("catalogue_years")
        .select("id,year")
        .eq("status", "published")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
  if (yearsResult.error) throw yearsResult.error;
  const catalogueYearRecord = yearsResult.data;
  if (!catalogueYearRecord) {
    return {
      courses: [],
      terms: [],
      degrees: [],
      majors: [],
      programmeRequirementsImported: false,
    };
  }
  const [catalogueCourses, periodsResult, structureVersionsResult] =
    await Promise.all([
      loadPublishedCoursesByCodes(courseCodes, catalogueYearRecord.year),
      supabase
        .from("academic_periods")
        .select("calendar_year,code,ends_on,name,short_name,starts_on")
        .eq("calendar_year", catalogueYearRecord.year)
        .eq("status", "published")
        .order("calendar_year")
        .order("sort_order"),
      supabase
        .from("academic_structure_versions")
        .select("duration_years,name,structure_id,units")
        .eq("catalogue_year_id", catalogueYearRecord.id)
        .eq("publication_status", "published"),
    ]);
  if (periodsResult.error) throw periodsResult.error;
  if (structureVersionsResult.error) throw structureVersionsResult.error;

  const structureVersions = (structureVersionsResult.data ??
    []) as StructureVersionRow[];
  const structureIds = [
    ...new Set(structureVersions.map((version) => version.structure_id)),
  ];
  const { data: structureIdentities, error: structureIdentitiesError } =
    structureIds.length
      ? await supabase
          .from("academic_structures")
          .select("code,id,kind")
          .in("id", structureIds)
      : { data: [], error: null };
  if (structureIdentitiesError) throw structureIdentitiesError;

  const identitiesById = new Map(
    ((structureIdentities ?? []) as StructureIdentityRow[]).map((identity) => [
      identity.id,
      identity,
    ]),
  );
  const degrees = structureVersions.flatMap((version) => {
    const identity = identitiesById.get(version.structure_id);
    if (!identity || identity.kind !== "degree") return [];
    return [
      {
        code: identity.code,
        name: version.name,
        units: version.units,
        duration: version.duration_years ?? 0,
        college: "Not listed",
        description:
          "Programme requirements will appear after their source is imported.",
      } satisfies Degree,
    ];
  });
  const majors = structureVersions.flatMap((version) => {
    const identity = identitiesById.get(version.structure_id);
    if (!identity || identity.kind !== "major") return [];
    return [
      {
        code: identity.code,
        name: version.name,
        units: version.units,
        colour: "zinc",
        description:
          "Major requirements will appear after their source is imported.",
        courseCodes: [],
      } satisfies Major,
    ];
  });

  const terms: Term[] = ((periodsResult.data ?? []) as AcademicPeriodRow[]).map(
    (period) => ({
      id: `${period.calendar_year}-${period.code.toLowerCase()}`,
      year: period.calendar_year,
      name: period.name,
      shortName: period.short_name,
      dates: formatDateRange(period.starts_on, period.ends_on),
      startsOn: period.starts_on,
      endsOn: period.ends_on,
    }),
  );
  terms.push({
    id: "unscheduled",
    year: 9999,
    name: "Later",
    shortName: "Later",
    dates: "Choose when ready",
  });

  return {
    courses: catalogueCourses.map(planCourseFromCatalogue),
    terms,
    degrees,
    majors,
    programmeRequirementsImported: false,
  };
}

/** Loads the catalogue year saved on the signed-in user's primary plan. */
export async function loadCurrentUserPlanCatalogue(): Promise<PlanCatalogue> {
  if (isDemoMode()) return loadPublishedPlanCatalogue();

  const viewer = await getAuthViewer();
  if (!viewer) return loadPublishedPlanCatalogue();

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .select("id,catalogue_year_id")
    .eq("owner_id", viewer.id)
    .eq("is_primary", true)
    .maybeSingle();
  if (error || !plan) return loadPublishedPlanCatalogue();

  const { data: year, error: yearError } = await supabase
    .from("catalogue_years")
    .select("year")
    .eq("id", plan.catalogue_year_id)
    .maybeSingle();
  if (yearError || !year) return loadPublishedPlanCatalogue();

  const [itemsResult, attemptsResult] = await Promise.all([
    supabase.from("plan_items").select("course_id").eq("plan_id", plan.id),
    supabase
      .from("course_attempts")
      .select("course_id")
      .eq("owner_id", viewer.id),
  ]);
  if (itemsResult.error || attemptsResult.error) {
    return loadPublishedPlanCatalogue(year.year);
  }
  const courseIds = collectPlanCatalogueCourseIds(
    itemsResult.data ?? [],
    attemptsResult.data ?? [],
  );
  const { data: courses, error: coursesError } = courseIds.length
    ? await supabase.from("courses").select("code").in("id", courseIds)
    : { data: [], error: null };
  if (coursesError) return loadPublishedPlanCatalogue(year.year);
  return loadPublishedPlanCatalogue(
    year.year,
    (courses ?? []).map((course) => course.code),
  );
}
