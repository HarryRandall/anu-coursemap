import Link from "next/link";
import { ArrowRight, BookOpen, GitBranch, Map } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getAuthViewer } from "@/lib/auth/viewer";
import { isDemoMode } from "@/lib/supabase/config";

const features = [
  {
    icon: BookOpen,
    title: "Find the right courses",
    description:
      "Search the ANU catalogue by subject, level, session and convener.",
  },
  {
    icon: GitBranch,
    title: "Follow prerequisite paths",
    description:
      "See what each course needs and which options it unlocks next.",
  },
  {
    icon: Map,
    title: "Build a degree plan",
    description:
      "Arrange courses by study period and spot requirement gaps early.",
  },
] as const;

export default async function Home() {
  const viewer = await getAuthViewer();
  const canOpenPlan = isDemoMode() || Boolean(viewer);

  return (
    <main className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Coursemap home"
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
            <strong className="text-lg tracking-tight text-zinc-950">
              coursemap
            </strong>
          </Link>
          <div className="flex items-center gap-2">
            <ButtonLink href="/courses" variant="ghost" size="sm">
              Browse courses
            </ButtonLink>
            <ButtonLink
              href={canOpenPlan ? "/plan" : "/auth/sign-in"}
              variant="primary"
              size="sm"
            >
              {canOpenPlan ? "Open your plan" : "Sign in"}
            </ButtonLink>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-bold tracking-wider text-brand-600 uppercase">
            ANU degree planning, made clear
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-zinc-950 sm:text-6xl">
            See how every course fits before you enrol.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Explore courses and prerequisite chains freely, then sign in to map
            a degree plan across future semesters.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/courses" variant="primary">
              Explore courses <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink
              href={canOpenPlan ? "/plan" : "/auth/sign-in"}
              variant="secondary"
            >
              {canOpenPlan ? "Continue planning" : "Sign in with email"}
            </ButtonLink>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl bg-white p-5 shadow-xs ring-1 ring-zinc-200"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-zinc-900">
                {title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export const dynamic = "force-dynamic";
