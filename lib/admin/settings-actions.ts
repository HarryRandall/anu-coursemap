"use server";

import { revalidatePath } from "next/cache";
import { canManageCourseImports } from "@/lib/auth/viewer";
import { configuredOpenRouterModels } from "@/lib/course-import/openrouter";
import { createClient } from "@/lib/supabase/server";
import { IMPORT_MODEL_SETTING_KEY } from "@/lib/admin/settings";

export type ImportModelActionResult = {
  ok: boolean;
  model: string;
  message: string;
};

/**
 * Set the model every subsequent import run requests. Rejecting models the
 * deployment does not allow keeps this in step with the queue's own check
 * rather than deferring the failure to a run that has already started.
 */
export async function setImportModel(
  model: string,
): Promise<ImportModelActionResult> {
  const requested = model.trim().toLowerCase();
  if (!configuredOpenRouterModels().includes(requested)) {
    return {
      ok: false,
      model,
      message: "Choose a model this deployment is configured to call.",
    };
  }

  if (!(await canManageCourseImports())) {
    return {
      ok: false,
      model,
      message: "Import management permission is required.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: IMPORT_MODEL_SETTING_KEY, value: requested },
        { onConflict: "key" },
      );
    if (error) {
      return { ok: false, model, message: "The model could not be saved." };
    }
  } catch {
    return { ok: false, model, message: "The model could not be saved." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  return {
    ok: true,
    model: requested,
    message: `Imports now use ${requested}.`,
  };
}
