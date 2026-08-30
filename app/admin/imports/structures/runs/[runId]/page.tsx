import { notFound } from "next/navigation";
import { AcademicStructureImportRunDetailView } from "@/components/admin/imports/academic-structure-import-run-detail";
import { loadAcademicStructureImportRunDetail } from "@/lib/coursemap/admin-academic-structure-imports";

export const dynamic = "force-dynamic";

export default async function AcademicStructureImportRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const detail = await loadAcademicStructureImportRunDetail(runId);
  if (!detail) notFound();
  return <AcademicStructureImportRunDetailView detail={detail} />;
}
