import { AlertTriangle, KeyRound } from "lucide-react";
import { RolePermissionMatrix } from "@/components/admin/role-permission-matrix";
import { AppShell } from "@/components/shell";
import { Card, CardHeader } from "@/components/ui/card";
import { loadAdminRoleManagement } from "@/lib/admin/users";
import { isDemoMode } from "@/lib/supabase/config";

async function loadRoles() {
  try {
    return await loadAdminRoleManagement();
  } catch {
    return null;
  }
}

export default async function AdminRolesPage() {
  const data = isDemoMode() ? null : await loadRoles();

  return (
    <AppShell admin>
      <h1 className="sr-only">Roles and permissions</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col gap-5">
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
          <RolePermissionMatrix
            roles={data.roles}
            permissions={data.permissions}
            grants={data.grants}
          />
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
