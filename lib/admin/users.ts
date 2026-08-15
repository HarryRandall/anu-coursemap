import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  userId: string;
  email: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
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

export type AdminUserDetailData = {
  user: AdminUser;
  roles: AdminRole[];
  assignments: AdminUserRole[];
};

function mapUser(user: {
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}): AdminUser | null {
  if (!user.user_id || !user.display_name || !user.created_at) return null;
  return {
    userId: user.user_id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
  };
}

function mapRole(role: {
  role_key: string | null;
  role_name: string | null;
  permission_keys: string[] | null;
}): AdminRole | null {
  if (!role.role_key || !role.role_name) return null;
  return {
    key: role.role_key,
    name: role.role_name,
    permissionKeys: role.permission_keys ?? [],
  };
}

function mapAssignment(assignment: {
  user_id: string | null;
  role_key: string | null;
}): AdminUserRole | null {
  if (!assignment.user_id || !assignment.role_key) return null;
  return {
    userId: assignment.user_id,
    roleKey: assignment.role_key,
  };
}

export async function loadAdminUserManagement(): Promise<AdminUserManagementData> {
  const supabase = await createClient();
  const [usersResult, rolesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("user_id,email,display_name,created_at,updated_at")
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
    users: (usersResult.data ?? []).flatMap((user) => {
      const mapped = mapUser(user);
      return mapped ? [mapped] : [];
    }),
    roles: (rolesResult.data ?? []).flatMap((role) => {
      const mapped = mapRole(role);
      return mapped ? [mapped] : [];
    }),
    assignments: (assignmentsResult.data ?? []).flatMap((assignment) => {
      const mapped = mapAssignment(assignment);
      return mapped ? [mapped] : [];
    }),
  };
}

export async function loadAdminUserDetail(
  userId: string,
): Promise<AdminUserDetailData | null> {
  const supabase = await createClient();
  const [userResult, rolesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("user_id,email,display_name,created_at,updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("admin_roles")
      .select("role_key,role_name,permission_keys")
      .order("role_name"),
    supabase
      .from("admin_user_roles")
      .select("user_id,role_key")
      .eq("user_id", userId),
  ]);

  const error =
    userResult.error ?? rolesResult.error ?? assignmentsResult.error;
  if (error) throw new Error("Coursemap could not load that user.");

  const user = userResult.data ? mapUser(userResult.data) : null;
  if (!user) return null;

  return {
    user,
    roles: (rolesResult.data ?? []).flatMap((role) => {
      const mapped = mapRole(role);
      return mapped ? [mapped] : [];
    }),
    assignments: (assignmentsResult.data ?? []).flatMap((assignment) => {
      const mapped = mapAssignment(assignment);
      return mapped ? [mapped] : [];
    }),
  };
}

export async function loadAdminRoles(): Promise<AdminRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role_key,role_name,permission_keys")
    .order("role_name");

  if (error) throw new Error("Coursemap could not load application roles.");

  return (data ?? []).flatMap((role) => {
    const mapped = mapRole(role);
    return mapped ? [mapped] : [];
  });
}
