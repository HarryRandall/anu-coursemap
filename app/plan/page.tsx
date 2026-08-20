import { CircleAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadCurrentUserPlanCatalogue } from "@/lib/coursemap/plan-catalogue";
import { PlanClient } from "./plan-client";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  let catalogue;
  try {
    catalogue = await loadCurrentUserPlanCatalogue();
  } catch {
    return (
      <AppShell>
        <h1 className="sr-only">Plan</h1>
        <Card className="mx-auto max-w-xl p-4 sm:p-5">
          <Alert tone="warning" role="alert">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Planning catalogue temporarily unavailable</AlertTitle>
            <AlertDescription>
              Your plan has not been changed. Please try again shortly.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <ButtonLink href="/plan" size="sm" variant="primary">
              Try again
            </ButtonLink>
          </div>
        </Card>
      </AppShell>
    );
  }
  return <PlanClient catalogue={catalogue} />;
}
