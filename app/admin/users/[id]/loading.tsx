import { AppShell } from "@/components/shell";
import { Card } from "@/components/ui/card";

export default function AdminUserDetailLoading() {
  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-[1100px] space-y-5" aria-busy="true">
        <span className="sr-only">Loading user access</span>
        <div className="h-11 w-32 animate-pulse rounded-lg bg-zinc-200" />
        <div className="h-16 w-80 max-w-full animate-pulse rounded-xl bg-zinc-200" />
        <Card className="h-20 animate-pulse bg-zinc-100" />
        <Card className="h-72 animate-pulse bg-zinc-100" />
      </div>
    </AppShell>
  );
}
