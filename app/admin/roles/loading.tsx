import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";

export default function AdminRolesLoading() {
  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-[1600px] space-y-8" aria-busy="true">
        <span className="sr-only">Loading application roles</span>
        <div className="h-11 animate-pulse rounded-lg bg-zinc-200" />
        <Card className="h-[32rem] animate-pulse rounded-lg bg-zinc-100" />
      </div>
    </AppShell>
  );
}
