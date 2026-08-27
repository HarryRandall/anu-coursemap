import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared chrome for the course and programme pull forms. Wide by default so
 * the queue table has room for year and progress columns rather than living
 * in a narrow card surrounded by empty page.
 */
export function ImportFormShell({
  children,
  footer,
  progress,
  title,
  wide = false,
}: {
  children: ReactNode;
  footer: ReactNode;
  progress?: ReactNode;
  title: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-4 pb-10",
        wide ? "max-w-5xl" : "max-w-2xl",
      )}
    >
      <h1 className="sr-only">{title}</h1>
      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
        <div className="space-y-5 p-5 sm:p-6">{children}</div>
        {progress ? (
          <div className="border-t border-zinc-100 bg-zinc-50/70 px-5 py-4 sm:px-6">
            {progress}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-5 py-4 sm:px-6">
          {footer}
        </div>
      </div>
    </div>
  );
}
