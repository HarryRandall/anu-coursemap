import { Badge } from "@/components/ui/badge";
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
import type { AcademicStructureImportTargetDetail } from "@/lib/coursemap/admin-academic-structure-imports";
import type { Tone } from "@/lib/ui";

function readable(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function statusTone(status: string): Tone {
  if (status === "failed" || status === "invalid") return "danger";
  if (status === "running" || status === "pending") return "info";
  if (status === "succeeded" || status === "valid") return "success";
  return "neutral";
}

function duration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return "Not recorded";
  const milliseconds =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "Not recorded";
  }
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

function tokens(value: number | null) {
  return value === null ? "Not recorded" : value.toLocaleString("en-AU");
}

function cost(value: number | null) {
  if (value === null) return "Not recorded";
  return `${new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: 6,
  }).format(value)} USD`;
}

export function AcademicStructureImportPipeline({
  extractions,
  stages,
}: {
  extractions: AcademicStructureImportTargetDetail["extractions"];
  stages: AcademicStructureImportTargetDetail["stages"];
}) {
  return (
    <div className="space-y-4">
      {stages.length ? (
        <DataTableShell>
          <Table className="min-w-[760px]">
            <TableCaption>Academic structure import stages</TableCaption>
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
                    {stage.position + 1}
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
                    {stage.error_summary ?? "None"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      ) : (
        <DataTableShell>
          <DataTableEmpty
            description="Stages appear after the background worker starts."
            title="No pipeline stages"
          />
        </DataTableShell>
      )}

      {extractions.length === 0 ? (
        <DataTableShell>
          <DataTableEmpty
            description="Model, token and cost details appear when an extraction attempt is recorded."
            title="No model extraction yet"
          />
        </DataTableShell>
      ) : (
        extractions.map((extraction) => (
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
              <dl className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-7">
                <div>
                  <dt className="text-zinc-500">Requested model</dt>
                  <dd className="mt-1 font-mono break-all text-zinc-800">
                    {extraction.requested_model}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Input</dt>
                  <dd className="mt-1 tabular-nums">
                    {tokens(extraction.input_tokens)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Cached input</dt>
                  <dd className="mt-1 tabular-nums">
                    {tokens(extraction.cached_input_tokens)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Output</dt>
                  <dd className="mt-1 tabular-nums">
                    {tokens(extraction.output_tokens)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Reasoning</dt>
                  <dd className="mt-1 tabular-nums">
                    {tokens(extraction.reasoning_tokens)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Cost</dt>
                  <dd className="mt-1 tabular-nums">
                    {cost(extraction.cost_usd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Latency</dt>
                  <dd className="mt-1 tabular-nums">
                    {extraction.latency_milliseconds === null
                      ? "Not recorded"
                      : `${extraction.latency_milliseconds}ms`}
                  </dd>
                </div>
              </dl>
              {extraction.validation_summary ? (
                <p className="mt-3 text-xs leading-5 text-zinc-600">
                  {extraction.validation_summary}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
