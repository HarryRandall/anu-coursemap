import { notFound } from "next/navigation";
import { UserRoleEditor } from "@/components/admin/user-role-editor";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
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
  const assignedRole = data.roles.find((role) =>
    assignedRoleKeys.has(role.key),
  );
  const isAdministrator = assignedRole?.key === "admin";

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-[920px] min-w-0 space-y-5 overflow-hidden">
        <header className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="flex w-full min-w-0 items-center gap-3">
            <GeneratedAvatar
              name={data.user.displayName}
              email={data.user.email}
              className="size-11 text-xs"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-xl font-semibold tracking-tight break-words text-zinc-950">
                  {data.user.displayName}
                </h1>
                {data.user.userId === viewer.id && (
                  <Badge tone="brand">You</Badge>
                )}
                <Badge tone={isAdministrator ? "success" : "neutral"}>
                  {assignedRole?.name ?? "User"}
                </Badge>
              </div>
              <p className="mt-1 text-sm break-all text-zinc-500">
                {data.user.email ?? "No email address"}
              </p>
              <p className="mt-1.5 text-[11px] text-zinc-400">
                Joined {formatDate(data.user.createdAt)}
                <span aria-hidden="true"> · </span>
                Updated {formatDate(data.user.updatedAt)}
              </p>
            </div>
          </div>
        </header>

        <UserRoleEditor
          user={data.user}
          roles={data.roles}
          permissions={data.permissions}
          assignments={data.assignments}
          currentUserId={viewer.id}
        />
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
