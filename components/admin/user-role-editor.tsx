"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { Select } from "@/components/ui/select";
import { setAdminUserRole } from "@/lib/admin/actions";
import type {
  AdminPermission,
  AdminRole,
  AdminUser,
  AdminUserRole,
} from "@/lib/admin/users";

export function UserRoleEditor({
  user,
  roles,
  permissions,
  assignments,
  currentUserId,
}: {
  user: AdminUser;
  roles: AdminRole[];
  permissions: AdminPermission[];
  assignments: AdminUserRole[];
  currentUserId: string;
}) {
  const router = useRouter();
  const initialRoleKey = assignments[0]?.roleKey ?? "user";
  const [roleKey, setRoleKey] = useState(initialRoleKey);
  const [feedback, setFeedback] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedRole = roles.find((role) => role.key === roleKey);
  const effectivePermissions = useMemo(() => {
    const keys = new Set(selectedRole?.permissionKeys ?? []);
    return permissions.filter((permission) => keys.has(permission.key));
  }, [permissions, selectedRole]);
  const isOwnAdmin = user.userId === currentUserId && roleKey === "admin";

  const changeRole = (nextRoleKey: string) => {
    if (nextRoleKey === roleKey) return;
    const previousRoleKey = roleKey;
    setRoleKey(nextRoleKey);
    setFeedback("");
    setIsError(false);

    startTransition(async () => {
      const result = await setAdminUserRole(user.userId, nextRoleKey);
      if (!result.ok) {
        setRoleKey(previousRoleKey);
        setIsError(true);
      }
      setFeedback(result.message);
      if (result.ok) router.refresh();
    });
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">Account role</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Choose the level of access for this account.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {isPending ? (
            <LoaderCircle
              size={16}
              className="shrink-0 animate-spin text-zinc-400 motion-reduce:animate-none"
              aria-label="Saving role"
            />
          ) : null}
          <Select
            value={roleKey}
            onChange={changeRole}
            disabled={isPending || isOwnAdmin}
            aria-label={`Role for ${user.displayName}`}
            className="h-9 min-w-44 font-medium"
            options={roles
              .toSorted((a, b) => {
                if (a.key === "user") return -1;
                if (b.key === "user") return 1;
                return a.name.localeCompare(b.name);
              })
              .map((role) => ({ value: role.key, label: role.name }))}
          />
        </div>
      </div>

      <div className="border-t border-zinc-200/80 px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Permissions
          </h3>
          <span className="text-xs text-zinc-400 tabular-nums">
            {effectivePermissions.length}
          </span>
        </div>

        {effectivePermissions.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {effectivePermissions.map((permission) => (
              <li
                key={permission.id}
                className="flex min-w-0 gap-2.5 rounded-lg bg-zinc-50/80 px-3 py-2.5 ring-1 ring-zinc-200/70 ring-inset"
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                  <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-zinc-900">
                    {permission.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-zinc-500">
                    {permission.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-zinc-50/80 px-3 py-3 ring-1 ring-zinc-200/70 ring-inset">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-zinc-500 shadow-xs ring-1 ring-zinc-200 ring-inset">
              <UserRound size={16} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xs font-medium text-zinc-900">
                Standard Coursemap access
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">
                This account can use the student planning experience.
              </span>
            </span>
          </div>
        )}

        {isOwnAdmin ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck size={13} aria-hidden="true" />
            Another admin must change your role.
          </p>
        ) : null}

        <p
          role={isError ? "alert" : "status"}
          aria-live="polite"
          className={isError ? "mt-3 text-xs text-rose-700" : "sr-only"}
        >
          {feedback}
        </p>
      </div>
    </section>
  );
}
