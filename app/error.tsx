"use client";
import { Button } from "@reui/ui/button";
import { Card } from "@reui/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@reui/ui/empty";
import ReuiLink from "next/link";

import { CircleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-muted/50 px-4 py-10">
      <h1 className="sr-only">Coursemap could not load this page</h1>
      <Card className="w-full max-w-md">
        <Empty className="px-7 py-8">
          <EmptyHeader role="alert">
            <EmptyMedia variant="icon">
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
              <Button variant="default" onClick={reset} type="button">
                Try again
              </Button>
              <Button asChild variant="outline">
                <ReuiLink href="/dashboard">Return home</ReuiLink>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </Card>
    </main>
  );
}
