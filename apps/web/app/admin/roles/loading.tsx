import { RoleMatrixLoadingSkeleton } from "@/ui/admin/users/access-loading";
import { AppShell } from "@/ui/shell";

export default function AdminRolesLoading() {
  return (
    <AppShell loading fill admin>
      <div aria-busy="true" className="workspace-scroll">
        <span className="sr-only">Loading application roles</span>
        <RoleMatrixLoadingSkeleton />
      </div>
    </AppShell>
  );
}
