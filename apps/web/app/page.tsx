import { LandingBento } from "@/ui/landing/landing-bento";
import { LandingCapabilities } from "@/ui/landing/landing-capabilities";
import { LandingFeatureTabs } from "@/ui/landing/landing-feature-tabs";
import { LandingFooter } from "@/ui/landing/landing-footer";
import { LandingHeader } from "@/ui/landing/landing-header";
import { LandingHero } from "@/ui/landing/landing-hero";
import { getAuthViewer } from "@/lib/auth/viewer";
import { redirect } from "next/navigation";

export default async function Home() {
  const viewer = await getAuthViewer();
  // Signed-in students go straight to the app; onboarding is offered from the
  // dashboard empty state rather than forced here.
  if (viewer) {
    redirect("/dashboard");
  }
  const canOpenPlan = viewer !== null;

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
