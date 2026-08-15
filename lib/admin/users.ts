import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  userId: string;
  email: string | null;
  displayName: string;
  createdAt: string;
};

export type AdminRole = {
  key: string;
  name: string;
  permissionKeys: string[];
};

export type AdminUserRole = {
  userId: string;
  roleKey: string;
};

export type AdminUserManagementData = {
  users: AdminUser[];
  roles: AdminRole[];
  assignments: AdminUserRole[];
};

export async function loadAdminUserManagement(): Promise<AdminUserManagementData> {
  const supabase = await createClient();
  const [usersResult, rolesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("user_id,email,display_name,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_roles")
      .select("role_key,role_name,permission_keys")
      .order("role_name"),
    supabase.from("admin_user_roles").select("user_id,role_key"),
  ]);

  const error =
    usersResult.error ?? rolesResult.error ?? assignmentsResult.error;
  if (error) throw new Error("Coursemap could not load user access settings.");

  return {
    users: (usersResult.data ?? []).flatMap((user) =>
      user.user_id && user.display_name && user.created_at
        ? [
            {
              userId: user.user_id,
              email: user.email,
              displayName: user.display_name,
              createdAt: user.created_at,
            },
          ]
        : [],
    ),
    roles: (rolesResult.data ?? []).flatMap((role) =>
      role.role_key && role.role_name
        ? [
            {
              key: role.role_key,
              name: role.role_name,
              permissionKeys: role.permission_keys ?? [],
            },
          ]
        : [],
    ),
    assignments: (assignmentsResult.data ?? []).flatMap((assignment) =>
      assignment.user_id && assignment.role_key
        ? [
            {
              userId: assignment.user_id,
              roleKey: assignment.role_key,
            },
          ]
        : [],
    ),
  };
}
