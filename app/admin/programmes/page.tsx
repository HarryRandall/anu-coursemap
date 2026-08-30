import { redirect } from "next/navigation";
import {
  AcademicStructureDirectoryPage,
  type AcademicStructureDirectorySearchParams,
} from "@/components/admin/academic-structures/structure-directory-page";
import { legacyAdminAcademicStructureCollectionRedirect } from "@/lib/coursemap/academic-structure-routes";

export const dynamic = "force-dynamic";

export default async function AdminProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<
    AcademicStructureDirectorySearchParams & {
      kind?: string | string[];
    }
  >;
}) {
  const params = await searchParams;
  const legacyRedirect = legacyAdminAcademicStructureCollectionRedirect(params);
  if (legacyRedirect) redirect(legacyRedirect);

  return (
    <AcademicStructureDirectoryPage
      kind="programme"
      searchParams={Promise.resolve(params)}
    />
  );
}
