import { notFound } from "next/navigation";
import { AcademicStructureImportTargetReview } from "@/components/admin/imports/academic-structure-import-target-review";
import { canWriteCatalogue } from "@/lib/auth/viewer";
import { loadAcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";

export const dynamic = "force-dynamic";

export default async function AcademicStructureImportTargetPage({
  params,
}: {
  params: Promise<{ runId: string; targetId: string }>;
}) {
  const { runId, targetId } = await params;
  const [detail, canPublish] = await Promise.all([
    loadAcademicStructureImportTargetDetail({ runId, targetId }),
    canWriteCatalogue(),
  ]);
  if (!detail) notFound();
  return (
    <AcademicStructureImportTargetReview
      canPublish={canPublish}
      detail={detail}
    />
  );
}
