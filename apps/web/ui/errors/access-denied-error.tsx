import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import { ErrorPageLayout } from "@/ui/common/error-page-layout";
import { ErrorState } from "@/ui/common/error-state";

export function AccessDeniedError() {
  return (
    <ErrorPageLayout>
      <ErrorState
        code="403 · Access denied"
        title="This page needs a different key"
        description="Your account doesn't have access to this page. Check you're using the right account, or head home."
        illustration="access"
      >
        <Button asChild>
          <Link href="/dashboard">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/profile">Check your account</Link>
        </Button>
      </ErrorState>
    </ErrorPageLayout>
  );
}
