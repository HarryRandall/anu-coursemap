import { ArrowRight } from "lucide-react";
import { LandingMark } from "@/components/landing/landing-mark";
import { ButtonLink } from "@/components/ui/button";

export function LandingFooter({ canOpenPlan }: { canOpenPlan: boolean }) {
  return (
    <footer>
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          Start with a course, then build the rest.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          Browse the catalogue without an account. Sign in when you are ready to
          keep a degree plan across semesters.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/courses" variant="primary" size="lg">
            Explore courses <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink
            href={canOpenPlan ? "/plan" : "/auth/sign-in"}
            variant="secondary"
            size="lg"
          >
            {canOpenPlan ? "Open your plan" : "Sign in with email"}
          </ButtonLink>
        </div>
      </section>

      <div className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <LandingMark wordmarkClassName="text-base" />
          <p className="max-w-xl text-xs leading-relaxed text-zinc-500">
            Coursemap is an independent planning tool. It is not an official ANU
            system and does not replace the Programs and Courses catalogue or
            academic advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
