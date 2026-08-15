"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export type AdminRoleActionResult = {
  ok: boolean;
  assigned: boolean;
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
