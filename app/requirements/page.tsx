import { PlanningCatalogueError } from "@/components/plan/planning-catalogue-error";
import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { Requirements } from "./requirements";

export const dynamic = "force-dynamic";

export default async function RequirementsPage() {
  let catalogue;
  try {
    catalogue = await loadCurrentUserPlanCatalogue();
  } catch {
    return (
      <PlanningCatalogueError
        pageTitle="Requirements"
        retryHref="/requirements"
      />
    );
  }
  return <Requirements catalogue={catalogue} />;
}
