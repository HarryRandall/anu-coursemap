import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { safeInternalRedirect } from "@/lib/auth/redirect";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = safeInternalRedirect(first(params.next));

  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10">
      <Card className="w-full max-w-md !rounded-2xl">
        <Empty className="px-7 py-7">
          <EmptyHeader>
            <EmptyMedia variant="error">
              <CircleAlert aria-hidden="true" />
            </EmptyMedia>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950">
              That sign-in link did not work
            </h1>
            <EmptyDescription>
              The link may have expired or already been used. Sign in with your
              email and password to continue.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <ButtonLink
                href={`/login?next=${encodeURIComponent(next)}`}
                variant="primary"
              >
                Back to sign in
              </ButtonLink>
              <ButtonLink href="/courses" variant="secondary">
                Browse courses
              </ButtonLink>
            </div>
            <Link
              href="/"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
            >
              Return to Coursemap
            </Link>
          </EmptyContent>
        </Empty>
      </Card>
    </main>
  );
}
