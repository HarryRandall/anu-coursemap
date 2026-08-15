import { AlertTriangle, KeyRound, UsersRound } from "lucide-react";
import { RolePermissionMatrix } from "@/components/admin/role-permission-matrix";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { loadAdminRoles } from "@/lib/admin/users";
import { isDemoMode } from "@/lib/supabase/config";

async function loadRoles() {
  try {
    return await loadAdminRoles();
  } catch {
    return null;
  }
}

export default async function AdminRolesPage() {
  const roles = isDemoMode() ? [] : await loadRoles();

  return (
    <AppShell
      admin
      actions={
        <ButtonLink href="/admin/users" size="sm" variant="secondary">
          <UsersRound size={14} aria-hidden="true" />
          Users
        </ButtonLink>
      }
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mb-6 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              Roles
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review application roles and the permissions each one grants.
            </p>
          </div>
        </div>

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
        ) : roles ? (
          <RolePermissionMatrix roles={roles} />
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
