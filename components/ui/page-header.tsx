import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Standard page heading. One clear title per page — no marketing sub-copy.
 * `meta` renders as a small muted line under the title (e.g. degree · rules year).
 */
export function PageHeader({
  title,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-[28px]">
          {title}
        </h1>
        {meta && <p className="mt-1 text-sm text-zinc-500">{meta}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
