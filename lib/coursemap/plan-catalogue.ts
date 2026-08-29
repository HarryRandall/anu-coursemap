import "server-only";

import type { Course, Degree, Major, Term } from "@/lib/coursemap/types";
import { isDemoMode } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public-server";
import {
  courseFromSnapshotProjection,
  loadPublishedCoursesBySelections,
} from "@/lib/coursemap/published-courses";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import { getAuthViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { collectPlanCatalogueCourseIds } from "@/lib/coursemap/plan-course-ids";

export type PlanCatalogue = {
  courses: Course[];
  /** Snapshot-pinned course rows used only by recorded attempts. */
  snapshotCourses?: Course[];
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
type PlanCourseRow = { academic_year_id: number; course_id: number };
type AttemptCourseRow = {
  course_id: number;
  course_snapshot_id: number;
};
type AttemptSnapshotRow = {
  academic_year_id: number;
  id: number;
};

function formatDateRange(startsOn: string, endsOn: string) {
  const format = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${format.format(new Date(startsOn))} to ${format.format(new Date(endsOn))}`;
}

function planCourseFromDetails(course: CourseDetails): Course {
  return {
    code: course.code,
    name: course.name,
    year: course.year,
    snapshotId: course.snapshotId,
    units: course.units,
    unitValue: course.unitValue,
    level: course.level,
    subject: course.subject,
    school: course.school,
    convener: course.convener,
    sessions: course.sessions,
    delivery: course.delivery,
    description: course.description,
    prerequisiteText: course.prerequisiteText,
    prerequisiteCodes: course.prerequisiteCodes,
    prerequisiteRule: course.prerequisiteRule,
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
  courseSelections: readonly { code: string; year: number }[] = [],
): Promise<PlanCatalogue> {
  if (isDemoMode()) {
    const {
      courses: demoCourses,
      degrees: demoDegrees,
      majors: demoMajors,
      terms: demoTerms,
    } = await import("@/lib/catalogue");
    const planningYears = [
      ...new Set(
        demoTerms
          .filter((term) => term.id !== "unscheduled")
          .map((term) => term.year),
      ),
    ];
    const annualDemoCourses = demoCourses.flatMap((course) =>
      planningYears.map((year) => ({
        ...course,
        year,
        sourceUrl: course.sourceUrl.replace(/\/\d{4}\//u, `/${year}/`),
      })),
    );
    return {
      courses: annualDemoCourses,
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
      loadPublishedCoursesBySelections(courseSelections),
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
    courses: catalogueCourses.map(planCourseFromDetails),
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
    supabase
      .from("plan_items")
      .select("course_id,academic_year_id")
      .eq("plan_id", plan.id),
    supabase
      .from("course_attempts")
      .select("course_id,course_snapshot_id")
      .eq("owner_id", viewer.id),
  ]);
  if (itemsResult.error || attemptsResult.error) {
    return loadPublishedPlanCatalogue(year.year);
  }
  // These columns are introduced by the clean snapshot cutover migration.
  // Keep the row contract local while generated database types are refreshed.
  const planItems = (itemsResult.data ?? []) as unknown as PlanCourseRow[];
  const courseAttempts = (attemptsResult.data ??
    []) as unknown as AttemptCourseRow[];
  const courseIds = collectPlanCatalogueCourseIds(planItems, courseAttempts);
  const academicYearIds = [
    ...new Set(planItems.map((item) => item.academic_year_id)),
  ];
  const snapshotIds = [
    ...new Set(courseAttempts.map((attempt) => attempt.course_snapshot_id)),
  ];
  const [coursesResult, snapshotsResult] = await Promise.all([
    courseIds.length
      ? supabase.from("courses").select("id,code").in("id", courseIds)
      : Promise.resolve({ data: [], error: null }),
    snapshotIds.length
      ? supabase
          .from("course_snapshots")
          .select("id,academic_year_id")
          .in("id", snapshotIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (coursesResult.error || snapshotsResult.error) {
    return loadPublishedPlanCatalogue(year.year);
  }
  const attemptSnapshots = (snapshotsResult.data ?? []) as AttemptSnapshotRow[];
  const allAcademicYearIds = [
    ...new Set([
      ...academicYearIds,
      ...attemptSnapshots.map((snapshot) => snapshot.academic_year_id),
    ]),
  ];
  const academicYearsResult = allAcademicYearIds.length
    ? await supabase
        .from("academic_years")
        .select("id,year")
        .in("id", allAcademicYearIds)
    : { data: [], error: null };
  if (academicYearsResult.error) {
    return loadPublishedPlanCatalogue(year.year);
  }
  const codeByCourseId = new Map(
    (coursesResult.data ?? []).map((course) => [course.id, course.code]),
  );
  const yearByAcademicYearId = new Map(
    (academicYearsResult.data ?? []).map((academicYear) => [
      academicYear.id,
      academicYear.year,
    ]),
  );
  const academicYearIdBySnapshotId = new Map(
    attemptSnapshots.map((snapshot) => [
      snapshot.id,
      snapshot.academic_year_id,
    ]),
  );
  const selections = [
    ...planItems.flatMap((item) => {
      const code = codeByCourseId.get(item.course_id);
      const academicYear = yearByAcademicYearId.get(item.academic_year_id);
      return code && academicYear ? [{ code, year: academicYear }] : [];
    }),
    ...courseAttempts.flatMap((attempt) => {
      const code = codeByCourseId.get(attempt.course_id);
      const academicYear = yearByAcademicYearId.get(
        academicYearIdBySnapshotId.get(attempt.course_snapshot_id) ?? -1,
      );
      return code && academicYear ? [{ code, year: academicYear }] : [];
    }),
  ];
  const catalogue = await loadPublishedPlanCatalogue(year.year, selections);
  const publishedSnapshotIds = new Set(
    catalogue.courses.flatMap((course) =>
      course.snapshotId === undefined ? [] : [course.snapshotId],
    ),
  );
  const historicalSnapshotIds = snapshotIds.filter(
    (snapshotId) => !publishedSnapshotIds.has(snapshotId),
  );
  const projectionsResult = historicalSnapshotIds.length
    ? await supabase.rpc("current_user_course_attempt_snapshot_projections", {
        p_snapshot_ids: historicalSnapshotIds,
      })
    : { data: [], error: null };
  if (projectionsResult.error) return catalogue;

  const snapshotCourses = (projectionsResult.data ?? []).flatMap((row) => {
    const course = courseFromSnapshotProjection(
      row.projection,
      row.snapshot_id,
    );
    return course ? [planCourseFromDetails(course)] : [];
  });
  return { ...catalogue, snapshotCourses };
}
