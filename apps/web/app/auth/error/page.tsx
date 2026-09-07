import { Button } from "@coursemap/ui/primitives/button";
import Link from "next/link";
import { ErrorPageLayout } from "@/ui/common/error-page-layout";
import { ErrorState } from "@/ui/common/error-state";
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
    <ErrorPageLayout>
      <ErrorState
        title="That sign-in link didn't work"
        description="The link may have expired or already been used. Sign in with your email and password to continue."
        illustration="signin"
      >
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(next)}`}>
            Back to sign in
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </ErrorState>
    </ErrorPageLayout>
  );
}
