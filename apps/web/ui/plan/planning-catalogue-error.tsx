import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import { ErrorState } from "@/ui/common/error-state";
import { AppShell } from "@/ui/shell";

export function PlanningCatalogueError({
  pageTitle,
  retryHref,
}: {
  pageTitle: string;
  retryHref: string;
}) {
  return (
    <AppShell fill currentBreadcrumbLabel={pageTitle}>
      <ErrorState
        title="The planning catalogue is taking a break"
        description="Your degree and course data could not be loaded. Your saved plan has not been changed. Please try again shortly."
      >
        <Button asChild>
          <Link href={retryHref}>Try again</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </ErrorState>
    </AppShell>
  );
}
