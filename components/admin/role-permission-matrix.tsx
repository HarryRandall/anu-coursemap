import { Info } from "lucide-react";
import type { CSSProperties } from "react";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/data-table";
import type {
  AdminPermission,
  AdminRole,
  AdminRolePermission,
} from "@/lib/admin/users";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RolePermissionToggle } from "./role-permission-toggle";

/**
 * Role descriptions live behind an info control so the matrix header stays a
 * single line and the columns line up with the permission rows beneath them.
 */
function RoleHeading({ role }: { role: AdminRole }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[11px] font-semibold tracking-[0.08em] text-zinc-600 uppercase">
        {role.name}
      </span>
      {role.description ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="grid size-4 cursor-pointer place-items-center rounded-full text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
              type="button"
            >
              <Info aria-hidden="true" size={12} />
              <span className="sr-only">About the {role.name} role</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-64">
            <p className="text-xs leading-5 font-normal tracking-normal text-zinc-600 normal-case">
              {role.description}
            </p>
          </PopoverContent>
        </Popover>
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
      <Table
        className="table-fixed"
        style={{ minWidth: `${tableMinWidth}px` } as CSSProperties}
      >
        <TableCaption>Role permissions by Coursemap role</TableCaption>
        <colgroup>
          <col style={{ width: `${permissionColumnWidth}px` }} />
          {roles.map((role) => (
            <col key={role.id} style={{ width: `${roleColumnWidth}px` }} />
          ))}
        </colgroup>
        {groupedPermissions.length > 0 ? (
          groupedPermissions.map(([category, categoryPermissions]) => (
            <TableBody key={category}>
              <TableRow className="bg-zinc-50/70 hover:bg-zinc-50/70">
                <TableHead
                  scope="rowgroup"
                  className="h-9 py-1.5 text-left text-[10px] font-semibold tracking-[0.08em] whitespace-normal text-zinc-500 uppercase"
                >
                  {permissionArea(category)}
                </TableHead>
                {roles.map((role) => (
                  <TableHead
                    className="h-9 py-1.5 text-center whitespace-nowrap"
                    key={role.id}
                  >
                    <RoleHeading role={role} />
                  </TableHead>
                ))}
              </TableRow>
              {categoryPermissions.map((permission) => (
                <TableRow key={permission.id} className="group">
                  <TableHead
                    scope="row"
                    className="sticky left-0 z-10 h-auto bg-white py-3 text-left font-normal tracking-normal whitespace-normal normal-case group-hover:bg-zinc-50"
                  >
                    <div className="max-w-lg min-w-0 py-0.5">
                      <span className="text-[13px] font-medium text-zinc-900">
                        {permission.name}
                      </span>
                      <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                        {permission.description}
                      </p>
                    </div>
                  </TableHead>
                  {roles.map((role) => {
                    const enabled = grantKeys.has(
                      `${role.id}:${permission.id}`,
                    );
                    return (
                      <TableCell key={role.id} className="text-center">
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
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          ))
        ) : (
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={Math.max(1, roles.length + 1)}
                className="p-0"
              >
                <DataTableEmpty
                  title="No permissions"
                  description="Permissions will appear here when roles are configured."
                />
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Table>
    </DataTableShell>
  );
}
