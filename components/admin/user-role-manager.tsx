"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  UsersRound,
  UserX,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { setAdminUserRole } from "@/lib/admin/actions";
import type { AdminRole, AdminUser, AdminUserRole } from "@/lib/admin/users";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";

type Feedback = {
  tone: "success" | "error";
  message: string;
};

function assignmentKey(userId: string, roleKey: string) {
  return `${userId}:${roleKey}`;
}

function initials(user: AdminUser) {
  const source = user.displayName || user.email || "?";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function joinedDate(value: string) {
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

function roleDescription(role: AdminRole) {
  if (role.permissionKeys.includes("admin.access")) {
    return "Full access to Coursemap administration and catalogue operations.";
  }
  if (role.permissionKeys.includes("catalogue.read_drafts")) {
    return "Can inspect unpublished catalogue data without changing it.";
  }
  return "This role has no effective permissions yet.";
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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const rolesByKey = useMemo(
    () => new Map(roles.map((role) => [role.key, role])),
    [roles],
  );
  const rolesByUser = useMemo(() => {
    const grouped = new Map<string, AdminRole[]>();
    for (const assignment of assignments) {
      const role = rolesByKey.get(assignment.roleKey);
      if (!role) continue;
      grouped.set(assignment.userId, [
        ...(grouped.get(assignment.userId) ?? []),
        role,
      ]);
    }
    return grouped;
  }, [assignments, rolesByKey]);

  const filteredUsers = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const userRoles = rolesByUser.get(user.userId) ?? [];
      const matchesQuery =
        !normalisedQuery ||
        `${user.displayName} ${user.email ?? ""} ${userRoles
          .map((role) => role.name)
          .join(" ")}`
          .toLowerCase()
          .includes(normalisedQuery);
      const matchesRole =
        roleFilter === "all" ||
        userRoles.some((role) => role.key === roleFilter);
      return matchesQuery && matchesRole;
    });
  }, [query, roleFilter, rolesByUser, users]);

  const administratorCount = users.filter((user) =>
    (rolesByUser.get(user.userId) ?? []).some((role) =>
      role.permissionKeys.includes("admin.access"),
    ),
  ).length;
  const unassignedCount = users.filter(
    (user) => (rolesByUser.get(user.userId) ?? []).length === 0,
  ).length;

  const summary = [
    {
      label: "Total accounts",
      value: users.length,
      icon: UsersRound,
      tone: "bg-brand-50 text-brand-700",
    },
    {
      label: "Administrators",
      value: administratorCount,
      icon: ShieldCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Application roles",
      value: roles.length,
      icon: KeyRound,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "No role assigned",
      value: unassignedCount,
      icon: UserX,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {summary.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-4 py-4"
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    item.tone,
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-xl leading-none font-semibold tracking-tight text-zinc-950 tabular-nums">
                    {item.value.toLocaleString("en-AU")}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-zinc-500">
                    {item.label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
              User directory
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {filteredUsers.length === users.length
                ? `${users.length} Coursemap ${users.length === 1 ? "account" : "accounts"}`
                : `${filteredUsers.length} of ${users.length} accounts`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg bg-zinc-50 px-3 ring-1 ring-zinc-200 ring-inset sm:w-72">
              <Search
                size={15}
                className="shrink-0 text-zinc-400"
                aria-hidden="true"
              />
              <span className="sr-only">Search users</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email or role"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </label>
            <label className="sr-only" htmlFor="user-role-filter">
              Filter users by role
            </label>
            <select
              id="user-role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="min-h-11 rounded-lg bg-white px-3 text-[13px] font-medium text-zinc-700 ring-1 ring-zinc-200 outline-none ring-inset focus:ring-2 focus:ring-brand-300"
            >
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Access</th>
                  <th className="px-4 py-2.5">Joined</th>
                  <th className="w-16 px-4 py-2.5">
                    <span className="sr-only">Open user</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((user) => {
                  const userRoles = rolesByUser.get(user.userId) ?? [];
                  const href = `/admin/users/${user.userId}`;
                  return (
                    <tr
                      key={user.userId}
                      className="group bg-white transition-colors hover:bg-zinc-50/80"
                    >
                      <td className="p-0">
                        <Link
                          href={href}
                          className="flex items-center gap-3 px-4 py-3.5"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 ring-2 ring-white">
                            {initials(user)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2 font-semibold text-zinc-900">
                              <span className="truncate">
                                {user.displayName}
                              </span>
                              {user.userId === currentUserId && (
                                <Badge tone="brand">You</Badge>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                              {user.email ?? "No email address"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          className="flex min-h-16 items-center gap-1.5 px-4 py-3"
                        >
                          {userRoles.length > 0 ? (
                            userRoles.map((role) => (
                              <Badge key={role.key} tone={roleTone(role)}>
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-400">
                              No application role
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="p-0 text-xs text-zinc-500">
                        <Link
                          href={href}
                          className="flex min-h-16 items-center px-4 py-3"
                        >
                          {joinedDate(user.createdAt)}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link
                          href={href}
                          aria-label={`Manage ${user.displayName}`}
                          className="flex min-h-16 items-center justify-end px-4 py-3 text-zinc-300 transition group-hover:text-brand-600"
                        >
                          <ChevronRight size={17} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <UsersRound
              className="mx-auto size-8 text-zinc-300"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-sm font-semibold text-zinc-800">
              No users found
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Try a different search or role filter.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export function UserAccessEditor({
  user,
  roles,
  assignments,
  currentUserId,
}: {
  user: AdminUser;
  roles: AdminRole[];
  assignments: AdminUserRole[];
  currentUserId: string;
}) {
  const [assigned, setAssigned] = useState(
    () =>
      new Set(
        assignments.map((assignment) =>
          assignmentKey(assignment.userId, assignment.roleKey),
        ),
      ),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleRole = (role: AdminRole) => {
    const key = assignmentKey(user.userId, role.key);
    const nextAssigned = !assigned.has(key);
    setPendingKey(key);
    setFeedback(null);

    startTransition(async () => {
      const result = await setAdminUserRole(
        user.userId,
        role.key,
        nextAssigned,
      );
      if (result.ok) {
        setAssigned((current) => {
          const next = new Set(current);
          if (result.assigned) next.add(key);
          else next.delete(key);
          return next;
        });
      }
      setFeedback({
        tone: result.ok ? "success" : "error",
        message: result.message,
      });
      setPendingKey(null);
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Application roles"
        description="Changes save immediately. Effective permissions are inherited from each role."
        icon={
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <KeyRound size={17} aria-hidden="true" />
          </span>
        }
      />

      {feedback && (
        <div
          role={feedback.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 border-y px-5 py-3 text-xs",
            feedback.tone === "error"
              ? "border-rose-100 bg-rose-50 text-rose-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-800",
          )}
        >
          {feedback.tone === "error" ? (
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="divide-y divide-zinc-100 border-t border-zinc-100">
        {roles.map((role) => {
          const key = assignmentKey(user.userId, role.key);
          const checked = assigned.has(key);
          const isOwnAdminRole =
            user.userId === currentUserId &&
            checked &&
            role.permissionKeys.includes("admin.access");
          const pending = isPending && pendingKey === key;

          return (
            <label
              key={role.key}
              className={cn(
                "grid cursor-pointer gap-4 px-5 py-4 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                checked ? "bg-brand-50/45" : "bg-white hover:bg-zinc-50/70",
                (isPending || isOwnAdminRole) && "cursor-not-allowed",
              )}
              title={
                isOwnAdminRole
                  ? "Another administrator must remove this role."
                  : undefined
              }
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {role.name}
                  </span>
                  <Badge tone={roleTone(role)}>{role.key}</Badge>
                  {role.permissionKeys.includes("admin.access") && (
                    <Badge tone="brand">
                      <ShieldCheck size={12} aria-hidden="true" /> Admin
                    </Badge>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  {roleDescription(role)}
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {role.permissionKeys.map((permission) => (
                    <Badge key={permission} tone="neutral">
                      {permission}
                    </Badge>
                  ))}
                </span>
              </span>
              <span className="flex min-h-11 items-center justify-end gap-3">
                <span className="text-xs font-medium text-zinc-500">
                  {checked ? "Assigned" : "Not assigned"}
                </span>
                {pending ? (
                  <span className="grid size-9 place-items-center rounded-full bg-white ring-1 ring-zinc-200">
                    <LoaderCircle
                      className="size-4 animate-spin text-brand-600"
                      aria-hidden="true"
                    />
                  </span>
                ) : (
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isPending || isOwnAdminRole}
                    onChange={() => toggleRole(role)}
                    aria-label={`${role.name} for ${user.displayName}`}
                    className="size-5 accent-violet-700"
                  />
                )}
              </span>
            </label>
          );
        })}
      </div>
    </Card>
  );
}
