import { Suspense } from "react";
import { loadCatalogueYears } from "@/components/admin/imports/imports-overview-data";
import { ProgrammeImport } from "@/components/admin/imports/programme-import";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function ImportProgrammesPage() {
  const catalogueYears = await loadCatalogueYears();

  return (
    <AppShell admin>
      <Suspense fallback={<div className="mx-auto w-full max-w-7xl pb-10" />}>
        <ProgrammeImport catalogueYears={catalogueYears} />
      </Suspense>
    </AppShell>
  );
}
