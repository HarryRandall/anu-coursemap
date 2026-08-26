"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import type { CoursemapActionResult } from "@/lib/coursemap/actions";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Coursemap could not publish this catalogue record.";
}

export type CourseReviewDraftInput = {
  catalogueYear: number;
  code: string;
  convener: string;
  deliverySummary: string;
  description: string;
  level: number;
  reviewState: "review" | "verified";
  school: string;
  subject: string;
  title: string;
  units: number;
};

function nonBlank(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new TypeError(`${label} is required.`);
  return trimmed;
}

function optionalText(value: string) {
  return value.trim() || null;
}

function normaliseCourseReviewDraft(input: CourseReviewDraftInput) {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z]{4}\d{4}$/.test(code)) {
    throw new TypeError("Choose a valid course code.");
  }
  if (
    !Number.isInteger(input.catalogueYear) ||
    input.catalogueYear < 2000 ||
    input.catalogueYear > 2200
  ) {
    throw new TypeError("Choose a valid catalogue year.");
  }
  if (!Number.isFinite(input.units) || input.units <= 0) {
    throw new TypeError("Units must be greater than zero.");
  }
  if (!Number.isInteger(input.level) || input.level < 0 || input.level > 9999) {
    throw new TypeError("Level must be a whole number between 0 and 9999.");
  }
  if (!["review", "verified"].includes(input.reviewState)) {
    throw new TypeError("Choose a valid review state.");
  }

  return {
    catalogueYear: input.catalogueYear,
    code,
    convener: optionalText(input.convener),
    deliverySummary: optionalText(input.deliverySummary),
    description: nonBlank(input.description, "Description"),
    level: input.level,
    reviewState: input.reviewState,
    school: nonBlank(input.school, "School"),
    subject: nonBlank(input.subject, "Subject"),
    title: nonBlank(input.title, "Course title"),
    units: input.units,
  };
}

async function canPublish() {
  if (!(await canManageCatalogueImports())) {
    return {
      ok: false,
      message: "Catalogue import permission is required.",
    } satisfies CoursemapActionResult;
  }
  return null;
}

/**
 * Saves reviewer corrections to a draft course version only. The imported
 * source document is intentionally not changed, preserving its provenance for
 * comparison during the review.
 */
export async function saveCourseReviewDraft(
  input: CourseReviewDraftInput,
): Promise<CoursemapActionResult> {
  const denied = await canPublish();
  if (denied) return denied;

  try {
    const draft = normaliseCourseReviewDraft(input);
    const supabase = await createClient();
    const { data: year, error: yearError } = await supabase
      .from("catalogue_years")
      .select("id")
      .eq("year", draft.catalogueYear)
      .maybeSingle();
    if (yearError) throw yearError;
    if (!year) {
      return { ok: false, message: "The catalogue year was not found." };
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("code", draft.code)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) {
      return { ok: false, message: "The course record was not found." };
    }

    const { data: updated, error: updateError } = await supabase
      .from("course_versions")
      .update({
        convener: draft.convener,
        delivery_summary: draft.deliverySummary,
        description: draft.description,
        level: draft.level,
        review_state: draft.reviewState,
        school: draft.school,
        subject: draft.subject,
        title: draft.title,
        units: draft.units,
      })
      .eq("catalogue_year_id", year.id)
      .eq("course_id", course.id)
      .eq("publication_status", "draft")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return {
        ok: false,
        message: "Only a draft course version can be changed here.",
      };
    }

    const { error: ruleReviewError } = await supabase
      .from("course_rules")
      .update({ review_state: draft.reviewState })
      .eq("course_version_id", updated.id);
    if (ruleReviewError) throw ruleReviewError;

    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${draft.code}`);
    return {
      ok: true,
      message:
        draft.reviewState === "verified"
          ? `${draft.code} was saved and marked verified.`
          : `${draft.code} draft changes were saved for further review.`,
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function publishCourseVersion(
  code: string,
  catalogueYear: number,
): Promise<CoursemapActionResult> {
  const denied = await canPublish();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("publish_catalogue_course_version", {
      p_course_code: code,
      p_catalogue_year: catalogueYear,
    });
    if (error) throw error;
    revalidatePath("/courses");
    revalidatePath(`/courses/${code}`);
    revalidatePath("/plan");
    revalidatePath("/admin/courses");
    revalidateTag("published-course-detail", "max");
    revalidateTag(`published-course:${code.toUpperCase()}`, "max");
    return {
      ok: true,
      message: `${code.toUpperCase()} is now available to students.`,
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function publishStructureVersion(
  code: string,
  catalogueYear: number,
): Promise<CoursemapActionResult> {
  const denied = await canPublish();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc(
      "publish_catalogue_structure_version",
      {
        p_structure_code: code,
        p_catalogue_year: catalogueYear,
      },
    );
    if (error) throw error;
    revalidatePath("/onboarding");
    revalidatePath("/profile");
    revalidatePath("/plan");
    revalidatePath("/admin/programmes");
    return {
      ok: true,
      message: `${code.toUpperCase()} is now available for student plans.`,
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

/**
 * Archiving keeps the imported record and its provenance while taking it out
 * of the working set. Nothing is deleted, so a mistaken archive is reversible
 * by republishing.
 */
export async function archiveCourseVersion(
  code: string,
  catalogueYear: number,
): Promise<CoursemapActionResult> {
  const denied = await canPublish();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const { data: year, error: yearError } = await supabase
      .from("catalogue_years")
      .select("id")
      .eq("year", catalogueYear)
      .maybeSingle();
    if (yearError) throw yearError;
    if (!year) return { ok: false, message: "Unknown catalogue year." };

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) return { ok: false, message: `${code} was not found.` };

    const { data: updated, error: updateError } = await supabase
      .from("course_versions")
      .update({ publication_status: "archived" })
      .eq("catalogue_year_id", year.id)
      .eq("course_id", course.id)
      .neq("publication_status", "archived")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return { ok: false, message: `${code} is already archived.` };
    }

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { ok: true, message: `${code} was archived.` };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function archiveStructureVersion(
  code: string,
  catalogueYear: number,
): Promise<CoursemapActionResult> {
  const denied = await canPublish();
  if (denied) return denied;

  try {
    const supabase = await createClient();
    const { data: year, error: yearError } = await supabase
      .from("catalogue_years")
      .select("id")
      .eq("year", catalogueYear)
      .maybeSingle();
    if (yearError) throw yearError;
    if (!year) return { ok: false, message: "Unknown catalogue year." };

    const { data: structure, error: structureError } = await supabase
      .from("academic_structures")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (structureError) throw structureError;
    if (!structure) return { ok: false, message: `${code} was not found.` };

    const { data: updated, error: updateError } = await supabase
      .from("academic_structure_versions")
      .update({ publication_status: "archived" })
      .eq("catalogue_year_id", year.id)
      .eq("structure_id", structure.id)
      .neq("publication_status", "archived")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return { ok: false, message: `${code} is already archived.` };
    }

    revalidatePath("/admin/programmes");
    revalidatePath("/onboarding");
    return { ok: true, message: `${code} was archived.` };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
