"use client";
import { Button } from "@coursemap/ui/primitives/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coursemap/ui/primitives/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@coursemap/ui/primitives/tooltip";
import ReuiLink from "next/link";

import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { FilterBar } from "@/ui/common/filter-bar";
import { DataTableEmpty, DataTableShell } from "@/ui/common/data-table";
import type {
  AdminPermission,
  AdminRole,
  AdminRolePermission,
} from "@/lib/admin/users";

import { RolePermissionToggle } from "./role-permission-toggle";

/**
 * Role descriptions live behind an info control so the matrix header stays a
 * single line and the columns line up with the permission rows beneath them.
 */
function RoleHeading({ role }: { role: AdminRole }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {role.name}
      </span>
      {role.description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground/80 transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              type="button"
            >
              <Info aria-hidden="true" size={12} />
              <span className="sr-only">About the {role.name} role</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{role.description}</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

function permissionArea(category: string) {
  const labels: Record<string, string> = {
    admin: "Platform access",
    approvals: "Approvals",
    catalogue: "Catalogue",
    imports: "Imports",
  };
  return (
    labels[category] ??
    category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function groupPermissions(permissions: AdminPermission[]) {
  const groups = new Map<string, AdminPermission[]>();
  for (const permission of permissions) {
    groups.set(permission.category, [
      ...(groups.get(permission.category) ?? []),
      permission,
    ]);
  }
  return Array.from(groups.entries());
}

export function RolePermissionMatrix({
  roles,
  permissions,
  grants,
}: {
  roles: AdminRole[];
  permissions: AdminPermission[];
  grants: AdminRolePermission[];
}) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const categoryFilter = searchParams.get("area") ?? "";
  const roleFilter = searchParams.get("role") ?? "";
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const allGroups = groupPermissions(permissions);
  const visibleRoles = roles.filter(
    (role) => !roleFilter || role.key === roleFilter,
  );
  const groupedPermissions = groupPermissions(
    permissions.filter(
      (permission) =>
        (!categoryFilter || permission.category === categoryFilter) &&
        (!query ||
          `${permission.name} ${permission.description} ${permissionArea(permission.category)}`
            .toLowerCase()
            .includes(query)),
    ),
  );
  const grantKeys = new Set(
    grants.map((grant) => `${grant.roleId}:${grant.permissionId}`),
  );

  return (
    <div className="workspace-stack">
      <FilterBar
        searchPlaceholder="Search permissions or pages..."
        filters={[
          {
            key: "area",
            label: "Page",
            allLabel: "All pages",
            options: allGroups.map(([category]) => ({
              value: category,
              label: permissionArea(category),
            })),
          },
          {
            key: "role",
            label: "Role",
            allLabel: "All roles",
            options: roles.map((role) => ({
              value: role.key,
              label: role.name,
            })),
          },
        ]}
      />
      <div
        className="workspace-scroll space-y-4"
        role="region"
        aria-label="Role permissions"
        tabIndex={0}
      >
        {groupedPermissions.length > 0 && visibleRoles.length > 0 ? (
          groupedPermissions.map(([category, categoryPermissions]) => {
            const expanded = !collapsed.has(category);
            const regionId = `permissions-${category}`;
            return (
              <section
                key={category}
                className="overflow-clip rounded-xl border border-border/80 bg-card"
              >
                <h2 className="sticky top-0 z-20 bg-card">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={regionId}
                    className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    onClick={() =>
                      setCollapsed((previous) => {
                        const next = new Set(previous);
                        if (next.has(category)) next.delete(category);
                        else next.add(category);
                        return next;
                      })
                    }
                  >
                    <ChevronDown
                      aria-hidden="true"
                      size={16}
                      className={
                        expanded
                          ? "text-muted-foreground"
                          : "-rotate-90 text-muted-foreground"
                      }
                    />
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {permissionArea(category)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {categoryPermissions.length}{" "}
                      {categoryPermissions.length === 1
                        ? "permission"
                        : "permissions"}
                    </span>
                  </button>
                </h2>
                <div id={regionId} hidden={!expanded}>
                  <DataTableShell className="!rounded-none !border-0 border-t !shadow-none">
                    <Table
                      className="table-fixed"
                      style={{
                        minWidth: `${260 + visibleRoles.length * 110}px`,
                      }}
                    >
                      <TableCaption className="sr-only">
                        {permissionArea(category)} permissions by Coursemap role
                      </TableCaption>
                      <colgroup>
                        <col />
                        {visibleRoles.map((role) => (
                          <col key={role.id} style={{ width: "110px" }} />
                        ))}
                      </colgroup>
                      <TableHeader>
                        <TableRow className="!h-10 hover:!bg-transparent">
                          <TableHead>Permission</TableHead>
                          {visibleRoles.map((role) => (
                            <TableHead key={role.id} className="text-center">
                              <RoleHeading role={role} />
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryPermissions.map((permission) => (
                          <TableRow
                            key={permission.id}
                            className="hover:!bg-transparent"
                          >
                            <TableHead
                              scope="row"
                              className="h-auto py-3 text-left font-normal tracking-normal whitespace-normal normal-case"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {permission.name}
                              </span>
                              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                {permission.description}
                              </p>
                            </TableHead>
                            {visibleRoles.map((role) => (
                              <TableCell key={role.id} className="text-center">
                                <div className="flex justify-center">
                                  <RolePermissionToggle
                                    roleId={role.id}
                                    roleKey={role.key}
                                    roleName={role.name}
                                    permissionId={permission.id}
                                    permissionKey={permission.key}
                                    permissionName={permission.name}
                                    initialEnabled={grantKeys.has(
                                      `${role.id}:${permission.id}`,
                                    )}
                                  />
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DataTableShell>
                </div>
              </section>
            );
          })
        ) : (
          <DataTableShell>
            <DataTableEmpty
              title={
                permissions.length
                  ? "No matching permissions"
                  : "No permissions"
              }
              description={
                permissions.length
                  ? "Try another search or remove a filter."
                  : "Permissions will appear here when roles are configured."
              }
            />
            {permissions.length > 0 && (
              <div className="flex justify-center pb-5">
                <Button asChild variant="outline">
                  <ReuiLink href="/admin/roles">
                    Clear search and filters
                  </ReuiLink>
                </Button>
              </div>
            )}
          </DataTableShell>
        )}
      </div>
    </div>
  );
}
