import { redirect } from "next/navigation";
import { PlanningCatalogueError } from "@/components/plan/planning-catalogue-error";
import { getAuthViewer } from "@/lib/auth/viewer";
import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { hasPrimaryPlan } from "@/lib/coursemap/state";
import { isDemoMode } from "@/lib/supabase/config";
import { Dashboard } from "./dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isDemoMode()) {
    const viewer = await getAuthViewer();
    if (viewer && !(await hasPrimaryPlan(viewer))) {
      redirect("/onboarding");
    }
  }

  let catalogue;
  try {
    catalogue = await loadCurrentUserPlanCatalogue();
  } catch {
    return <PlanningCatalogueError pageTitle="Home" retryHref="/dashboard" />;
  }
  return <Dashboard catalogue={catalogue} />;
}
