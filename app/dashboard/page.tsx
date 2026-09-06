import { PlanningCatalogueError } from "@/components/plan/planning-catalogue-error";
import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

/**
 * Student home. Students without a primary plan see the dashboard empty state,
 * which offers onboarding, rather than being redirected into it.
 */
export default async function DashboardPage() {
  let catalogue;
  try {
    catalogue = await loadCurrentUserPlanCatalogue();
  } catch {
    return <PlanningCatalogueError pageTitle="Home" retryHref="/dashboard" />;
  }
  return <Dashboard catalogue={catalogue} />;
}
