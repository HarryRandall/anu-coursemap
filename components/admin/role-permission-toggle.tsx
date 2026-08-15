"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Minus } from "lucide-react";
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
        className={cn(
          "grid size-7 place-items-center rounded-md ring-1 ring-inset",
          required
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-zinc-50 text-zinc-400 ring-zinc-200",
        )}
        title={required ? "Required for Admin" : "Not available for User"}
      >
        {required ? (
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <Minus size={14} aria-hidden="true" />
        )}
        <span className="sr-only">
          {required ? "Required" : "Not available"}
        </span>
      </span>
    );
  }

  const onToggle = () => {
    if (isPending) return;
    const next = !enabled;
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
      <button
        type="button"
        role="checkbox"
        aria-checked={enabled}
        aria-busy={isPending}
        aria-label={`${enabled ? "Remove" : "Grant"} ${permissionName} ${enabled ? "from" : "to"} ${roleName}`}
        title={`${enabled ? "Granted to" : "Not granted to"} ${roleName}`}
        disabled={isPending}
        onClick={onToggle}
        className={cn(
          "grid size-7 cursor-pointer place-items-center rounded-md border transition-[background-color,border-color,color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-wait motion-reduce:transition-none",
          enabled
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
            : "border-zinc-300 bg-white text-transparent hover:border-brand-300 hover:bg-brand-50",
        )}
      >
        {isPending ? (
          <LoaderCircle
            size={14}
            className="animate-spin text-zinc-500 motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {feedback}
      </span>
    </span>
  );
}
