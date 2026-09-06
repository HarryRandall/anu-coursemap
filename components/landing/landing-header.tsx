import { Button } from "@reui/ui/button";
import ReuiLink from "next/link";
import Link from "next/link";
import { LandingMark } from "@/components/landing/landing-mark";

export function LandingHeader({ canOpenPlan }: { canOpenPlan: boolean }) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/70 bg-white/80 px-3 shadow-sm backdrop-blur-md sm:h-16 sm:px-5">
        <Link href="/" aria-label="Coursemap home">
          <LandingMark />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Landing">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="min-h-11 px-3 max-sm:hidden"
          >
            <ReuiLink href="/courses">Browse courses</ReuiLink>
          </Button>
          {canOpenPlan ? (
            <Button
              asChild
              variant="default"
              size="sm"
              className="min-h-11 !rounded-full px-4"
            >
              <ReuiLink href="/plan">Open your plan</ReuiLink>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="min-h-11 px-3"
              >
                <ReuiLink href="/login">Sign in</ReuiLink>
              </Button>
              <Button
                asChild
                variant="default"
                size="sm"
                className="min-h-11 !rounded-full px-4"
              >
                <ReuiLink href="/signup">Get started free</ReuiLink>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
