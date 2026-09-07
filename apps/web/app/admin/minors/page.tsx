import {
  AcademicStructureDirectoryPage,
  type AcademicStructureDirectorySearchParams,
} from "@/ui/admin/academic-structures/structure-directory-page";

export const dynamic = "force-dynamic";

export default function AdminMinorsPage({
  searchParams,
}: {
  searchParams: Promise<AcademicStructureDirectorySearchParams>;
}) {
  return (
    <AcademicStructureDirectoryPage kind="minor" searchParams={searchParams} />
  );
}
