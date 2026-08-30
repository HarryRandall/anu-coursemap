"use server";

import { revalidatePath } from "next/cache";
import { canWriteCatalogue } from "@/lib/auth/viewer";
import type { CoursemapActionResult } from "@/lib/coursemap/actions";
import { createClient } from "@/lib/supabase/server";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Coursemap could not publish this academic structure.";
}

export async function publishStructureSnapshot(
  structureYearId: number,
  snapshotId: number,
  code: string,
): Promise<CoursemapActionResult> {
  if (!(await canWriteCatalogue())) {
    return {
      ok: false,
      message: "Catalogue publication permission is required.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc(
      "publish_academic_structure_snapshot",
      {
        p_snapshot_id: snapshotId,
        p_structure_year_id: structureYearId,
      },
    );
    if (error) throw error;
    revalidatePath("/onboarding");
    revalidatePath("/profile");
    revalidatePath("/plan");
    revalidatePath("/requirements");
    revalidatePath("/admin/programmes");
    revalidatePath(`/admin/programmes/${code}`);
    return {
      ok: true,
      message: `${code.toUpperCase()} is now available for student plans.`,
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
