"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type {
  ImportFlag,
  ImportFlagCategory,
  ImportFlagStatus,
} from "@/components/admin/imports/imports-overview-data";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { resolveImportFlag } from "@/lib/catalogue-import/review-actions";
import type { Tone } from "@/lib/ui";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

function categoryTone(category: ImportFlagCategory): Tone {
  if (category === "Discontinued") return "danger";
  if (category === "Units" || category === "Code changed") return "info";
  return "warning";
}

const STATUS_LABELS: Record<ImportFlagStatus, string> = {
  accepted: "Accepted",
  open: "Open",
  rejected: "Dismissed",
  resolved: "Resolved",
};

function ValuePanel({
  emphasis,
  label,
  value,
}: {
  emphasis: "old" | "new";
  label: string;
  value: string | null;
}) {
  return (
    <div className="bg-white p-4">
      <p className="text-[13px] text-zinc-500">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm text-zinc-500 italic">
          {emphasis === "old" ? "Not previously held" : "Removed from source"}
        </p>
      ) : (
        <p
          className={cn(
            "mt-1 text-sm whitespace-pre-wrap",
            emphasis === "old" ? "text-zinc-500" : "text-zinc-900",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export function ChangeDetail({ change }: { change: ImportFlag }) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportFlagStatus>(change.status);
  const [resolving, setResolving] = useState(false);

  async function resolve(resolution: "accept" | "dismiss") {
    if (resolving) return;
    setResolving(true);
    const result = await resolveImportFlag(change.id, resolution);
    setResolving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setStatus(result.status);
    toast.success(result.message);
    router.push("/admin/imports/changes");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-10">
      {/*
        No back link and no visible heading: the breadcrumb ends in this course
        code and links back to the queue.
      */}
      <h1 className="sr-only">
        {change.code} {change.category} change
      </h1>

      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone={categoryTone(change.category)}>{change.category}</Badge>
        {status === "open" ? null : (
          <Badge tone={status === "rejected" ? "neutral" : "success"}>
            {STATUS_LABELS[status]}
          </Badge>
        )}
        <time
          className="text-[13px] text-zinc-500 tabular-nums"
          dateTime={change.detectedAt}
        >
          {dateFormatter.format(new Date(change.detectedAt))}
        </time>
      </header>

      <p className="max-w-2xl text-sm text-zinc-700">{change.summary}</p>

      <div className="grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
        <ValuePanel
          emphasis="old"
          label="Coursemap holds"
          value={change.oldValue}
        />
        <ValuePanel
          emphasis="new"
          label="Source now states"
          value={change.newValue}
        />
      </div>

      <dl className="grid gap-3 border-y border-zinc-200 py-4 text-[13px] text-zinc-800 sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Field</dt>
          <dd className="mt-0.5 font-mono break-all">{change.field}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Adapter</dt>
          <dd className="mt-0.5 font-mono break-all">{change.adapter}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Catalogue year</dt>
          <dd className="mt-0.5 tabular-nums">{change.year}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        {change.sourceUrl.startsWith("http") ? (
          <ButtonLink
            href={change.sourceUrl}
            rel="noreferrer"
            target="_blank"
            variant="secondary"
          >
            Open source page
          </ButtonLink>
        ) : null}
        {status === "open" ? (
          <div className="ml-auto flex gap-2">
            <Button
              aria-busy={resolving}
              disabled={resolving}
              onClick={() => void resolve("dismiss")}
              variant="ghost"
            >
              Dismiss
            </Button>
            <Button
              aria-busy={resolving}
              disabled={resolving}
              onClick={() => void resolve("accept")}
              variant="primary"
            >
              Accept
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
