import { loadAdminStructurePage } from "@/lib/coursemap/admin-catalogue";
import { ProgrammeList } from "./programme-list";

export const dynamic = "force-dynamic";

export default async function AdminProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim();
  const page = Number(
    Array.isArray(params.page) ? params.page[0] : params.page,
  );
  return (
    <ProgrammeList
      data={await loadAdminStructurePage({ query: q, page })}
      searchParams={{ q: q || undefined }}
    />
  );
}
