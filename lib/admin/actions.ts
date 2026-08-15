"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export type AdminRoleActionResult = {
  ok: boolean;
  assigned: boolean;
  message: string;
};

export type AdminPermissionActionResult = {
  ok: boolean;
  enabled: boolean;
  message: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roleKeyPattern = /^[a-z][a-z0-9_]*$/;

function failure(message: string, assigned: boolean): AdminRoleActionResult {
  return { ok: false, assigned, message };
}

export async function setAdminUserRole(
  userId: string,
  roleKey: string,
  assigned: boolean,
): Promise<AdminRoleActionResult> {
  if (!uuidPattern.test(userId) || !roleKeyPattern.test(roleKey)) {
    return failure("That user or role is not valid.", !assigned);
  }

  const { viewer, canAccessAdmin } = await getAuthContext();
  if (!viewer || !canAccessAdmin) {
    return failure("Administrator access is required.", !assigned);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_user_role", {
      p_user_id: userId,
      p_role_key: roleKey,
      p_assigned: assigned,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("own administrator role")) {
        return failure("You cannot remove your own administrator role.", true);
      }
      if (message.includes("at least one administrator")) {
        return failure("Coursemap must keep at least one administrator.", true);
      }
      if (message.includes("does not exist")) {
        return failure("That user or role no longer exists.", !assigned);
      }
      return failure("Coursemap could not update that role.", !assigned);
    }

    revalidatePath("/admin/users");
    revalidatePath("/", "layout");
    return {
      ok: true,
      assigned: data,
      message: assigned ? "Role assigned." : "Role removed.",
    };
  } catch {
    return failure("Coursemap could not update that role.", !assigned);
  }
}

export async function setAdminRolePermission(
  roleId: number,
  permissionId: number,
  enabled: boolean,
): Promise<AdminPermissionActionResult> {
  if (
    !Number.isSafeInteger(roleId) ||
    roleId <= 0 ||
    !Number.isSafeInteger(permissionId) ||
    permissionId <= 0
  ) {
    return {
      ok: false,
      enabled: !enabled,
      message: "That role or permission is not valid.",
    };
  }

  const { viewer, canAccessAdmin } = await getAuthContext();
  if (!viewer || !canAccessAdmin) {
    return {
      ok: false,
      enabled: !enabled,
      message: "Administrator access is required.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_role_permission", {
      p_role_id: roleId,
      p_permission_id: permissionId,
      p_enabled: enabled,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("required for the catalogue administrator")) {
        return {
          ok: false,
          enabled: true,
          message: "Administrator access is required for this role.",
        };
      }
      if (message.includes("does not exist")) {
        return {
          ok: false,
          enabled: !enabled,
          message: "That role or permission no longer exists.",
        };
      }
      return {
        ok: false,
        enabled: !enabled,
        message: "Coursemap could not update that permission.",
      };
    }

    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
    revalidatePath("/admin/users/[id]", "page");
    revalidatePath("/", "layout");
    return {
      ok: true,
      enabled: data,
      message: enabled ? "Permission enabled." : "Permission disabled.",
    };
  } catch {
    return {
      ok: false,
      enabled: !enabled,
      message: "Coursemap could not update that permission.",
    };
  }
}
