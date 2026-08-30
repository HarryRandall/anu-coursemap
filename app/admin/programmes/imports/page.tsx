import { AcademicStructureImportsPage } from "@/components/admin/academic-structures/structure-imports-page";
import type { ImportListSearchParams } from "@/lib/coursemap/import-list-params";

export const dynamic = "force-dynamic";

export default function AdminProgrammesImportsPage({
  searchParams,
}: {
  searchParams: Promise<ImportListSearchParams>;
}) {
  return (
    <AcademicStructureImportsPage
      kind="programme"
      searchParams={searchParams}
    />
  );
}
