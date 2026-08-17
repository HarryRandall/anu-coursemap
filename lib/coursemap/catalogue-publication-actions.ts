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

async function canPublish() {
  if (!(await canManageCatalogueImports())) {
    return {
      ok: false,
      message: "Catalogue import permission is required.",
    } satisfies CoursemapActionResult;
  }
  return null;
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
