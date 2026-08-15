import type { CSSProperties } from "react";
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
  const roleColumnWidth = 150;
  const permissionColumnWidth = 500;
  const tableMinWidth = Math.max(
    800,
    permissionColumnWidth + roles.length * roleColumnWidth,
  );

  return (
    <DataTableShell>
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
                className={tableHeaderCellClasses(
                  "text-center tracking-normal whitespace-normal text-zinc-700 normal-case",
                )}
                title={role.description}
              >
                <span className="text-xs font-semibold">{role.name}</span>
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
                    "py-1.5 text-left text-[10px] font-semibold tracking-[0.08em] whitespace-normal text-zinc-500 uppercase",
                  )}
                >
                  {permissionArea(category)}
                </th>
              </tr>,
              ...categoryPermissions.map((permission) => (
                <tr
                  key={permission.id}
                  className={tableRowClasses("hover:bg-zinc-50/60")}
                >
                  <th
                    scope="row"
                    className={cn(
                      tableCellClasses("text-left whitespace-normal"),
                      "align-middle font-normal",
                    )}
                  >
                    <div className="max-w-lg min-w-0 py-0.5">
                      <span className="text-[13px] font-medium text-zinc-900">
                        {permission.name}
                      </span>
                      <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
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
