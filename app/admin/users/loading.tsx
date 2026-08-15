import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";

export default function AdminUsersLoading() {
  return (
    <AppShell admin>
      <h1 className="sr-only">Loading users and access</h1>
      <div
        className="mx-auto w-full max-w-[1600px] space-y-8"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Loading user access settings</span>
        <div className="h-11 animate-pulse rounded-lg bg-zinc-200" />
        <Card className="h-96 animate-pulse rounded-lg bg-zinc-100" />
      </div>
    </AppShell>
  );
}
