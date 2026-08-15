import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserRoleEditor } from "@/components/admin/user-role-editor";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import { StatTile } from "@/components/ui/stat-tile";
import { loadAdminUserDetail } from "@/lib/admin/users";
import { getAuthContext } from "@/lib/auth/viewer";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { viewer }] = await Promise.all([params, getAuthContext()]);
  if (!viewer) return null;

  const data = await loadAdminUserDetail(id);
  if (!data) notFound();

  const assignedRoleKeys = new Set(
    data.assignments.map((assignment) => assignment.roleKey),
  );
  const assignedRoles = data.roles.filter((role) =>
    assignedRoleKeys.has(role.key),
  );
  const effectivePermissions = Array.from(
    new Set(assignedRoles.flatMap((role) => role.permissionKeys)),
  ).sort();
  const isAdministrator = effectivePermissions.includes("admin.access");

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-[1200px] space-y-8">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to users
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <GeneratedAvatar
              name={data.user.displayName}
              email={data.user.email}
              className="size-12 text-sm"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950">
                  {data.user.displayName}
                </h1>
                {data.user.userId === viewer.id && (
                  <Badge tone="brand">You</Badge>
                )}
                {isAdministrator && <Badge tone="success">Administrator</Badge>}
                {assignedRoles
                  .filter(
                    (role) => !role.permissionKeys.includes("admin.access"),
                  )
                  .map((role) => (
                    <Badge key={role.id} tone="info">
                      {role.name}
                    </Badge>
                  ))}
              </div>
              <p className="mt-1 truncate text-sm text-zinc-500">
                {data.user.email ?? "No email address"}
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label="Assigned roles"
            value={assignedRoles.length.toLocaleString("en-AU")}
          />
          <StatTile label="Joined" value={formatDate(data.user.createdAt)} />
          <StatTile label="Updated" value={formatDate(data.user.updatedAt)} />
          <StatTile
            label="Permissions"
            value={effectivePermissions.length.toLocaleString("en-AU")}
          />
        </section>

        <UserRoleEditor
          user={data.user}
          roles={data.roles}
          assignments={data.assignments}
          currentUserId={viewer.id}
        />
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
