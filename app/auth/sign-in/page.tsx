import Link from "next/link";
import { AuthShell } from "@/app/auth/auth-shell";
import { SignInForm } from "@/app/auth/sign-in/sign-in-form";
import { SocialSignIn } from "@/app/auth/social-sign-in";
import { safeInternalRedirect } from "@/lib/auth/redirect";
import { getSupabaseConfig } from "@/lib/supabase/config";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = safeInternalRedirect(first(params.next));

  const configured = Boolean(getSupabaseConfig());
  const signedOut = first(params.signedOut) === "true";
  const configurationMissing = first(params.reason) === "configuration";
  const signUpHref = `/auth/sign-up?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
        Welcome back
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Sign in to your plan and pick up where you left off.
      </p>

      {signedOut && (
        <p className="mt-5 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 ring-1 ring-zinc-200">
          You have been signed out.
        </p>
      )}

      {(!configured || configurationMissing) && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200"
        >
          Local Supabase is not configured. Copy .env.example to .env.local, add
          the values from `supabase status`, then restart Next.js.
        </p>
      )}

      <div className="mt-7">
        <SocialSignIn disabled={!configured} />
      </div>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="text-[11px] text-zinc-400">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <SignInForm next={next} configured={configured} />

      <p className="mt-6 text-center text-sm text-zinc-500">
        New to Coursemap?{" "}
        <Link
          href={signUpHref}
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export const dynamic = "force-dynamic";
