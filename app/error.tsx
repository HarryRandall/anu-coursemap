"use client";

import { CircleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10">
      <h1 className="sr-only">Coursemap could not load this page</h1>
      <Card className="w-full max-w-md">
        <Empty className="px-7 py-8">
          <EmptyHeader role="alert">
            <EmptyMedia variant="error">
              <CircleAlert aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Coursemap could not load this page</EmptyTitle>
            <EmptyDescription>
              Something went wrong while loading this page. Try again, or return
              home.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={reset}>
                Try again
              </Button>
              <ButtonLink href="/dashboard">Return home</ButtonLink>
            </div>
          </EmptyContent>
        </Empty>
      </Card>
    </main>
  );
}
