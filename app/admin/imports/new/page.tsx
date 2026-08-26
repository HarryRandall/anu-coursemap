import { ImportWizard } from "@/components/admin/imports/import-wizard";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default function NewImportPage() {
  return (
    <AppShell admin currentBreadcrumbLabel="New import">
      <ImportWizard />
    </AppShell>
  );
}
