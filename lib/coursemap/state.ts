import type { AppState } from "@/app/providers";
import type { AuthViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

type PlanItemRow = {
  academic_year_id: number;
  course_id: number;
  id: string;
  planned_calendar_year: number | null;
  planned_period_code: string | null;
};

type CourseAttemptRow = {
  academic_period_id: number;
  course_id: number;
  course_snapshot_id: number;
  id: string;
  mark: number | null;
  status: string;
  units_attempted: number;
  units_earned: number;
};

export function emptyCoursemapState(viewer: AuthViewer): AppState {
  return {
    schemaVersion: 1,
    profile: {
      name: "",
      studentId: "",
      email: viewer.email ?? "",
      commencementYear: new Date().getFullYear(),
      catalogueYear: new Date().getFullYear(),
      degreeCode: "",
      majorCode: "",
      studyLoad: "Full time",
      extensionYears: 0,
    },
    attempts: [],
  };
}

export async function hasPrimaryPlan(viewer: AuthViewer) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id")
      .eq("owner_id", viewer.id)
      .eq("is_primary", true)
      .maybeSingle();
    return !error && Boolean(data);
  } catch {
    return false;
  }
}

export async function loadCoursemapState(
  viewer: AuthViewer,
): Promise<AppState> {
  const fallback = emptyCoursemapState(viewer);

  try {
    const supabase = await createClient();
    const [{ data: profile }, { data: plan }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,student_number")
        .eq("id", viewer.id)
        .maybeSingle(),
      supabase
        .from("plans")
        .select(
          "id,catalogue_year_id,commencement_year,study_load,extension_years",
        )
        .eq("owner_id", viewer.id)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    const state: AppState = {
      ...fallback,
      profile: {
        ...fallback.profile,
        name: profile?.display_name ?? "",
        studentId: profile?.student_number ?? "",
      },
    };
    if (!plan) return state;

    const [yearResult, structuresResult, itemsResult, attemptsResult] =
      await Promise.all([
        supabase
          .from("catalogue_years")
          .select("year")
          .eq("id", plan.catalogue_year_id)
          .maybeSingle(),
        supabase
          .from("plan_structures")
          .select("role,structure_version_id")
          .eq("plan_id", plan.id)
          .order("position"),
        supabase
          .from("plan_items")
          .select(
            "id,course_id,academic_year_id,planned_calendar_year,planned_period_code,sort_order",
          )
          .eq("plan_id", plan.id)
          .order("sort_order"),
        supabase
          .from("course_attempts")
          .select(
            "id,course_id,course_snapshot_id,academic_period_id,status,mark,units_attempted,units_earned",
          )
          .eq("owner_id", viewer.id)
          .order("created_at"),
      ]);

    const structures = structuresResult.data ?? [];
    const structureVersionIds = structures.map(
      (item) => item.structure_version_id,
    );
    const { data: versions } = structureVersionIds.length
      ? await supabase
          .from("academic_structure_versions")
          .select("id,structure_id")
          .in("id", structureVersionIds)
      : { data: [] };
    const structureIds = (versions ?? []).map((item) => item.structure_id);
    const { data: structureIdentities } = structureIds.length
      ? await supabase
          .from("academic_structures")
          .select("id,code")
          .in("id", structureIds)
      : { data: [] };
    const structureCodeByVersion = new Map(
      (versions ?? []).map((version) => [
        version.id,
        (structureIdentities ?? []).find(
          (identity) => identity.id === version.structure_id,
        )?.code,
      ]),
    );

    // These columns are introduced by the clean snapshot cutover migration.
    // Keep the row contract local while generated database types are refreshed.
    const items = (itemsResult.data ?? []) as unknown as PlanItemRow[];
    const attempts = (attemptsResult.data ??
      []) as unknown as CourseAttemptRow[];
    const courseIds = [
      ...new Set([
        ...items.map((item) => item.course_id),
        ...attempts.map((attempt) => attempt.course_id),
      ]),
    ];
    const periodIds = [
      ...new Set(attempts.map((item) => item.academic_period_id)),
    ];
    const snapshotIds = [
      ...new Set(attempts.map((item) => item.course_snapshot_id)),
    ];
    const [{ data: courseIdentities }, { data: periods }, snapshotsResult] =
      await Promise.all([
        courseIds.length
          ? supabase.from("courses").select("id,code").in("id", courseIds)
          : Promise.resolve({ data: [] }),
        periodIds.length
          ? supabase
              .from("academic_periods")
              .select("id,calendar_year,code")
              .in("id", periodIds)
          : Promise.resolve({ data: [] }),
        snapshotIds.length
          ? supabase
              .from("course_snapshots")
              .select("id,academic_year_id")
              .in("id", snapshotIds)
          : Promise.resolve({ data: [] }),
      ]);
    const academicYearIds = [
      ...new Set([
        ...items.map((item) => item.academic_year_id),
        ...(snapshotsResult.data ?? []).map(
          (snapshot) => snapshot.academic_year_id,
        ),
      ]),
    ];
    const { data: academicYears } = academicYearIds.length
      ? await supabase
          .from("academic_years")
          .select("id,year")
          .in("id", academicYearIds)
      : { data: [] };
    const academicYearById = new Map(
      (academicYears ?? []).map((year) => [year.id, year.year]),
    );
    const snapshotAcademicYearId = new Map(
      (snapshotsResult.data ?? []).map((snapshot) => [
        snapshot.id,
        snapshot.academic_year_id,
      ]),
    );
    const courseCode = new Map(
      (courseIdentities ?? []).map((course) => [course.id, course.code]),
    );
    const periodById = new Map(
      (periods ?? []).map((period) => [period.id, period]),
    );

    const plannedAttempts = items.flatMap((item) => {
      const code = courseCode.get(item.course_id);
      if (!code) return [];
      return [
        {
          id: item.id,
          academicYear: academicYearById.get(item.academic_year_id),
          courseCode: code,
          termId:
            item.planned_calendar_year && item.planned_period_code
              ? `${item.planned_calendar_year}-${item.planned_period_code.toLowerCase()}`
              : "unscheduled",
          status: "planned" as const,
        },
      ];
    });
    const recordedAttempts = attempts.flatMap((attempt) => {
      const code = courseCode.get(attempt.course_id);
      const period = periodById.get(attempt.academic_period_id);
      if (
        !code ||
        !period ||
        !["completed", "failed", "enrolled"].includes(attempt.status)
      )
        return [];
      return [
        {
          id: attempt.id,
          academicYear: academicYearById.get(
            snapshotAcademicYearId.get(attempt.course_snapshot_id) ?? -1,
          ),
          courseCode: code,
          snapshotId: attempt.course_snapshot_id,
          termId: `${period.calendar_year}-${period.code.toLowerCase()}`,
          status: attempt.status as "completed" | "failed" | "enrolled",
          mark: attempt.mark ?? undefined,
          unitsAttempted: Number(attempt.units_attempted),
          unitsEarned: Number(attempt.units_earned),
        },
      ];
    });

    return {
      schemaVersion: 1,
      profile: {
        ...state.profile,
        commencementYear: plan.commencement_year,
        catalogueYear: yearResult.data?.year ?? state.profile.catalogueYear,
        studyLoad: plan.study_load === "part_time" ? "Part time" : "Full time",
        extensionYears: plan.extension_years,
        degreeCode:
          structureCodeByVersion.get(
            structures.find((item) => item.role === "programme")
              ?.structure_version_id ?? -1,
          ) ?? state.profile.degreeCode,
        majorCode:
          structureCodeByVersion.get(
            structures.find((item) => item.role === "major")
              ?.structure_version_id ?? -1,
          ) ?? "",
      },
      attempts: [...plannedAttempts, ...recordedAttempts],
    };
  } catch {
    return fallback;
  }
}
