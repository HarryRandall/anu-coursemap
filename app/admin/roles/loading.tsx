import { RoleMatrixLoadingSkeleton } from "@/components/admin/access-loading";
import { AppShell } from "@/components/shell";

export default function AdminRolesLoading() {
  return (
    <AppShell admin>
      <div aria-busy="true">
        <span className="sr-only">Loading application roles</span>
        <RoleMatrixLoadingSkeleton />
      </div>
    </AppShell>
  );
}
