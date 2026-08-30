import { AcademicStructureImportRuns } from "@/components/admin/imports/academic-structure-import-runs";
import { loadAcademicStructureImportRunPage } from "@/lib/coursemap/admin-academic-structure-imports";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AcademicStructureImportRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const data = await loadAcademicStructureImportRunPage({
    page: Number(first(params.page)),
  });
  return <AcademicStructureImportRuns data={data} />;
}
