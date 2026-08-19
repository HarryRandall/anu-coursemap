import { ArrowRight } from "lucide-react";
import { LandingMark } from "@/components/landing/landing-mark";
import { ButtonLink } from "@/components/ui/button";

export function LandingFooter({ canOpenPlan }: { canOpenPlan: boolean }) {
  return (
    <footer>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 55% at 18% 0%, rgba(124, 58, 237, 0.45), transparent 60%), radial-gradient(ellipse 55% 50% at 85% 15%, rgba(14, 165, 233, 0.35), transparent 55%), radial-gradient(ellipse 45% 45% at 70% 100%, rgba(244, 114, 182, 0.3), transparent 55%)",
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Start with a course, then build the rest.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              Browse the catalogue without an account. Sign in when you are
              ready to keep a degree plan across semesters.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink
                href={canOpenPlan ? "/plan" : "/signup"}
                size="lg"
                className="!rounded-full !bg-white !text-zinc-950 !ring-white hover:!bg-zinc-100"
              >
                {canOpenPlan ? "Open your plan" : "Get Coursemap free"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink
                href="/courses"
                size="lg"
                className="!rounded-full !bg-white/10 !text-white !ring-white/25 hover:!bg-white/20"
              >
                Explore courses
              </ButtonLink>
            </div>
          </div>
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
