import { UserDetailLoadingSkeleton } from "@/components/admin/access-loading";
import { AppShell } from "@/components/shell";

export default function AdminUserDetailLoading() {
  return (
    <AppShell admin>
      <div aria-busy="true">
        <span className="sr-only">Loading user access</span>
        <UserDetailLoadingSkeleton />
      </div>
    </AppShell>
  );
}
