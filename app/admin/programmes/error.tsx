"use client";

import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AdminProgrammesError({ reset }: { reset: () => void }) {
  return (
    <AppShell admin>
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-10">
        <h1 className="sr-only">Academic structures unavailable</h1>
        <Alert tone="danger">
          <AlertTitle>Could not load academic structures</AlertTitle>
          <AlertDescription>
            The directory or its import status could not be read.
          </AlertDescription>
        </Alert>
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
      </div>
    </AppShell>
  );
}
