"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, LockKeyhole, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { setAdminUserRole } from "@/lib/admin/actions";
import type { AdminRole, AdminUser, AdminUserRole } from "@/lib/admin/users";
import { cn } from "@/lib/cn";

function assignmentKey(userId: string, roleKey: string) {
  return `${userId}:${roleKey}`;
}

export function UserRoleEditor({
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
  const router = useRouter();
  const [assigned, setAssigned] = useState(
    () =>
      new Set(
        assignments.map((assignment) =>
          assignmentKey(assignment.userId, assignment.roleKey),
        ),
      ),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const effectivePermissions = useMemo(
    () =>
      Array.from(
        new Set(
          roles
            .filter((role) =>
              assigned.has(assignmentKey(user.userId, role.key)),
            )
            .flatMap((role) => role.permissionKeys),
        ),
      ).sort(),
    [assigned, roles, user.userId],
  );

  const toggleRole = (role: AdminRole) => {
    const key = assignmentKey(user.userId, role.key);
    const nextAssigned = !assigned.has(key);
    setPendingKey(key);
    setFeedback("");
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
        router.refresh();
      }
      setFeedback(result.message);
      setPendingKey(null);
    });
  };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Roles</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Changes save automatically.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {roles.map((role) => {
            const key = assignmentKey(user.userId, role.key);
            const enabled = assigned.has(key);
            const locked =
              user.userId === currentUserId &&
              enabled &&
              role.permissionKeys.includes("admin.access");
            const pending = isPending && pendingKey === key;

            return (
              <button
                key={role.id}
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-busy={pending}
                disabled={isPending || locked}
                title={
                  locked
                    ? "Another administrator must remove this role."
                    : role.description
                }
                onClick={() => toggleRole(role)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-65",
                  enabled
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                )}
              >
                {pending ? (
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : locked ? (
                  <LockKeyhole size={14} aria-hidden="true" />
                ) : enabled ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <X size={14} aria-hidden="true" />
                )}
                {role.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium text-zinc-500">
            Effective permissions
          </h3>
          <span className="text-xs text-zinc-400 tabular-nums">
            {effectivePermissions.length}
          </span>
        </div>
        {effectivePermissions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {effectivePermissions.map((permission) => (
              <Badge key={permission} tone="neutral" className="font-mono">
                {permission}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            This account has no application permissions.
          </p>
        )}
      </div>

      <p
        role={feedback.startsWith("Coursemap could not") ? "alert" : "status"}
        aria-live="polite"
        className="mt-3 min-h-5 text-xs text-zinc-500"
      >
        {feedback}
      </p>
    </section>
  );
}
