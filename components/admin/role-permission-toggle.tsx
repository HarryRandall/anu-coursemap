"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Minus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { setAdminRolePermission } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";

export function RolePermissionToggle({
  roleId,
  roleKey,
  roleName,
  permissionId,
  permissionKey,
  permissionName,
  initialEnabled,
}: {
  roleId: number;
  roleKey: string;
  roleName: string;
  permissionId: number;
  permissionKey: string;
  permissionName: string;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const required = roleKey === "admin" && permissionKey === "admin.access";
  const unavailable = roleKey === "user" && permissionKey === "admin.access";

  if (required || unavailable) {
    return (
      <span
        className="grid size-11 place-items-center"
        title={required ? "Required for Admin" : "Not available for User"}
      >
        <span
          className={cn(
            "grid size-7 place-items-center rounded-md border",
            required
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-400",
          )}
        >
          {required ? (
            <Check size={14} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Minus size={14} aria-hidden="true" />
          )}
        </span>
        <span className="sr-only">
          {required ? "Required" : "Not available"}
        </span>
      </span>
    );
  }

  const onToggle = (next: boolean) => {
    if (isPending) return;
    const previous = enabled;
    setEnabled(next);
    setFeedback("");
    startTransition(async () => {
      const result = await setAdminRolePermission(roleId, permissionId, next);
      if (!result.ok) setEnabled(previous);
      setFeedback(result.message);
      if (result.ok) router.refresh();
    });
  };

  return (
    <span>
      <span className="relative grid size-11 place-items-center rounded-lg hover:bg-zinc-100">
        <Checkbox
          checked={enabled}
          aria-busy={isPending}
          aria-label={`${enabled ? "Remove" : "Grant"} ${permissionName} ${enabled ? "from" : "to"} ${roleName}`}
          title={`${enabled ? "Granted to" : "Not granted to"} ${roleName}`}
          disabled={isPending}
          onCheckedChange={(checked) => onToggle(checked === true)}
          className={cn(
            "size-7",
            enabled &&
              "border-emerald-300 bg-emerald-600 hover:border-emerald-400 hover:bg-emerald-700 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:hover:border-emerald-700 data-[state=checked]:hover:bg-emerald-700",
          )}
        />
        {isPending ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <span className="grid size-7 place-items-center rounded-[5px] bg-white/85 text-zinc-500">
              <LoaderCircle
                size={14}
                className="animate-spin motion-reduce:animate-none"
              />
            </span>
          </span>
        ) : null}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {feedback}
      </span>
    </span>
  );
}
