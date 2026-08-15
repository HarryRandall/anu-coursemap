import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DataTableShell,
  tableCellClasses,
  tableClasses,
  tableHeadClasses,
  tableHeaderCellClasses,
  tableRowClasses,
} from "@/components/ui/data-table";
import type {
  AdminPermission,
  AdminRole,
  AdminRolePermission,
} from "@/lib/admin/users";
import { cn } from "@/lib/cn";
import { RolePermissionToggle } from "./role-permission-toggle";

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
  const groupedPermissions = groupPermissions(permissions);
  const grantKeys = new Set(
    grants.map((grant) => `${grant.roleId}:${grant.permissionId}`),
  );
  const roleColumnWidth = 172;
  const permissionColumnWidth = 380;
  const tableMinWidth = Math.max(
    760,
    permissionColumnWidth + roles.length * roleColumnWidth,
  );

  return (
    <DataTableShell
      viewport
      className="min-h-[420px] flex-1 lg:max-h-[calc(100dvh-12rem)]"
      footer={
        <p className="text-sm text-zinc-500">
          Viewing {permissions.length.toLocaleString("en-AU")} permissions
          across {roles.length.toLocaleString("en-AU")} roles
        </p>
      }
    >
      <table
        className={tableClasses()}
        style={{ minWidth: `${tableMinWidth}px` } as CSSProperties}
      >
        <colgroup>
          <col style={{ width: `${permissionColumnWidth}px` }} />
          {roles.map((role) => (
            <col key={role.id} style={{ width: `${roleColumnWidth}px` }} />
          ))}
        </colgroup>
        <thead className={tableHeadClasses()}>
          <tr>
            <th className={tableHeaderCellClasses()}>Permission</th>
            {roles.map((role) => (
              <th
                key={role.id}
                className={tableHeaderCellClasses("text-center")}
                title={role.description}
              >
                <span className="inline-block max-w-36 truncate align-middle">
                  {role.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedPermissions.length > 0 ? (
            groupedPermissions.flatMap(([category, categoryPermissions]) => [
              <tr
                key={`category-${category}`}
                className={tableRowClasses("bg-zinc-50 hover:bg-zinc-50")}
              >
                <th
                  scope="rowgroup"
                  colSpan={roles.length + 1}
                  className={tableCellClasses(
                    "py-2 text-left font-medium whitespace-normal text-zinc-500",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {permissionArea(category)}
                    <Badge
                      tone="neutral"
                      className="rounded-sm bg-white px-2 py-0.5"
                    >
                      {categoryPermissions.length.toLocaleString("en-AU")}
                    </Badge>
                  </span>
                </th>
              </tr>,
              ...categoryPermissions.map((permission) => (
                <tr
                  key={permission.id}
                  className={tableRowClasses("hover:bg-zinc-50/70")}
                >
                  <th
                    scope="row"
                    className={cn(
                      tableCellClasses("text-left whitespace-normal"),
                      "align-middle font-normal",
                    )}
                  >
                    <div className="max-w-md min-w-0">
                      <span className="text-sm font-medium text-zinc-900">
                        {permission.name}
                      </span>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {permission.description}
                      </p>
                    </div>
                  </th>
                  {roles.map((role) => {
                    const enabled = grantKeys.has(
                      `${role.id}:${permission.id}`,
                    );
                    return (
                      <td
                        key={role.id}
                        className={tableCellClasses("text-center")}
                      >
                        <div className="flex justify-center">
                          <RolePermissionToggle
                            roleId={role.id}
                            roleKey={role.key}
                            roleName={role.name}
                            permissionId={permission.id}
                            permissionKey={permission.key}
                            permissionName={permission.name}
                            initialEnabled={enabled}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )),
            ])
          ) : (
            <tr className={tableRowClasses()}>
              <td
                colSpan={Math.max(1, roles.length + 1)}
                className={tableCellClasses(
                  "h-24 text-center whitespace-normal text-zinc-500",
                )}
              >
                No permissions match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DataTableShell>
  );
}
