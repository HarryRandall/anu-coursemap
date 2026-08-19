import Link from "next/link";
import { LandingMark } from "@/components/landing/landing-mark";
import { ButtonLink } from "@/components/ui/button";

export function LandingHeader({ canOpenPlan }: { canOpenPlan: boolean }) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/70 bg-white/80 px-3 shadow-sm backdrop-blur-md sm:h-16 sm:px-5">
        <Link href="/" aria-label="Coursemap home">
          <LandingMark />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Landing">
          <ButtonLink
            href="/courses"
            variant="ghost"
            size="sm"
            className="min-h-11 px-3 max-sm:hidden"
          >
            Browse courses
          </ButtonLink>
          {canOpenPlan ? (
            <ButtonLink
              href="/plan"
              variant="primary"
              size="sm"
              className="min-h-11 !rounded-full px-4"
            >
              Open your plan
            </ButtonLink>
          ) : (
            <>
              <ButtonLink
                href="/auth/sign-in"
                variant="ghost"
                size="sm"
                className="min-h-11 px-3"
              >
                Sign in
              </ButtonLink>
              <ButtonLink
                href="/auth/sign-up"
                variant="primary"
                size="sm"
                className="min-h-11 !rounded-full px-4"
              >
                Get started free
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
