import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  userId: string;
  email: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminRole = {
  id: number;
  key: string;
  name: string;
  description: string;
  permissionKeys: string[];
};

export type AdminPermission = {
  id: number;
  key: string;
  name: string;
  description: string;
  category: string;
};

export type AdminRolePermission = {
  roleId: number;
  permissionId: number;
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
  permissions: AdminPermission[];
  assignments: AdminUserRole[];
};

export type AdminRoleManagementData = {
  roles: AdminRole[];
  permissions: AdminPermission[];
  grants: AdminRolePermission[];
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
  role_id: number | null;
  role_key: string | null;
  role_name: string | null;
  role_description: string | null;
  permission_keys: string[] | null;
}): AdminRole | null {
  if (
    role.role_id === null ||
    !role.role_key ||
    !role.role_name ||
    !role.role_description
  ) {
    return null;
  }
  return {
    id: role.role_id,
    key: role.role_key,
    name: role.role_name,
    description: role.role_description,
    permissionKeys: role.permission_keys ?? [],
  };
}

function mapPermission(permission: {
  permission_id: number | null;
  permission_key: string | null;
  permission_name: string | null;
  permission_description: string | null;
  permission_category: string | null;
}): AdminPermission | null {
  if (
    permission.permission_id === null ||
    !permission.permission_key ||
    !permission.permission_name ||
    !permission.permission_description ||
    !permission.permission_category
  ) {
    return null;
  }
  return {
    id: permission.permission_id,
    key: permission.permission_key,
    name: permission.permission_name,
    description: permission.permission_description,
    category: permission.permission_category,
  };
}

function mapRolePermission(grant: {
  role_id: number | null;
  permission_id: number | null;
}): AdminRolePermission | null {
  if (grant.role_id === null || grant.permission_id === null) return null;
  return { roleId: grant.role_id, permissionId: grant.permission_id };
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
      .select("role_id,role_key,role_name,role_description,permission_keys")
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
  const [userResult, rolesResult, permissionsResult, assignmentsResult] =
    await Promise.all([
      supabase
        .from("admin_users")
        .select("user_id,email,display_name,created_at,updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("admin_roles")
        .select("role_id,role_key,role_name,role_description,permission_keys")
        .order("role_name"),
      supabase
        .from("admin_permissions")
        .select(
          "permission_id,permission_key,permission_name,permission_description,permission_category",
        )
        .order("permission_category")
        .order("permission_name"),
      supabase
        .from("admin_user_roles")
        .select("user_id,role_key")
        .eq("user_id", userId),
    ]);

  const error =
    userResult.error ??
    rolesResult.error ??
    permissionsResult.error ??
    assignmentsResult.error;
  if (error) throw new Error("Coursemap could not load that user.");

  const user = userResult.data ? mapUser(userResult.data) : null;
  if (!user) return null;

  return {
    user,
    roles: (rolesResult.data ?? []).flatMap((role) => {
      const mapped = mapRole(role);
      return mapped ? [mapped] : [];
    }),
    permissions: (permissionsResult.data ?? []).flatMap((permission) => {
      const mapped = mapPermission(permission);
      return mapped ? [mapped] : [];
    }),
    assignments: (assignmentsResult.data ?? []).flatMap((assignment) => {
      const mapped = mapAssignment(assignment);
      return mapped ? [mapped] : [];
    }),
  };
}

export async function loadAdminRoleManagement(): Promise<AdminRoleManagementData> {
  const supabase = await createClient();
  const [rolesResult, permissionsResult, grantsResult] = await Promise.all([
    supabase
      .from("admin_roles")
      .select("role_id,role_key,role_name,role_description,permission_keys")
      .order("role_name"),
    supabase
      .from("admin_permissions")
      .select(
        "permission_id,permission_key,permission_name,permission_description,permission_category",
      )
      .order("permission_category")
      .order("permission_name"),
    supabase.from("admin_role_permissions").select("role_id,permission_id"),
  ]);

  const error =
    rolesResult.error ?? permissionsResult.error ?? grantsResult.error;
  if (error) throw new Error("Coursemap could not load application roles.");

  return {
    roles: (rolesResult.data ?? []).flatMap((role) => {
      const mapped = mapRole(role);
      return mapped ? [mapped] : [];
    }),
    permissions: (permissionsResult.data ?? []).flatMap((permission) => {
      const mapped = mapPermission(permission);
      return mapped ? [mapped] : [];
    }),
    grants: (grantsResult.data ?? []).flatMap((grant) => {
      const mapped = mapRolePermission(grant);
      return mapped ? [mapped] : [];
    }),
  };
}
