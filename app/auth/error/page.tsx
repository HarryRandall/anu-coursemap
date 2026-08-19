import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
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
      <section className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-sm ring-1 ring-zinc-200">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <CircleAlert className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-zinc-950">
          That sign-in link did not work
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          The link may have expired or already been used. Sign in with your
          email and password to continue.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink
            href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
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
          className="mt-5 inline-block text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          Return to Coursemap
        </Link>
      </section>
    </main>
  );
}
