"use client";

import { Check, KeyRound, ListChecks, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminRole } from "@/lib/admin/users";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const permissionDescriptions: Record<string, string> = {
  "admin.access": "Open protected Coursemap administration routes.",
  "approvals.review": "Review and resolve student approval requests.",
  "catalogue.read_drafts": "Inspect catalogue records before publication.",
  "catalogue.write": "Create and change catalogue-managed records.",
  "imports.manage": "Run and review catalogue import operations.",
};

function permissionName(permission: string) {
  return permission
    .split(".")
    .at(-1)!
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function permissionArea(permission: string) {
  const area = permission.split(".")[0];
  const labels: Record<string, string> = {
    admin: "Platform access",
    approvals: "Approvals",
    catalogue: "Catalogue",
    imports: "Imports",
  };
  return (
    labels[area] ?? area.replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function roleTone(role: AdminRole): "brand" | "info" | "neutral" {
  if (role.permissionKeys.includes("admin.access")) return "brand";
  if (role.permissionKeys.length > 0) return "info";
  return "neutral";
}

export function RolePermissionMatrix({ roles }: { roles: AdminRole[] }) {
  const [query, setQuery] = useState("");
  const allPermissions = useMemo(
    () =>
      Array.from(new Set(roles.flatMap((role) => role.permissionKeys))).sort(),
    [roles],
  );
  const filteredPermissions = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    if (!normalisedQuery) return allPermissions;
    return allPermissions.filter((permission) =>
      `${permission} ${permissionName(permission)} ${permissionArea(permission)} ${
        permissionDescriptions[permission] ?? ""
      }`
        .toLowerCase()
        .includes(normalisedQuery),
    );
  }, [allPermissions, query]);
  const groupedPermissions = filteredPermissions.reduce(
    (groups, permission) => {
      const area = permissionArea(permission);
      groups.set(area, [...(groups.get(area) ?? []), permission]);
      return groups;
    },
    new Map<string, string[]>(),
  );
  const grantCount = roles.reduce(
    (total, role) => total + role.permissionKeys.length,
    0,
  );

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="grid divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { label: "Application roles", value: roles.length, icon: KeyRound },
            {
              label: "Permissions",
              value: allPermissions.length,
              icon: ListChecks,
            },
            { label: "Role grants", value: grantCount, icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-5 py-4"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
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
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">
              Permission matrix
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Role defaults are read-only here and changed through reviewed
              migrations.
            </p>
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-zinc-50 px-3 ring-1 ring-zinc-200 ring-inset sm:w-72">
            <Search size={15} className="text-zinc-400" aria-hidden="true" />
            <span className="sr-only">Search permissions</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search permissions"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-left text-[13px]">
            <colgroup>
              <col className="w-[360px]" />
              {roles.map((role) => (
                <col key={role.key} className="w-44" />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                <th className="px-4 py-3">Permission</th>
                {roles.map((role) => (
                  <th
                    key={role.key}
                    className="px-4 py-3 text-center normal-case"
                  >
                    <Badge tone={roleTone(role)}>{role.name}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Array.from(groupedPermissions.entries()).flatMap(
                ([area, permissions]) => [
                  <tr key={`area-${area}`} className="bg-zinc-50/65">
                    <th
                      scope="rowgroup"
                      colSpan={roles.length + 1}
                      className="px-4 py-2 text-[11px] font-semibold tracking-wide text-zinc-600"
                    >
                      {area}
                      <Badge tone="neutral" className="ml-2">
                        {permissions.length}
                      </Badge>
                    </th>
                  </tr>,
                  ...permissions.map((permission) => (
                    <tr
                      key={permission}
                      className="bg-white hover:bg-zinc-50/60"
                    >
                      <th scope="row" className="px-4 py-3.5 font-normal">
                        <span className="block text-sm font-semibold text-zinc-900">
                          {permissionName(permission)}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                          {permissionDescriptions[permission] ?? permission}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-zinc-400">
                          {permission}
                        </span>
                      </th>
                      {roles.map((role) => {
                        const enabled =
                          role.permissionKeys.includes(permission);
                        return (
                          <td
                            key={role.key}
                            className="px-4 py-3.5 text-center"
                          >
                            {enabled ? (
                              <span className="mx-auto grid size-7 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                <Check
                                  size={14}
                                  strokeWidth={2.5}
                                  aria-label="Granted"
                                />
                              </span>
                            ) : (
                              <span
                                className="text-zinc-300"
                                aria-label="Not granted"
                              >
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )),
                ],
              )}
            </tbody>
          </table>
        </div>

        {filteredPermissions.length === 0 && (
          <div className="border-t border-zinc-100 px-5 py-12 text-center">
            <p className="text-sm font-semibold text-zinc-800">
              No permissions found
            </p>
            <p className="mt-1 text-xs text-zinc-500">Try a broader search.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
