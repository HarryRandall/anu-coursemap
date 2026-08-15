import { AlertTriangle, ShieldCheck } from "lucide-react";
import { UserDirectory } from "@/components/admin/user-directory";
import { AppShell } from "@/components/shell";
import { Card, CardHeader } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
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
      <CardHeader
        title={title}
        description={description}
        icon={
          <span
            className={
              warning
                ? "grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"
                : "grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"
            }
          >
            {warning ? (
              <AlertTriangle size={17} aria-hidden="true" />
            ) : (
              <ShieldCheck size={17} aria-hidden="true" />
            )}
          </span>
        }
      />
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
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

  const [{ viewer }, params] = await Promise.all([
    getAuthContext(),
    searchParams,
  ]);
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

  const rolesByUser = new Map<string, string[]>();
  for (const assignment of data.assignments) {
    rolesByUser.set(assignment.userId, [
      ...(rolesByUser.get(assignment.userId) ?? []),
      assignment.roleKey,
    ]);
  }
  const query = (params.q ?? "").trim().toLowerCase();
  const users = data.users.filter((user) => {
    const roleKeys = rolesByUser.get(user.userId) ?? [];
    const roleNames = data.roles
      .filter((role) => roleKeys.includes(role.key))
      .map((role) => role.name);
    const matchesQuery =
      !query ||
      `${user.displayName} ${user.email ?? ""} ${roleNames.join(" ")}`
        .toLowerCase()
        .includes(query);
    const matchesRole = !params.role || roleKeys.includes(params.role);
    return matchesQuery && matchesRole;
  });

  return (
    <AppShell admin>
      <h1 className="sr-only">Users and access</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-8">
        <FilterBar
          searchPlaceholder="Search name, email or role…"
          filters={[
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
        <UserDirectory
          users={users}
          roles={data.roles}
          assignments={data.assignments}
          currentUserId={viewer.id}
        />
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
