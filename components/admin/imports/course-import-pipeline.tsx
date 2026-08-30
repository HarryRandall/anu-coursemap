import { FileCode2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DataTableEmpty,
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import type { CourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";
import type { Tone } from "@/lib/ui";

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function statusTone(status: string): Tone {
  if (status === "failed" || status === "cancelled" || status === "rejected") {
    return "danger";
  }
  if (status === "queued" || status === "processing" || status === "running") {
    return "info";
  }
  if (status === "ready_for_review" || status === "pending") return "warning";
  if (status === "accepted" || status === "succeeded" || status === "valid") {
    return "success";
  }
  return "neutral";
}

function duration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return "—";
  const milliseconds =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

export function CourseImportPipeline({
  extractions,
  reviewHref,
  stages,
}: {
  extractions: CourseImportTargetDetail["extractions"];
  reviewHref?: string;
  stages: CourseImportTargetDetail["stages"];
}) {
  return (
    <div className="space-y-4">
      {reviewHref ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              Latest import pipeline
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Processing stages and model usage for the import behind this
              snapshot.
            </p>
          </div>
          <ButtonLink href={reviewHref} size="sm">
            <FileCode2 aria-hidden="true" size={15} /> Full import review
          </ButtonLink>
        </div>
      ) : null}

      {stages.length ? (
        <DataTableShell>
          <Table className="min-w-[720px]">
            <TableCaption>Import pipeline stages</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Step</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="text-xs text-zinc-500 tabular-nums">
                    {stage.position}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-zinc-800">
                    {readable(stage.stage_name)}
                  </TableCell>
                  <TableCell>
                    <Badge tone={statusTone(stage.status)}>
                      {readable(stage.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                    {stage.attempt_count}
                  </TableCell>
                  <TableCell className="text-right text-xs text-zinc-600 tabular-nums">
                    {duration(stage.started_at, stage.completed_at)}
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-xs text-rose-700">
                    {stage.error_summary ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      ) : (
        <DataTableShell>
          <DataTableEmpty
            description="Processing stages will appear here after the import worker starts."
            title="No pipeline stages"
          />
        </DataTableShell>
      )}

      {extractions.map((extraction) => (
        <Card key={extraction.id}>
          <CardHeader
            action={
              <Badge tone={statusTone(extraction.validation_status)}>
                {readable(extraction.validation_status)}
              </Badge>
            }
            description={`Extraction attempt ${extraction.extraction_number}`}
            title={extraction.resolved_model ?? extraction.requested_model}
          />
          <CardContent>
            <dl className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <dt className="text-zinc-500">Input</dt>
                <dd className="mt-1 tabular-nums">
                  {extraction.input_tokens.toLocaleString("en-AU")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Cached input</dt>
                <dd className="mt-1 tabular-nums">
                  {extraction.cached_input_tokens.toLocaleString("en-AU")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Output</dt>
                <dd className="mt-1 tabular-nums">
                  {extraction.output_tokens.toLocaleString("en-AU")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Reasoning</dt>
                <dd className="mt-1 tabular-nums">
                  {extraction.reasoning_tokens.toLocaleString("en-AU")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Cost</dt>
                <dd className="mt-1 tabular-nums">
                  ${extraction.cost_usd.toFixed(6)} USD ·{" "}
                  {extraction.cost_source}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Latency</dt>
                <dd className="mt-1 tabular-nums">
                  {extraction.latency_ms === null
                    ? "—"
                    : `${extraction.latency_ms}ms`}
                </dd>
              </div>
            </dl>
            {extraction.error_summary ? (
              <p className="mt-3 text-xs text-rose-700">
                {extraction.error_summary}
              </p>
            ) : null}
            {extraction.reused_from_extraction_id ? (
              <p className="mt-3 text-xs text-zinc-500">
                Reused an identical earlier extraction, so no additional model
                cost was incurred.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
