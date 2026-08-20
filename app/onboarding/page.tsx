import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAuthViewer } from "@/lib/auth/viewer";
import { loadOnboardingCatalogue } from "@/lib/coursemap/onboarding-catalogue";
import { isDemoMode } from "@/lib/supabase/config";
import { hasPrimaryPlan } from "@/lib/coursemap/state";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (isDemoMode()) redirect("/plan");

  const viewer = await getAuthViewer();
  if (!viewer) redirect("/login?next=%2Fonboarding");
  if (await hasPrimaryPlan(viewer)) redirect("/dashboard");

  let catalogue;
  try {
    catalogue = await loadOnboardingCatalogue();
  } catch {
    return (
      <main className="landing-mesh grid min-h-dvh place-items-center px-4 py-10">
        <h1 className="sr-only">Onboarding</h1>
        <Card className="w-full max-w-xl p-4 sm:p-5">
          <Alert role="alert" tone="warning">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Planning catalogue temporarily unavailable</AlertTitle>
            <AlertDescription>
              Published degree choices could not be loaded. Please try again
              shortly.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <ButtonLink href="/onboarding" size="sm" variant="primary">
              Try again
            </ButtonLink>
          </div>
        </Card>
      </main>
    );
  }

  return <OnboardingForm catalogue={catalogue} email={viewer.email ?? ""} />;
}
