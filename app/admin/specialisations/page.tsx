import {
  AcademicStructureDirectoryPage,
  type AcademicStructureDirectorySearchParams,
} from "@/components/admin/academic-structures/structure-directory-page";

export const dynamic = "force-dynamic";

export default function AdminSpecialisationsPage({
  searchParams,
}: {
  searchParams: Promise<AcademicStructureDirectorySearchParams>;
}) {
  return (
    <AcademicStructureDirectoryPage
      kind="specialisation"
      searchParams={searchParams}
    />
  );
}
