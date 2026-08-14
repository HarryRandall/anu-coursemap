import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SignInForm } from "@/app/auth/sign-in/sign-in-form";
import { safeInternalRedirect } from "@/lib/auth/redirect";
import {
  getCanonicalSiteOrigin,
  getSupabaseConfig,
} from "@/lib/supabase/config";

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

  const callbackOrigin = getCanonicalSiteOrigin();
  const configured = Boolean(getSupabaseConfig() && callbackOrigin);
  const signedOut = first(params.signedOut) === "true";
  const configurationMissing = first(params.reason) === "configuration";

  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2.5 text-zinc-900"
          aria-label="Browse Coursemap courses"
        >
          <span
            className="grid size-7 -rotate-3 grid-cols-2 gap-0.5"
            aria-hidden="true"
          >
            <i className="rounded-[3px] bg-zinc-900" />
            <i className="rounded-[3px] bg-zinc-400" />
            <i className="rounded-[3px] bg-zinc-400" />
            <i className="rounded-[3px] bg-zinc-900" />
          </span>
          <strong className="text-lg tracking-tight">coursemap</strong>
        </Link>

        <div className="mt-7">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Sign in to your plan
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Use a secure, one-time email link. No password is required.
          </p>
        </div>

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
            Local Supabase is not configured. Copy .env.example to .env.local,
            add the values from `supabase status`, then restart Next.js.
          </p>
        )}

        <div className="mt-6">
          <SignInForm
            next={next}
            configured={configured}
            callbackOrigin={callbackOrigin}
          />
        </div>

        <div className="mt-6 flex items-start gap-2 border-t border-zinc-100 pt-5 text-[11px] leading-relaxed text-zinc-400">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Authentication is handled by Supabase. Coursemap never asks for or
            stores an ANU password.
          </p>
        </div>
      </section>
    </main>
  );
}

export const dynamic = "force-dynamic";
