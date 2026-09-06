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
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-muted/50 px-4 py-10">
      <h1 className="sr-only">Page not found</h1>
      <Card className="w-full max-w-md">
        <Empty className="px-7 py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Page not found</EmptyTitle>
            <EmptyDescription>
              The page may have moved, or the link may be out of date.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="default">
                <ReuiLink href="/dashboard">Return home</ReuiLink>
              </Button>
              <Button asChild variant="outline">
                <ReuiLink href="/courses">Browse courses</ReuiLink>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </Card>
    </main>
  );
}
