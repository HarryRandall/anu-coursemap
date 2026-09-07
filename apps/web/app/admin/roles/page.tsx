import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@coursemap/ui/primitives/card";
import { AlertTriangle } from "lucide-react";
import { RolePermissionMatrix } from "@/ui/admin/users/role-permission-matrix";
import { AppShell } from "@/ui/shell";

import { loadAdminRoleManagement } from "@/lib/admin/users";

async function loadRoles() {
  try {
    return await loadAdminRoleManagement();
  } catch {
    return null;
  }
}

export default async function AdminRolesPage() {
  const data = await loadRoles();

  return (
    <AppShell admin fill>
      <h1 className="sr-only">Roles and permissions</h1>
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-5">
        {data ? (
          <RolePermissionMatrix
            roles={data.roles}
            permissions={data.permissions}
            grants={data.grants}
          />
        ) : (
          <Card>
            <CardHeader>
              {
                <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertTriangle size={17} aria-hidden="true" />
                </span>
              }
              <CardTitle>
                <h2>{"Application roles could not be loaded"}</h2>
              </CardTitle>
              {Boolean(
                "Confirm the admin user-management migration is applied, then reload this page.",
              ) && (
                <CardDescription>
                  {
                    "Confirm the admin user-management migration is applied, then reload this page."
                  }
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
