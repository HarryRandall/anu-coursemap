import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { UserAccessEditor } from "@/components/admin/user-role-manager";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { loadAdminUserDetail } from "@/lib/admin/users";
import { getAuthContext } from "@/lib/auth/viewer";

function initials(displayName: string, email: string | null) {
  return (displayName || email || "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { viewer }] = await Promise.all([params, getAuthContext()]);
  if (!viewer) return null;

  const data = await loadAdminUserDetail(id);
  if (!data) notFound();

  const assignedRoleKeys = new Set(
    data.assignments.map((assignment) => assignment.roleKey),
  );
  const assignedRoles = data.roles.filter((role) =>
    assignedRoleKeys.has(role.key),
  );
  const effectivePermissions = Array.from(
    new Set(assignedRoles.flatMap((role) => role.permissionKeys)),
  ).sort();
  const isAdministrator = effectivePermissions.includes("admin.access");

  return (
    <AppShell
      admin
      actions={
        <ButtonLink href="/admin/roles" size="sm" variant="secondary">
          <KeyRound size={14} aria-hidden="true" />
          Roles
        </ButtonLink>
      }
    >
      <div className="mx-auto w-full max-w-[1100px] space-y-5">
        <Link
          href="/admin/users"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to users
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 shadow-sm ring-4 ring-white">
              {initials(data.user.displayName, data.user.email)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-950">
                  {data.user.displayName}
                </h1>
                {data.user.userId === viewer.id && (
                  <Badge tone="brand">You</Badge>
                )}
                {isAdministrator && (
                  <Badge tone="success">
                    <ShieldCheck size={12} aria-hidden="true" /> Administrator
                  </Badge>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-zinc-500">
                {data.user.email ?? "No email address"}
              </p>
            </div>
          </div>
        </header>

        <Card className="overflow-hidden">
          <div className="grid divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-3 px-5 py-4">
              <CalendarDays
                size={17}
                className="text-zinc-400"
                aria-hidden="true"
              />
              <span>
                <span className="block text-[11px] font-medium text-zinc-500">
                  Joined
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-zinc-900">
                  {formatDate(data.user.createdAt)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <KeyRound
                size={17}
                className="text-zinc-400"
                aria-hidden="true"
              />
              <span>
                <span className="block text-[11px] font-medium text-zinc-500">
                  Assigned roles
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-zinc-900">
                  {assignedRoles.length.toLocaleString("en-AU")}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <ShieldCheck
                size={17}
                className="text-zinc-400"
                aria-hidden="true"
              />
              <span>
                <span className="block text-[11px] font-medium text-zinc-500">
                  Effective permissions
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-zinc-900">
                  {effectivePermissions.length.toLocaleString("en-AU")}
                </span>
              </span>
            </div>
          </div>
        </Card>

        <UserAccessEditor
          user={data.user}
          roles={data.roles}
          assignments={data.assignments}
          currentUserId={viewer.id}
        />

        <Card>
          <CardHeader
            title="Effective permissions"
            description="Combined permissions inherited from every assigned role."
            icon={
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck size={17} aria-hidden="true" />
              </span>
            }
          />
          <div className="border-t border-zinc-100 px-5 py-4">
            {effectivePermissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {effectivePermissions.map((permission) => (
                  <Badge key={permission} tone="neutral" className="font-mono">
                    {permission}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                This account has no application permissions.
              </p>
            )}
          </div>
        </Card>

        <p className="flex items-center gap-2 text-xs text-zinc-400">
          <Clock3 size={13} aria-hidden="true" />
          Profile updated {formatDate(data.user.updatedAt)}
        </p>
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
