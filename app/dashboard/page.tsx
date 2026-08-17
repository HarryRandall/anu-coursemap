import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
  return <Dashboard catalogue={catalogue} />;
}
