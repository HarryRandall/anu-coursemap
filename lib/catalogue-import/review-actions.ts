"use server";

import { revalidatePath } from "next/cache";
import { canManageCatalogueImports, getAuthViewer } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type ResolveImportFlagResult = {
  ok: boolean;
  message: string;
  status: "open" | "accepted" | "rejected";
};

export async function resolveImportFlag(
  id: number,
  resolution: "accept" | "dismiss",
): Promise<ResolveImportFlagResult> {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, message: "That flag is not valid.", status: "open" };
  }
  if (!(await canManageCatalogueImports())) {
    return {
      ok: false,
      message: "Catalogue import permission is required.",
      status: "open",
    };
  }

  const status = resolution === "accept" ? "accepted" : "rejected";
  const message = resolution === "accept" ? "Accepted" : "Dismissed";
  if (isDemoMode()) return { ok: true, message, status };

  const viewer = await getAuthViewer();
  if (!viewer) {
    return { ok: false, message: "Sign in again to continue.", status: "open" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("catalogue_review_items")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: viewer.id,
        status,
      })
      .eq("id", id)
      .eq("status", "open")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return {
        ok: false,
        message: "That flag has already been resolved.",
        status: "open",
      };
    }

    revalidatePath("/admin/imports/changes");
    return { ok: true, message, status };
  } catch {
    return {
      ok: false,
      message: `The flag could not be ${resolution === "accept" ? "accepted" : "dismissed"}.`,
      status: "open",
    };
  }
}
