import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10">
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
              <ButtonLink href="/dashboard" variant="primary">
                Return home
              </ButtonLink>
              <ButtonLink href="/courses">Browse courses</ButtonLink>
            </div>
          </EmptyContent>
        </Empty>
      </Card>
    </main>
  );
}
