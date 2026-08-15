import { UserDirectoryLoadingSkeleton } from "@/components/admin/access-loading";
import { AppShell } from "@/components/shell";

export default function AdminUsersLoading() {
  return (
    <AppShell admin>
      <h1 className="sr-only">Loading users and access</h1>
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading user access settings</span>
        <UserDirectoryLoadingSkeleton />
      </div>
    </AppShell>
  );
}
