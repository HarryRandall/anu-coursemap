import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { AcademicRecord } from "./academic-record";

export const dynamic = "force-dynamic";

export default async function AcademicPage() {
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
  return <AcademicRecord catalogue={catalogue} />;
}
