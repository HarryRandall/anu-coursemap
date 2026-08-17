import "server-only";

import { getAuthViewer } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CompletedRequisiteCourse } from "./requisite-summary";

export type RequisiteCompletionSnapshot = {
  completedCourses: CompletedRequisiteCourse[];
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
    return { completedCourses: [], isAuthenticated: false };
  }

  const viewer = await getAuthViewer();
  if (!viewer) return { completedCourses: [], isAuthenticated: false };

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
      isAuthenticated: true,
    };
  } catch {
    return { completedCourses: [], isAuthenticated: true };
  }
}
