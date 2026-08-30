import { AcademicStructureDetailPage } from "@/components/admin/academic-structures/academic-structure-detail-page";

export const dynamic = "force-dynamic";

export default function AdminSpecialisationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  return (
    <AcademicStructureDetailPage
      expectedKind="specialisation"
      params={params}
      searchParams={searchParams}
    />
  );
}
