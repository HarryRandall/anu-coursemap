import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Shared chrome for the course and programme pull forms. Both pages do the
 * same job with different targets, so they share one panel rather than each
 * inventing spacing and a footer.
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
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-10">
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

export function ImportQueue({
  children,
  count,
  label,
  onClear,
}: {
  children: ReactNode;
  count: number;
  label: string;
  onClear?: () => void;
}) {
  return (
    <section aria-label={label} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-zinc-700">
          {count} in queue
        </span>
        {onClear ? (
          <Button onClick={onClear} size="sm" variant="ghost">
            Clear
          </Button>
        ) : null}
      </div>
      <ol className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-50/50">
        {children}
      </ol>
    </section>
  );
}

export function ImportQueueItem({
  code,
  title,
  status,
  onRemove,
}: {
  code: string;
  title: string | null;
  status?: string | null;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-[76px] shrink-0 font-mono text-sm text-zinc-900">
        {code}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
        {title ?? "Not in Coursemap yet"}
      </span>
      {status ? (
        <span
          className={cn(
            "shrink-0 text-[12px] tabular-nums",
            statusTone(status),
          )}
        >
          {status}
        </span>
      ) : null}
      {onRemove ? (
        <IconButton
          label={`Remove ${code}`}
          onClick={onRemove}
          size="icon-sm"
          variant="ghost"
        >
          <X aria-hidden="true" size={15} />
        </IconButton>
      ) : null}
    </li>
  );
}

function statusTone(status: string) {
  const key = status.toLowerCase();
  if (key.includes("fail") || key.includes("error")) return "text-rose-700";
  if (
    key.includes("fetch") ||
    key.includes("saving") ||
    key.includes("reading")
  ) {
    return "text-brand-700";
  }
  if (
    key.includes("created") ||
    key.includes("updated") ||
    key.includes("imported") ||
    key.includes("done")
  ) {
    return "text-emerald-700";
  }
  return "text-zinc-500";
}
