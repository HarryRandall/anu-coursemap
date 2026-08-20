import { ArrowRight, Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const popularSearches = ["COMP2100", "Machine learning", "MATH1013"] as const;

export function LandingHero({ canOpenPlan }: { canOpenPlan: boolean }) {
  return (
    <section className="mx-auto max-w-4xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20">
      <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold tracking-wider text-brand-700 uppercase shadow-xs ring-1 ring-brand-100">
        ANU degree planning, made clear
      </p>
      <h1 className="mt-6 text-4xl leading-tight font-bold tracking-tight text-zinc-950 sm:text-6xl">
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
        <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-3xl px-3 transition focus-within:ring-3 focus-within:ring-brand-500/20">
          <Search
            className="size-5 shrink-0 text-zinc-400"
            aria-hidden="true"
          />
          <span className="sr-only">Search courses</span>
          <Input
            type="search"
            name="q"
            maxLength={120}
            placeholder="Search COMP2100, software design, or a major"
            className="h-11 min-h-11 border-0 bg-transparent px-0 text-[15px] shadow-none hover:border-transparent focus-visible:border-transparent focus-visible:ring-0"
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="!rounded-3xl sm:min-w-44"
        >
          Explore courses <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-zinc-500">Popular:</span>
        {popularSearches.map((query) => (
          <ButtonLink
            key={query}
            href={`/courses?q=${encodeURIComponent(query)}`}
            variant="secondary"
            size="sm"
            className="min-h-9 !rounded-full px-3.5 text-xs"
          >
            {query}
          </ButtonLink>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <ButtonLink
          href={canOpenPlan ? "/plan" : "/signup"}
          variant="ghost"
          className="min-h-11 text-zinc-600"
        >
          {canOpenPlan ? "Continue planning" : "Create a free account"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}
