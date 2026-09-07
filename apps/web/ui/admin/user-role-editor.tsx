"use client";
import { Card } from "@coursemap/ui/primitives/card";
import { Button } from "@coursemap/ui/primitives/button";
import { OptionPicker } from "@/ui/ui/option-picker";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@coursemap/ui/primitives/collapsible";
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

  const assignment = assignments[0];
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Role</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {isOwnAdmin
              ? "Another admin must change your role."
              : "Changes save automatically."}
          </p>
        </div>
        <OptionPicker
          value={"coursemap:" + String(roleKey)}
          onValueChange={(nextValue) => {
            const option = roles
              .toSorted((a, b) =>
                a.key === "user"
                  ? -1
                  : b.key === "user"
                    ? 1
                    : a.name.localeCompare(b.name),
              )
              .map((role) => ({ value: role.key, label: role.name }))
              .find(
                (option) => "coursemap:" + String(option.value) === nextValue,
              );
            if (option) changeRole(option.value);
          }}
          disabled={isPending || isOwnAdmin}
          className={"w-full sm:w-48"}
          aria-label={`Role for ${user.displayName}`}
          onPointerDown={(event) => event.stopPropagation()}
          placeholder={"Select..."}
          items={roles
            .toSorted((a, b) =>
              a.key === "user"
                ? -1
                : b.key === "user"
                  ? 1
                  : a.name.localeCompare(b.name),
            )
            .map((role) => ({ value: role.key, label: role.name }))
            .map((option) => ({
              value: "coursemap:" + String(option.value),
              label: option.label,
            }))}
        />
      </div>
      <Collapsible className="mt-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group -ml-2 text-xs text-muted-foreground"
            type="button"
          >
            View permissions
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 group-data-[state=open]:rotate-180"
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 border-t border-border pt-4">
            {effectivePermissions.length ? (
              <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {effectivePermissions.map((permission) => (
                  <li key={permission.id}>
                    <p className="text-sm font-medium">{permission.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {permission.description}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Standard student planning access.
              </p>
            )}
            <p className="mt-5 text-xs text-muted-foreground">
              Role assigned by{" "}
              {assignment?.grantedByDisplayName ?? "system default"}
              {assignment?.grantedAt
                ? ` on ${new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(assignment.grantedAt))}`
                : ""}
              .
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
      {isError ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {feedback}
        </p>
      ) : (
        <p
          role="status"
          aria-live="polite"
          className={
            isPending || feedback
              ? "mt-2 text-xs text-muted-foreground"
              : "sr-only"
          }
        >
          {isPending ? "Saving role..." : feedback}
        </p>
      )}
    </Card>
  );
}
