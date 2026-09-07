import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/ui/brand-mark";

export function ErrorPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex shrink-0 justify-start px-6 py-5 sm:px-10">
        <Link
          href="/"
          aria-label="Coursemap home"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <BrandMark className="size-8" />
          <span className="brand-wordmark text-lg">coursemap</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col px-4 pb-6 sm:px-8 sm:pb-8">
        {children}
      </main>
    </div>
  );
}
