"use client";

import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
  UsersRound,
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

export function UserRoleManager({
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

  const filteredUsers = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    if (!normalisedQuery) return users;
    return users.filter((user) =>
      `${user.displayName} ${user.email ?? ""}`
        .toLowerCase()
        .includes(normalisedQuery),
    );
  }, [query, users]);

  const toggleRole = (user: AdminUser, role: AdminRole) => {
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
        message: `${user.displayName}: ${result.message}`,
      });
      setPendingKey(null);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Role catalogue"
          description="Permissions are attached to roles in reviewed database migrations. Assign roles below; effective permissions are shown here read-only."
          icon={
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <KeyRound size={17} aria-hidden="true" />
            </span>
          }
        />
        <div className="grid gap-3 border-t border-zinc-100 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <section
              key={role.key}
              className="rounded-xl bg-zinc-50/70 p-3 ring-1 ring-zinc-200"
              aria-labelledby={`role-${role.key}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id={`role-${role.key}`}
                    className="text-[13px] font-semibold text-zinc-900"
                  >
                    {role.name}
                  </h2>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                    {role.key}
                  </p>
                </div>
                {role.permissionKeys.includes("admin.access") && (
                  <Badge tone="info">Admin</Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissionKeys.map((permission) => (
                  <Badge key={permission} tone="neutral">
                    {permission}
                  </Badge>
                ))}
                {role.permissionKeys.length === 0 && (
                  <span className="text-[11px] text-zinc-400">
                    No permissions attached
                  </span>
                )}
              </div>
            </section>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-zinc-600 shadow-xs ring-1 ring-zinc-200">
              <UsersRound size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[13px] font-semibold text-zinc-900">
                Coursemap users
              </h2>
              <p className="text-[11px] text-zinc-500">
                {users.length} {users.length === 1 ? "account" : "accounts"}
              </p>
            </div>
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-white px-3 shadow-xs ring-1 ring-zinc-200 ring-inset sm:max-w-xs">
            <Search size={15} className="text-zinc-400" aria-hidden="true" />
            <span className="sr-only">Search users</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>

        {feedback && (
          <div
            role={feedback.tone === "error" ? "alert" : "status"}
            className={
              feedback.tone === "error"
                ? "flex items-start gap-2 border-b border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700"
                : "flex items-start gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
            }
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

        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-3 py-2.5">Joined</th>
                  <th className="px-3 py-2.5">Roles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.userId}
                    className="align-top hover:bg-zinc-50/60"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                          {initials(user)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold text-zinc-900">
                            {user.displayName}
                            {user.userId === currentUserId && (
                              <Badge tone="info">You</Badge>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-zinc-500">
                            {user.email ?? "No email address"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-zinc-500">
                      {joinedDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <fieldset className="flex flex-wrap gap-2">
                        <legend className="sr-only">
                          Roles for {user.displayName}
                        </legend>
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
                                "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-[11px] font-medium ring-1 transition",
                                checked
                                  ? "bg-brand-50 text-brand-800 ring-brand-200"
                                  : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                                (isPending || isOwnAdminRole) &&
                                  "cursor-not-allowed opacity-60",
                              )}
                              title={
                                isOwnAdminRole
                                  ? "Another administrator must remove this role."
                                  : undefined
                              }
                            >
                              {pending ? (
                                <LoaderCircle
                                  className="size-4 animate-spin text-brand-600"
                                  aria-hidden="true"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isPending || isOwnAdminRole}
                                  onChange={() => toggleRole(user, role)}
                                  aria-label={`${role.name} for ${user.displayName}`}
                                  className="size-4 accent-violet-700"
                                />
                              )}
                              <span>{role.name}</span>
                              {role.permissionKeys.includes("admin.access") && (
                                <ShieldCheck
                                  className="size-3.5 text-brand-600"
                                  aria-hidden="true"
                                />
                              )}
                            </label>
                          );
                        })}
                      </fieldset>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <UsersRound
              className="mx-auto size-8 text-zinc-300"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-sm font-semibold text-zinc-800">
              No users found
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Try a different name or email address.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
