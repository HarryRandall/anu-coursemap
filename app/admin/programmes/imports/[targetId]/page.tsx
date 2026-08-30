import { AcademicStructureImportReviewPage } from "@/components/admin/academic-structures/structure-imports-page";

export const dynamic = "force-dynamic";

export default function AdminProgrammesImportPage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  return <AcademicStructureImportReviewPage kind="programme" params={params} />;
}
