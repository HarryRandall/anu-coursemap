import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@coursemap/ui/primitives/card";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { UserDirectory } from "@/ui/admin/users/user-directory";
import { AppShell } from "@/ui/shell";

import { FilterBar } from "@/ui/common/filter-bar";
import { loadAdminUserManagement } from "@/lib/admin/users";
import { getAuthContext } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";

function Notice({
  title,
  description,
  warning = false,
}: {
  title: string;
  description: string;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        {
          <span
            className={
              warning
                ? "grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                : "grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
            }
          >
            {warning ? (
              <AlertTriangle size={17} aria-hidden="true" />
            ) : (
              <ShieldCheck size={17} aria-hidden="true" />
            )}
          </span>
        }
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {Boolean(description) && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
    </Card>
  );
}

async function loadUserManagement() {
  try {
    return await loadAdminUserManagement();
  } catch {
    return null;
  }
}

function first(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; role?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().toLowerCase();
  const role = first(params.role) ?? "";
  if (isDemoMode()) {
    return (
      <AppShell admin>
        <h1 className="sr-only">Users and access</h1>
        <Notice
          title="User management is unavailable in demo mode"
          description="Connect Coursemap to Supabase and sign in as a catalogue administrator to manage database-backed roles."
        />
      </AppShell>
    );
  }

  const { viewer } = await getAuthContext();
  if (!viewer) return null;

  const data = await loadUserManagement();
  if (!data) {
    return (
      <AppShell admin>
        <h1 className="sr-only">Users and access</h1>
        <Notice
          warning
          title="User access settings could not be loaded"
          description="Confirm the admin user-management migration is applied to this Supabase project, then reload the page."
        />
      </AppShell>
    );
  }

  const roleByUser = new Map(
    data.assignments.map((assignment) => [
      assignment.userId,
      assignment.roleKey,
    ]),
  );
  const users = data.users.filter((user) => {
    const matchesQuery =
      !query ||
      user.displayName.toLowerCase().includes(query) ||
      (user.email ?? "").toLowerCase().includes(query);
    const matchesRole = !role || (roleByUser.get(user.userId) ?? "") === role;
    return matchesQuery && matchesRole;
  });

  return (
    <AppShell admin fill>
      <h1 className="sr-only">Users and access</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-5">
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar
            searchPlaceholder="Search by name or email"
            filters={[
              {
                key: "role",
                label: "Role",
                allLabel: "All roles",
                options: data.roles.map((item) => ({
                  value: item.key,
                  label: item.name,
                })),
              },
            ]}
          />
        </Suspense>
        <UserDirectory
          users={users}
          roles={data.roles}
          assignments={data.assignments}
          currentUserId={viewer.id}
          filtered={Boolean(query || role)}
        />
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
