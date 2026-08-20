import { PlanningCatalogueError } from "@/components/plan/planning-catalogue-error";
import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { PlanCalendar } from "./plan-calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  let catalogue;
  try {
    catalogue = await loadCurrentUserPlanCatalogue();
  } catch {
    return (
      <PlanningCatalogueError pageTitle="Plan calendar" retryHref="/calendar" />
    );
  }
  return <PlanCalendar catalogue={catalogue} />;
}
