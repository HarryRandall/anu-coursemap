import { loadAdminStructurePage } from "@/lib/coursemap/admin-catalogue";
import { ProgrammeList } from "./programme-list";

export const dynamic = "force-dynamic";

export default async function AdminProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const page = Number(
    Array.isArray(params.page) ? params.page[0] : params.page,
  );
  return (
    <ProgrammeList
      data={await loadAdminStructurePage({ page })}
      searchParams={{}}
    />
  );
}
