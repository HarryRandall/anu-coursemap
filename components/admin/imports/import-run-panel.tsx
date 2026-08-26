"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  LoaderCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import type { Tone } from "@/lib/ui";

export type ImportRunPhase =
  | "queued"
  | "fetching"
  | "saving"
  | "created"
  | "updated"
  | "unchanged"
  | "failed";

export type ImportRunRow = {
  code: string;
  detail: string;
  href?: string;
  kind: "course" | "programme";
  needsReview: boolean;
  phase: ImportRunPhase;
  title?: string;
};

const phases: Record<
  ImportRunPhase,
  { label: string; settled: boolean; tone: Tone }
> = {
  queued: { label: "Queued", settled: false, tone: "neutral" },
  fetching: { label: "Reading ANU page", settled: false, tone: "brand" },
  saving: { label: "Saving draft", settled: false, tone: "brand" },
  created: { label: "Added", settled: true, tone: "success" },
  updated: { label: "Updated", settled: true, tone: "success" },
  unchanged: { label: "No change", settled: true, tone: "neutral" },
  failed: { label: "Failed", settled: true, tone: "danger" },
};

function PhaseIcon({ phase }: { phase: ImportRunPhase }) {
  if (phase === "queued") {
    return (
      <CircleDashed aria-hidden="true" className="text-zinc-400" size={16} />
    );
  }
  if (phase === "failed") {
    return (
      <CircleAlert aria-hidden="true" className="text-rose-600" size={16} />
    );
  }
  if (phases[phase].settled) {
    return <Check aria-hidden="true" className="text-emerald-600" size={16} />;
  }
  return (
    <LoaderCircle
      aria-hidden="true"
      className="animate-spin text-brand-600 motion-reduce:animate-none"
      size={16}
    />
  );
}

export function ImportRunPanel({ rows }: { rows: ImportRunRow[] }) {
  if (rows.length === 0) return null;

  const done = rows.filter((row) => phases[row.phase].settled).length;
  const complete = done === rows.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        action={
          <Badge tone={complete ? "success" : "brand"}>
            {done} of {rows.length}
          </Badge>
        }
        className="border-b border-zinc-100"
        description={
          complete
            ? "Every page is saved as a draft and stays linked to its ANU source."
            : "Each page is read from ANU, parsed and saved in turn."
        }
        title={complete ? "Import finished" : "Importing"}
      />
      <div aria-live="polite" className="divide-y divide-zinc-100" role="list">
        {rows.map((row) => {
          const phase = phases[row.phase];
          const content = (
            <>
              <PhaseIcon phase={row.phase} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-mono text-sm font-semibold text-zinc-900">
                    {row.code}
                  </span>
                  {row.title ? (
                    <span className="truncate text-sm text-zinc-600">
                      {row.title}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-zinc-500">
                  {row.detail}
                </span>
              </span>
              <Badge tone={phase.tone}>{phase.label}</Badge>
              {row.needsReview ? <Badge tone="warning">Review</Badge> : null}
              {row.href ? (
                <ChevronRight
                  aria-hidden="true"
                  className="shrink-0 text-zinc-400"
                  size={16}
                />
              ) : null}
            </>
          );

          return (
            <div key={`${row.kind}-${row.code}`} role="listitem">
              {row.href ? (
                <Link
                  className="flex items-center gap-3 px-5 py-3 transition-colors outline-none hover:bg-zinc-50 focus-visible:bg-zinc-50"
                  href={row.href}
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3">
                  {content}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {complete ? (
        <p className="flex items-center gap-1.5 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs text-zinc-600">
          <ArrowRight aria-hidden="true" size={13} />
          Open any row above to check its fields and publish it.
        </p>
      ) : null}
    </Card>
  );
}
