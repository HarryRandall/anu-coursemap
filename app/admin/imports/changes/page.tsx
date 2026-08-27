import { ChangesQueue } from "@/components/admin/imports/changes-queue";
import { loadImportsDashboard } from "@/components/admin/imports/imports-overview-data";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function ImportChangesPage() {
  const data = await loadImportsDashboard();

  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        {/* The sidebar and the breadcrumb both already say Changes. */}
        <h1 className="sr-only">Catalogue changes</h1>

        {data.error ? (
          <Alert tone="danger">
            <AlertDescription>{data.error}</AlertDescription>
          </Alert>
        ) : null}

        <ChangesQueue flags={data.flags} />
      </div>
    </AppShell>
  );
}
