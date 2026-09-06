import { Alert, AlertDescription, AlertTitle } from "@reui/components/alert";
import { Button } from "@reui/ui/button";
import { Card } from "@reui/ui/card";
import ReuiLink from "next/link";
import { CircleAlert } from "lucide-react";
import { AppShell } from "@/components/shell";

export function PlanningCatalogueError({
  pageTitle,
  retryHref,
}: {
  pageTitle: string;
  retryHref: string;
}) {
  return (
    <AppShell>
      <h1 className="sr-only">{pageTitle}</h1>
      <Card className="mx-auto max-w-xl p-4 sm:p-5">
        <Alert role="alert" variant={"warning"}>
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Planning catalogue temporarily unavailable</AlertTitle>
          <AlertDescription>
            Your degree and course data could not be loaded. Your saved plan has
            not been changed.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild size="sm" variant="default">
            <ReuiLink href={retryHref}>Try again</ReuiLink>
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
