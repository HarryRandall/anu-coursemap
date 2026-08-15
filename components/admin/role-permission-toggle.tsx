"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LockKeyhole, X } from "lucide-react";
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
  const locked =
    roleKey === "catalogue_admin" && permissionKey === "admin.access";

  if (locked) {
    return (
      <span className="inline-flex h-8 min-w-24 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium text-zinc-700">
        <LockKeyhole size={13} aria-hidden="true" />
        Required
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
        role="switch"
        aria-checked={enabled}
        aria-busy={isPending}
        aria-label={`${enabled ? "Disable" : "Enable"} ${permissionName} for ${roleName}`}
        disabled={isPending}
        onClick={onToggle}
        className={cn(
          "group relative inline-flex h-8 min-w-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border px-3 text-xs font-medium transition-[background-color,border-color,color,box-shadow,opacity] duration-150 disabled:cursor-wait disabled:opacity-70",
          enabled
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            : "border-rose-200 bg-rose-50 text-rose-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
        )}
      >
        <span className="flex items-center gap-1.5 transition-[transform,opacity] duration-150 group-hover:-translate-y-3 group-hover:opacity-0 group-focus-visible:-translate-y-3 group-focus-visible:opacity-0">
          {enabled ? (
            <Check size={13} aria-hidden="true" />
          ) : (
            <X size={13} aria-hidden="true" />
          )}
          {enabled ? "Enabled" : "Disabled"}
        </span>
        <span className="absolute inset-0 flex translate-y-3 items-center justify-center gap-1.5 opacity-0 transition-[transform,opacity] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          {enabled ? (
            <X size={13} aria-hidden="true" />
          ) : (
            <Check size={13} aria-hidden="true" />
          )}
          {enabled ? "Disable" : "Enable"}
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {feedback}
      </span>
    </span>
  );
}
