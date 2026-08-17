"use server";

import { revalidatePath } from "next/cache";
import type { Profile } from "@/app/providers";
import type { AttemptStatus } from "@/lib/coursemap/types";
import { createClient } from "@/lib/supabase/server";

export type CoursemapActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

function termParts(termId: string) {
  if (termId === "unscheduled") {
    return { year: undefined, period: undefined };
  }

  const match = /^(\d{4})-([a-z0-9-]+)$/i.exec(termId);
  if (!match) throw new Error("That study period is not valid.");
  return { year: Number(match[1]), period: match[2].toUpperCase() };
}

function failure(error: unknown): CoursemapActionResult {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "Coursemap could not save that change.";
  return { ok: false, message };
}

export async function saveProfileAndPlan(
  profile: Profile,
): Promise<CoursemapActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "save_current_user_primary_plan",
      {
        p_display_name: profile.name,
        p_student_number: profile.studentId,
        p_catalogue_year: profile.catalogueYear,
        p_commencement_year: profile.commencementYear,
        p_study_load:
          profile.studyLoad === "Part time" ? "part_time" : "full_time",
        p_programme_code: profile.degreeCode,
        p_major_code: profile.majorCode || undefined,
      },
    );
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, id: data, message: "Profile and academic plan saved" };
  } catch (error) {
    return failure(error);
  }
}

export async function addPlanCourse(
  courseCode: string,
  termId: string,
): Promise<CoursemapActionResult> {
  try {
    const supabase = await createClient();
    const { year, period } = termParts(termId);
    const { data, error } = await supabase.rpc("add_current_user_plan_item", {
      p_course_code: courseCode,
      p_planned_calendar_year: year,
      p_planned_period_code: period,
    });
    if (error) throw error;
    revalidatePath("/plan");
    return { ok: true, id: data, message: `${courseCode} added to the plan` };
  } catch (error) {
    return failure(error);
  }
}

export async function movePlanCourse(
  planItemId: string,
  termId: string,
  beforePlanItemId?: string,
): Promise<CoursemapActionResult> {
  try {
    const supabase = await createClient();
    const { year, period } = termParts(termId);
    const { error } = await supabase.rpc("move_current_user_plan_item", {
      p_plan_item_id: planItemId,
      p_planned_calendar_year: year,
      p_planned_period_code: period,
      p_before_plan_item_id: beforePlanItemId,
    });
    if (error) throw error;
    revalidatePath("/plan");
    return { ok: true, message: "Course moved" };
  } catch (error) {
    return failure(error);
  }
}

export async function removePlanCourse(
  planItemId: string,
): Promise<CoursemapActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "remove_current_user_plan_item",
      { p_plan_item_id: planItemId },
    );
    if (error) throw error;
    return data
      ? { ok: true, message: "Course removed from the plan" }
      : { ok: false, message: "Course was not found in your plan" };
  } catch (error) {
    return failure(error);
  }
}

export async function recordCourseAttempt(
  planItemId: string,
  status: Exclude<AttemptStatus, "planned">,
  mark?: number,
): Promise<CoursemapActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "record_current_user_course_attempt",
      {
        p_plan_item_id: planItemId,
        p_attempt_status: status,
        p_attempt_mark: mark,
      },
    );
    if (error) throw error;
    revalidatePath("/plan");
    return { ok: true, id: data, message: "Academic history updated" };
  } catch (error) {
    return failure(error);
  }
}
