import { AcademicStructureImportReviewPage } from "@/components/admin/academic-structures/structure-imports-page";

export const dynamic = "force-dynamic";

export default function AdminMajorsImportPage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  return <AcademicStructureImportReviewPage kind="major" params={params} />;
}
