import { redirect } from "next/navigation";
import { getAuthViewer } from "@/lib/auth/viewer";
import { loadOnboardingCatalogue } from "@/lib/coursemap/onboarding-catalogue";
import { isDemoMode } from "@/lib/supabase/config";
import { hasPrimaryPlan } from "@/lib/coursemap/state";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (isDemoMode()) redirect("/plan");

  const viewer = await getAuthViewer();
  if (!viewer) redirect("/auth/sign-in?next=%2Fonboarding");
  if (await hasPrimaryPlan(viewer)) redirect("/dashboard");

  let catalogue;
  try {
    catalogue = await loadOnboardingCatalogue();
  } catch {
    catalogue = { catalogueYears: [], degrees: [], majors: [] };
  }

  return <OnboardingForm catalogue={catalogue} email={viewer.email ?? ""} />;
}
