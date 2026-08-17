import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { PlanCalendar } from "./plan-calendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
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
  return <PlanCalendar catalogue={catalogue} />;
}
