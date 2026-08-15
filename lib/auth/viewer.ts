import { cache } from "react";
import { getSupabaseConfig, isDemoMode } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthViewer = {
  id: string;
  email: string | null;
};

export type AuthContext = {
  viewer: AuthViewer | null;
  canAccessAdmin: boolean;
};

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  if (isDemoMode()) return { viewer: null, canAccessAdmin: true };
  if (!getSupabaseConfig()) {
    return { viewer: null, canAccessAdmin: false };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims.sub;

    if (error || typeof subject !== "string" || !subject) {
      return { viewer: null, canAccessAdmin: false };
    }

    const viewer = {
      id: subject,
      email: typeof data.claims.email === "string" ? data.claims.email : null,
    };
    const { data: canAccessAdmin, error: permissionError } = await supabase.rpc(
      "current_user_has_permission",
      {
        required_permission: "admin.access",
      },
    );

    return {
      viewer,
      canAccessAdmin: !permissionError && canAccessAdmin === true,
    };
  } catch {
    return { viewer: null, canAccessAdmin: false };
  }
});

export async function getAuthViewer(): Promise<AuthViewer | null> {
  return (await getAuthContext()).viewer;
}

/** Check the narrower permission required to execute catalogue writes. */
export async function canManageCatalogueImports() {
  if (isDemoMode()) return true;
  if (!getSupabaseConfig()) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || typeof data?.claims.sub !== "string") return false;

    const { data: allowed, error: permissionError } = await supabase.rpc(
      "current_user_has_permission",
      { required_permission: "imports.manage" },
    );
    return !permissionError && allowed === true;
  } catch {
    return false;
  }
}
