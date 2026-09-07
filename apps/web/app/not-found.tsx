import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import { ErrorPageLayout } from "@/ui/common/error-page-layout";
import { ErrorState } from "@/ui/common/error-state";

export default function NotFound() {
  return (
    <ErrorPageLayout>
      <ErrorState
        code="404 · Page not found"
        title="This page is off the map"
        description="The page may have moved, or the link may be out of date. Head home or explore the course catalogue."
        illustration="compass"
      >
        <Button asChild>
          <Link href="/dashboard">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/courses">Browse courses</Link>
        </Button>
      </ErrorState>
    </ErrorPageLayout>
  );
}
