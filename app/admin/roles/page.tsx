import { AlertTriangle, KeyRound } from "lucide-react";
import { RolePermissionMatrix } from "@/components/admin/role-permission-matrix";
import { AppShell } from "@/components/shell";
import { Card, CardHeader } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { loadAdminRoleManagement } from "@/lib/admin/users";
import { isDemoMode } from "@/lib/supabase/config";

async function loadRoles() {
  try {
    return await loadAdminRoleManagement();
  } catch {
    return null;
  }
}

function permissionArea(category: string) {
  const labels: Record<string, string> = {
    admin: "Platform access",
    approvals: "Approvals",
    catalogue: "Catalogue",
    imports: "Imports",
  };
  return labels[category] ?? category;
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; role?: string }>;
}) {
  const [params, data] = await Promise.all([
    searchParams,
    isDemoMode() ? Promise.resolve(null) : loadRoles(),
  ]);

  const query = (params.q ?? "").trim().toLowerCase();
  const categories = Array.from(
    new Set(data?.permissions.map((permission) => permission.category) ?? []),
  );
  const roles =
    params.role && data?.roles.some((role) => role.key === params.role)
      ? data.roles.filter((role) => role.key === params.role)
      : (data?.roles ?? []);
  const permissions = (data?.permissions ?? []).filter((permission) => {
    const matchesQuery =
      !query ||
      `${permission.name} ${permission.description} ${permission.key} ${permission.category}`
        .toLowerCase()
        .includes(query);
    const matchesArea = !params.area || permission.category === params.area;
    return matchesQuery && matchesArea;
  });

  return (
    <AppShell admin>
      <h1 className="sr-only">Roles and permissions</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-8">
        {isDemoMode() ? (
          <Card>
            <CardHeader
              title="Role management is unavailable in demo mode"
              description="Connect Coursemap to Supabase to review database-backed application roles."
              icon={
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <KeyRound size={17} aria-hidden="true" />
                </span>
              }
            />
          </Card>
        ) : data ? (
          <>
            <FilterBar
              searchPlaceholder="Search permissions by name or area…"
              filters={[
                {
                  key: "area",
                  label: "Area",
                  options: categories.map((category) => ({
                    value: category,
                    label: permissionArea(category),
                  })),
                },
                {
                  key: "role",
                  label: "Role",
                  options: data.roles.map((role) => ({
                    value: role.key,
                    label: role.name,
                  })),
                },
              ]}
            />
            <RolePermissionMatrix
              roles={roles}
              permissions={permissions}
              grants={data.grants}
            />
          </>
        ) : (
          <Card>
            <CardHeader
              title="Application roles could not be loaded"
              description="Confirm the admin user-management migration is applied, then reload this page."
              icon={
                <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <AlertTriangle size={17} aria-hidden="true" />
                </span>
              }
            />
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
