import { AcademicStructureImportReviewPage } from "@/components/admin/academic-structures/structure-imports-page";

export const dynamic = "force-dynamic";

export default function AdminMinorsImportPage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  return <AcademicStructureImportReviewPage kind="minor" params={params} />;
}
