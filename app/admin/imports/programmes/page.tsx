import { loadCatalogueYears } from "@/components/admin/imports/imports-overview-data";
import { ProgrammeImport } from "@/components/admin/imports/programme-import";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function ImportProgrammesPage() {
  return (
    <AppShell admin>
      <ProgrammeImport catalogueYears={await loadCatalogueYears()} />
    </AppShell>
  );
}
