import { configuredOpenRouterModels } from "@/lib/course-import/openrouter";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const IMPORT_MODEL_SETTING_KEY = "imports.model";

export type ImportModelSetting = {
  /** The model every queued import uses until an admin changes it. */
  model: string;
  /** Every model this deployment is allowed to call. */
  options: string[];
  /** True once an admin has chosen a model rather than inheriting the first. */
  configured: boolean;
  updatedAt: string | null;
};

/**
 * The active import model. The stored value only wins while it is still one
 * of the models this deployment allows, so trimming the env list cannot leave
 * imports pointing at a model the worker would reject.
 */
export async function loadImportModelSetting(): Promise<ImportModelSetting> {
  const options = configuredOpenRouterModels();
  const fallback: ImportModelSetting = {
    model: options[0] ?? "",
    options,
    configured: false,
    updatedAt: null,
  };
  if (isDemoMode()) return fallback;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value,updated_at")
      .eq("key", IMPORT_MODEL_SETTING_KEY)
      .maybeSingle();
    if (error || !data) return fallback;

    const stored = typeof data.value === "string" ? data.value : null;
    if (!stored || !options.includes(stored)) return fallback;
    return {
      model: stored,
      options,
      configured: true,
      updatedAt: data.updated_at,
    };
  } catch {
    return fallback;
  }
}
