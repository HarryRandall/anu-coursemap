import { notFound } from "next/navigation";
import { ChangeDetail } from "@/components/admin/imports/change-detail";
import { loadImportChange } from "@/components/admin/imports/import-detail-data";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function ImportChangePage({
  params,
}: {
  params: Promise<{ changeId: string }>;
}) {
  const { changeId } = await params;
  const id = Number(changeId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const change = await loadImportChange(id);
  if (!change) notFound();

  return (
    <AppShell admin currentBreadcrumbLabel={change.code}>
      <ChangeDetail change={change} />
    </AppShell>
  );
}
