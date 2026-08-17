import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { Requirements } from "./requirements";

export const dynamic = "force-dynamic";

export default async function RequirementsPage() {
  let catalogue;
  try {
    catalogue = await loadCurrentUserPlanCatalogue();
  } catch {
    catalogue = {
      courses: [],
      degrees: [],
      majors: [],
      programmeRequirementsImported: false,
      terms: [],
    };
  }
  return <Requirements catalogue={catalogue} />;
}
