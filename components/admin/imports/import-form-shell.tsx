import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Page chrome for course and programme pulls. Controls, queue and actions are
 * separate page sections rather than one boxed card.
 */
export function ImportFormShell({
  children,
  footer,
  progress,
  title,
  className,
}: {
  children: ReactNode;
  footer: ReactNode;
  progress?: ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-4xl flex-col gap-6 pb-10",
        className,
      )}
    >
      <h1 className="sr-only">{title}</h1>
      <div className="space-y-5">{children}</div>
      {progress ? <div className="space-y-3">{progress}</div> : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {footer}
      </div>
    </div>
  );
}
