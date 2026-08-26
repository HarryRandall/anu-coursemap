import "server-only";

import { getAuthViewer } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CompletedRequisiteCourse } from "./requisite-summary";

export type RequisiteCompletionSnapshot = {
  completedCourses: CompletedRequisiteCourse[];
  /** Codes of the programmes on the viewer's primary plan. */
  enrolledProgrammeCodes: string[];
  isAuthenticated: boolean;
};

type AttemptRow = {
  course_id: number;
  units_earned: number;
};

type CourseRow = { code: string; id: number };

/**
 * This intentionally reads only completed attempts. A planned or enrolled
 * course can help a plan, but cannot satisfy wording that requires completion.
 */
export async function loadCurrentUserRequisiteCompletion(): Promise<RequisiteCompletionSnapshot> {
  if (isDemoMode()) {
    return {
      completedCourses: [],
      enrolledProgrammeCodes: [],
      isAuthenticated: false,
    };
  }

  const viewer = await getAuthViewer();
  if (!viewer) {
    return {
      completedCourses: [],
      enrolledProgrammeCodes: [],
      isAuthenticated: false,
    };
  }

  try {
    const supabase = await createClient();
    const { data: attempts, error: attemptsError } = await supabase
      .from("course_attempts")
      .select("course_id,units_earned")
      .eq("owner_id", viewer.id)
      .eq("status", "completed");
    if (attemptsError) throw attemptsError;

    const attemptRows = (attempts ?? []) as AttemptRow[];
    const courseIds = [
      ...new Set(attemptRows.map((attempt) => attempt.course_id)),
    ];
    const { data: courses, error: coursesError } = courseIds.length
      ? await supabase.from("courses").select("code,id").in("id", courseIds)
      : { data: [], error: null };
    if (coursesError) throw coursesError;

    const codeByCourseId = new Map(
      ((courses ?? []) as CourseRow[]).map((course) => [
        course.id,
        course.code,
      ]),
    );
    return {
      completedCourses: attemptRows.flatMap((attempt) => {
        const code = codeByCourseId.get(attempt.course_id);
        return code && attempt.units_earned > 0
          ? [{ code, units: attempt.units_earned }]
          : [];
      }),
      enrolledProgrammeCodes: await loadEnrolledProgrammeCodes(
        supabase,
        viewer.id,
      ),
      isAuthenticated: true,
    };
  } catch {
    return {
      completedCourses: [],
      enrolledProgrammeCodes: [],
      isAuthenticated: true,
    };
  }
}

/**
 * Programme enrolment is read from the viewer's primary plan, which is the
 * only place Coursemap records what someone is enrolled in.
 */
async function loadEnrolledProgrammeCodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
): Promise<string[]> {
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("is_primary", true)
    .maybeSingle();
  if (planError || !plan) return [];

  const { data: planStructures, error: planStructuresError } = await supabase
    .from("plan_structures")
    .select("structure_version_id")
    .eq("plan_id", plan.id)
    .eq("role", "programme");
  if (planStructuresError) return [];
  const versionIds = (planStructures ?? []).map(
    (row) => row.structure_version_id,
  );
  if (versionIds.length === 0) return [];

  const { data: versions, error: versionsError } = await supabase
    .from("academic_structure_versions")
    .select("structure_id")
    .in("id", versionIds);
  if (versionsError) return [];
  const structureIds = [
    ...new Set((versions ?? []).map((version) => version.structure_id)),
  ];
  if (structureIds.length === 0) return [];

  const { data: structures, error: structuresError } = await supabase
    .from("academic_structures")
    .select("code")
    .in("id", structureIds);
  if (structuresError) return [];
  return (structures ?? []).map((structure) => structure.code.toUpperCase());
}
