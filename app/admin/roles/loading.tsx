import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";

export default function AdminRolesLoading() {
  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-[1400px] space-y-5" aria-busy="true">
        <span className="sr-only">Loading application roles</span>
        <div className="h-14 w-72 animate-pulse rounded-xl bg-zinc-200" />
        <Card className="h-20 animate-pulse bg-zinc-100" />
        <Card className="h-96 animate-pulse bg-zinc-100" />
      </div>
    </AppShell>
  );
}
