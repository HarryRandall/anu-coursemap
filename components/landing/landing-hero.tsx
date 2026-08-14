import { ArrowRight, Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export function LandingHero({ canOpenPlan }: { canOpenPlan: boolean }) {
  return (
    <section className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16">
      <p className="text-xs font-bold tracking-wider text-brand-700 uppercase">
        ANU degree planning, made clear
      </p>
      <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-zinc-950 sm:text-6xl">
        See how every course fits before you enrol.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
        Explore courses and prerequisite chains freely, then sign in to map a
        degree plan across future semesters.
      </p>

      <form
        action="/courses"
        className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-[28px] bg-white p-2 shadow-md ring-1 ring-zinc-200/80 sm:flex-row sm:items-center"
      >
        <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3">
          <Search
            className="size-5 shrink-0 text-zinc-400"
            aria-hidden="true"
          />
          <span className="sr-only">Search courses</span>
          <input
            type="search"
            name="q"
            maxLength={120}
            placeholder="Search COMP2100, software design, or a major"
            className="min-h-11 w-full bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="sm:min-w-44"
        >
          Explore courses <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-4 flex justify-center">
        <ButtonLink
          href={canOpenPlan ? "/plan" : "/auth/sign-in"}
          variant="ghost"
          className="min-h-11 text-zinc-600"
        >
          {canOpenPlan ? "Continue planning" : "Sign in with email"}
        </ButtonLink>
      </div>
    </section>
  );
}
