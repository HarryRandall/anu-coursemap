import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@coursemap/ui/components/alert";
import { Button } from "@coursemap/ui/primitives/button";
import { Card } from "@coursemap/ui/primitives/card";
import ReuiLink from "next/link";
import { CircleAlert } from "lucide-react";
import { AppShell } from "@/ui/shell";

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
          <Alert role="alert" variant={"warning"}>
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Planning catalogue temporarily unavailable</AlertTitle>
            <AlertDescription>
              Your plan has not been changed. Please try again shortly.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button asChild size="sm" variant="default">
              <ReuiLink href="/plan">Try again</ReuiLink>
            </Button>
          </div>
        </Card>
      </AppShell>
    );
  }
  return <PlanClient catalogue={catalogue} />;
}
