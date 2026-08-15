import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  DataTableShell,
  tableCellClasses,
  tableClasses,
  tableHeadClasses,
  tableHeaderCellClasses,
  tableRowClasses,
} from "@/components/ui/data-table";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import type { AdminRole, AdminUser, AdminUserRole } from "@/lib/admin/users";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function roleTone(role: AdminRole): "brand" | "info" | "neutral" {
  if (role.permissionKeys.includes("admin.access")) return "brand";
  if (role.permissionKeys.length > 0) return "info";
  return "neutral";
}

export function UserDirectory({
  users,
  roles,
  assignments,
  currentUserId,
}: {
  users: AdminUser[];
  roles: AdminRole[];
  assignments: AdminUserRole[];
  currentUserId: string;
}) {
  const rolesByKey = new Map(roles.map((role) => [role.key, role]));
  const rolesByUser = new Map<string, AdminRole[]>();
  for (const assignment of assignments) {
    const role = rolesByKey.get(assignment.roleKey);
    if (!role) continue;
    rolesByUser.set(assignment.userId, [
      ...(rolesByUser.get(assignment.userId) ?? []),
      role,
    ]);
  }

  return (
    <DataTableShell
      footer={
        <p className="text-sm text-zinc-500">
          Viewing {users.length.toLocaleString("en-AU")} Coursemap users
        </p>
      }
    >
      <table className={tableClasses()}>
        <thead className={tableHeadClasses()}>
          <tr>
            <th className={tableHeaderCellClasses()}>User</th>
            <th className={tableHeaderCellClasses()}>Role</th>
            <th className={tableHeaderCellClasses()}>Joined</th>
            <th className={tableHeaderCellClasses()}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr className={tableRowClasses()}>
              <td
                colSpan={4}
                className={tableCellClasses(
                  "py-12 text-center font-normal whitespace-normal text-zinc-500",
                )}
              >
                No users match the current filters.
              </td>
            </tr>
          ) : null}
          {users.map((user) => {
            const href = `/admin/users/${user.userId}`;
            const userRoles = rolesByUser.get(user.userId) ?? [];
            return (
              <tr
                key={user.userId}
                className={tableRowClasses("group hover:bg-zinc-50/70")}
              >
                <td className={tableCellClasses("p-0")}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Link
                      href={href}
                      className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-brand-400"
                      aria-label={`View ${user.displayName}`}
                    >
                      <GeneratedAvatar
                        name={user.displayName}
                        email={user.email}
                        className="size-[31px]"
                      />
                    </Link>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <Link
                          href={href}
                          className="truncate text-sm font-medium text-zinc-900 hover:underline focus:underline focus:outline-none"
                        >
                          {user.displayName}
                        </Link>
                        {user.userId === currentUserId ? (
                          <Badge tone="brand" className="px-2 py-0.5">
                            You
                          </Badge>
                        ) : null}
                      </span>
                      <Link
                        href={href}
                        className="mt-0.5 block truncate text-xs text-zinc-500 hover:underline focus:underline focus:outline-none"
                      >
                        {user.email ?? "No email"}
                      </Link>
                    </span>
                  </div>
                </td>
                <td className={tableCellClasses("p-0")}>
                  <Link
                    href={href}
                    className="flex min-h-14 items-center gap-1.5 px-4 py-3"
                  >
                    {userRoles.length > 0 ? (
                      userRoles.map((role) => (
                        <Badge key={role.id} tone={roleTone(role)}>
                          {role.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400">No role</span>
                    )}
                  </Link>
                </td>
                <td
                  className={tableCellClasses(
                    "p-0 font-mono text-xs text-zinc-500 tabular-nums",
                  )}
                >
                  <Link href={href} className="block px-4 py-3">
                    {formatDate(user.createdAt)}
                  </Link>
                </td>
                <td
                  className={tableCellClasses(
                    "p-0 font-mono text-xs text-zinc-500 tabular-nums",
                  )}
                >
                  <Link href={href} className="block px-4 py-3">
                    {formatDate(user.updatedAt)}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableShell>
  );
}
