import { AcademicStructureDetailPage } from "@/ui/admin/academic-structures/academic-structure-detail-page";

export const dynamic = "force-dynamic";

export default function AdminMinorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  return (
    <AcademicStructureDetailPage
      expectedKind="minor"
      params={params}
      searchParams={searchParams}
    />
  );
}
