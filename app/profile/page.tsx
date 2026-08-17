import { loadOnboardingCatalogue } from "@/lib/coursemap/onboarding-catalogue";
import { ProfileEditor } from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let catalogue;
  try {
    catalogue = await loadOnboardingCatalogue();
  } catch {
    catalogue = { catalogueYears: [], degrees: [], majors: [] };
  }
  return <ProfileEditor catalogue={catalogue} />;
}
