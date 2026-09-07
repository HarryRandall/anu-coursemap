import { Card } from "@coursemap/ui/primitives/card";
import { Skeleton } from "@coursemap/ui/primitives/skeleton";
import { BrandMark } from "@/ui/brand-mark";

/** Mirrors the onboarding wizard: brand header, welcome panel with step pills and the first form step. */
export default function OnboardingLoading() {
  return (
    <main className="landing-mesh min-h-dvh px-4 py-8 sm:py-12">
      <div aria-busy="true" className="mx-auto w-full">
        <span className="sr-only">Loading onboarding</span>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-10" />
            <strong className="brand-wordmark text-lg">coursemap</strong>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>

        <Card className="mt-8 gap-0 overflow-hidden rounded-3xl py-0">
          <div className="border-b bg-gradient-to-br from-primary/10 via-card to-card px-6 py-7 sm:px-9">
            <Skeleton className="size-11 rounded-2xl" />
            <Skeleton className="mt-4 h-8 w-64 max-w-full" />
            <Skeleton className="mt-3 h-3.5 w-full max-w-xl" />
            <Skeleton className="mt-2 h-3.5 w-3/4 max-w-md" />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {["w-28", "w-28", "w-32"].map((width, index) => (
                <Skeleton key={index} className={`h-9 rounded-full ${width}`} />
              ))}
            </div>
          </div>
          <div className="space-y-5 p-6 sm:p-9">
            <Skeleton className="h-4 w-40" />
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index}>
                <Skeleton className="mb-2 h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Skeleton className="h-10 w-28 rounded-lg" />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
