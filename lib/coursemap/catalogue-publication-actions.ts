"use server";

import { revalidatePath } from "next/cache";
import { canManageCatalogueImports } from "@/lib/auth/viewer";
import type { CoursemapActionResult } from "@/lib/coursemap/actions";
import { createClient } from "@/lib/supabase/server";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Coursemap could not publish this programme record.";
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

/** Archive a programme version without deleting its source provenance. */
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
