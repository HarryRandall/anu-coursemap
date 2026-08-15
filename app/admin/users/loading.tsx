import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";

export default function AdminUsersLoading() {
  return (
    <AppShell admin>
      <h1 className="sr-only">Loading users and access</h1>
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading user access settings</span>
        <Card className="h-40 animate-pulse bg-zinc-100" />
        <Card className="h-72 animate-pulse bg-zinc-100" />
      </div>
    </AppShell>
  );
}
