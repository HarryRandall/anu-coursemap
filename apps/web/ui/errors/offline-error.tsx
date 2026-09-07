"use client";

import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import { ErrorPageLayout } from "@/ui/common/error-page-layout";
import { ErrorState } from "@/ui/common/error-state";

export function OfflineError({ retry }: { retry: () => void }) {
  return (
    <ErrorPageLayout>
      <ErrorState
        code="No connection"
        title="You're a little out of reach"
        description="Check your internet connection, then try again."
        illustration="offline"
      >
        <Button onClick={retry} type="button">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </ErrorState>
    </ErrorPageLayout>
  );
}
