import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

function roleTone(role: AdminRole): "brand" | "neutral" {
  return role.key === "admin" ? "brand" : "neutral";
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
  const rolesByUser = new Map<string, AdminRole>();
  for (const assignment of assignments) {
    const role = rolesByKey.get(assignment.roleKey);
    if (!role) continue;
    rolesByUser.set(assignment.userId, role);
  }

  return (
    <DataTableShell
      footer={
        <p className="text-xs text-zinc-500">
          Viewing {users.length.toLocaleString("en-AU")} Coursemap users
        </p>
      }
    >
      <Table className="min-w-[680px] table-fixed">
        <TableCaption>Coursemap users and roles</TableCaption>
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[28%]" />
          <col className="w-[15%]" />
          <col className="w-[15%]" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="p-0">
                <DataTableEmpty
                  title="No users"
                  description="Coursemap users will appear after they create an account."
                />
              </TableCell>
            </TableRow>
          ) : null}
          {users.map((user) => {
            const href = `/admin/users/${user.userId}`;
            const userRole = rolesByUser.get(user.userId);
            return (
              <TableRow key={user.userId} className="group">
                <TableCell className="p-0">
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 rounded-sm px-4 py-3 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none focus-visible:ring-inset"
                  >
                    <span className="shrink-0">
                      <GeneratedAvatar
                        name={user.displayName}
                        email={user.email}
                        className="size-7 text-[10px]"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-zinc-950 group-hover:text-brand-700">
                          {user.displayName}
                        </span>
                        {user.userId === currentUserId ? (
                          <Badge tone="brand" className="px-2 py-0.5">
                            You
                          </Badge>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                        {user.email ?? "No email"}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex min-h-10 items-center gap-1.5">
                    {userRole ? (
                      <Badge tone={roleTone(userRole)}>{userRole.name}</Badge>
                    ) : (
                      <Badge tone="neutral">User</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-500 tabular-nums">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-500 tabular-nums">
                  {formatDate(user.updatedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
