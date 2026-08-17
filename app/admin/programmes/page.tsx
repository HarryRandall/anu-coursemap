import { loadAdminStructureRecords } from "@/lib/coursemap/admin-catalogue";
import { ProgrammeList } from "./programme-list";

export const dynamic = "force-dynamic";

export default async function AdminProgrammesPage() {
  return <ProgrammeList records={await loadAdminStructureRecords()} />;
}
