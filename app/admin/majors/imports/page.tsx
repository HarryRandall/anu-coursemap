import { AcademicStructureImportsPage } from "@/components/admin/academic-structures/structure-imports-page";
import type { ImportListSearchParams } from "@/lib/coursemap/import-list-params";

export const dynamic = "force-dynamic";

export default function AdminMajorsImportsPage({
  searchParams,
}: {
  searchParams: Promise<ImportListSearchParams>;
}) {
  return (
    <AcademicStructureImportsPage kind="major" searchParams={searchParams} />
  );
}
