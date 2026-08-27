import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export type ImportProgressEvent = {
  action?: string;
  code?: string;
  kind?: string;
  message?: string;
  index?: number;
  total?: number;
};

/**
 * Live status for a pull that is still running or has just finished. Kept
 * outside the form fields so the operator's eye moves to what is changing.
 */
export function ImportRunStatus({
  current,
  done,
  headline,
  log,
  runHref,
  successLabel,
}: {
  current?: ImportProgressEvent | null;
  done?: boolean;
  headline: string;
  log?: readonly ImportProgressEvent[];
  runHref?: string | null;
  successLabel?: string;
}) {
  if (done) {
    return (
      <div className="space-y-2" aria-live="polite">
        <div className="flex items-start gap-2.5">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-emerald-600"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-zinc-900">
              {successLabel ?? "Import finished"}
            </p>
            {runHref ? (
              <Link
                className="text-[13px] font-medium text-brand-700 hover:text-brand-800"
                href={runHref}
              >
                View run
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const fraction =
    typeof current?.index === "number" && typeof current.total === "number"
      ? `${current.index} of ${current.total}`
      : null;

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex items-start gap-2.5">
        <Loader2
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 animate-spin text-brand-600"
        />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-zinc-900">{headline}</p>
          {current?.code || current?.message || fraction ? (
            <p className="text-[13px] text-zinc-600">
              {[current?.code, current?.message, fraction]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      {typeof current?.index === "number" &&
      typeof current.total === "number" &&
      current.total > 0 ? (
        <div
          aria-hidden="true"
          className="h-1 overflow-hidden rounded-full bg-zinc-200"
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `${Math.min(100, (current.index / current.total) * 100)}%`,
            }}
          />
        </div>
      ) : null}

      {log && log.length > 0 ? (
        <ol className="max-h-36 space-y-1 overflow-y-auto text-[12px] text-zinc-500">
          {[...log].reverse().map((entry, index) => (
            <li
              className="flex gap-2 tabular-nums"
              key={`${entry.code}-${index}`}
            >
              <span className="w-[76px] shrink-0 font-mono text-zinc-700">
                {entry.code ?? "-"}
              </span>
              <span className="min-w-0 truncate">
                {entry.message ?? entry.action ?? "Update"}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
