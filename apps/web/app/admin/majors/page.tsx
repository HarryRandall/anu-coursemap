import {
  AcademicStructureDirectoryPage,
  type AcademicStructureDirectorySearchParams,
} from "@/ui/admin/academic-structures/structure-directory-page";

export const dynamic = "force-dynamic";

export default function AdminMajorsPage({
  searchParams,
}: {
  searchParams: Promise<AcademicStructureDirectorySearchParams>;
}) {
  return (
    <AcademicStructureDirectoryPage kind="major" searchParams={searchParams} />
  );
}
