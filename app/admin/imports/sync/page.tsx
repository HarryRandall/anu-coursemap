import { AutoSyncCard } from "@/components/admin/imports/auto-sync-card";
import { loadImportsDashboard } from "@/components/admin/imports/imports-overview-data";
import { RecentRuns } from "@/components/admin/imports/recent-runs";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function ImportsSyncPage() {
  const data = await loadImportsDashboard();

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        {/* The sidebar and the breadcrumb both already say Sync. */}
        <h1 className="sr-only">Catalogue sync</h1>

        {data.error ? (
          <Alert tone="danger">
            <AlertDescription>{data.error}</AlertDescription>
          </Alert>
        ) : null}

        <AutoSyncCard />
        <RecentRuns runs={data.runs} />
      </div>
    </AppShell>
  );
}
