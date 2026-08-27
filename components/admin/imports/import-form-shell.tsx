import type { ReactNode } from "react";

/**
 * Page chrome for course and programme pulls. Controls, queue and actions are
 * separate page sections rather than one boxed card, so the table can use the
 * full admin content width.
 */
export function ImportFormShell({
  children,
  footer,
  progress,
  title,
}: {
  children: ReactNode;
  footer: ReactNode;
  progress?: ReactNode;
  title: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
      <h1 className="sr-only">{title}</h1>
      <div className="space-y-5">{children}</div>
      {progress ? <div className="space-y-3">{progress}</div> : null}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200/80 pt-4">
        {footer}
      </div>
    </div>
  );
}
