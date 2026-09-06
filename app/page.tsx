import { LandingBento } from "@/components/landing/landing-bento";
import { LandingCapabilities } from "@/components/landing/landing-capabilities";
import { LandingFeatureTabs } from "@/components/landing/landing-feature-tabs";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { getAuthViewer } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export default async function Home() {
  const viewer = await getAuthViewer();
  // Signed-in students go straight to the app; onboarding is offered from the
  // dashboard empty state rather than forced here.
  if (!isDemoMode() && viewer) {
    redirect("/dashboard");
  }
  const canOpenPlan = isDemoMode() || viewer !== null;

  return (
    <main className="min-h-dvh bg-white">
      <div className="landing-mesh relative overflow-hidden">
        <LandingHeader canOpenPlan={canOpenPlan} />
        <LandingHero canOpenPlan={canOpenPlan} />
      </div>
      <LandingBento />
      <LandingFeatureTabs />
      <LandingCapabilities />
      <LandingFooter canOpenPlan={canOpenPlan} />
    </main>
  );
}

export const dynamic = "force-dynamic";
