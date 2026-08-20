import { CircleAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
        <Alert tone="warning" role="alert">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Planning catalogue temporarily unavailable</AlertTitle>
          <AlertDescription>
            Your degree and course data could not be loaded. Your saved plan has
            not been changed.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <ButtonLink href={retryHref} size="sm" variant="primary">
            Try again
          </ButtonLink>
        </div>
      </Card>
    </AppShell>
  );
}
