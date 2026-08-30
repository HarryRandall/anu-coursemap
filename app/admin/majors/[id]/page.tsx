import { AcademicStructureDetailPage } from "@/components/admin/academic-structures/academic-structure-detail-page";

export const dynamic = "force-dynamic";

export default function AdminMajorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  return (
    <AcademicStructureDetailPage
      expectedKind="major"
      params={params}
      searchParams={searchParams}
    />
  );
}
