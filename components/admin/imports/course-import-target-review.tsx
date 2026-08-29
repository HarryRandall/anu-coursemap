"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Check,
  CircleAlert,
  Clock3,
  Eye,
  FileCode2,
  Pencil,
  X,
} from "lucide-react";
import { CourseImportArtifactViewer } from "@/components/admin/imports/course-import-artifact-viewer";
import { CourseImportAutoRefresh } from "@/components/admin/imports/course-import-auto-refresh";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { Field, Textarea } from "@/components/ui/field";
import { JsonCode } from "@/components/ui/json-code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  acceptCourseImportTarget,
  rejectCourseImportTarget,
} from "@/lib/coursemap/course-import-review-actions";
import type { CourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";
import { compareCourseSnapshotProjections } from "@/lib/coursemap/course-snapshot-diff";
import type { Tone } from "@/lib/ui";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

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

function jsonPreview(value: unknown) {
  if (value === null || value === undefined) return "Not recorded";
  const content = JSON.stringify(value);
  return content.length > 140 ? `${content.slice(0, 137)}...` : content;
}

function confidence(value: number | null) {
  return value === null
    ? "Not scored"
    : `${Math.round(value * 100)}% confidence`;
}

function comparisonValue(value: unknown) {
  if (value === undefined || value === null) return "Not recorded";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}

function fieldLabel(fieldPath: string) {
  const label = fieldPath
    .replaceAll(".", " · ")
    .replace(
      /\[(\d+)\]/gu,
      (_, index: string) => ` · item ${Number(index) + 1}`,
    )
    .replace(/([a-z\d])([A-Z])/gu, "$1 $2")
    .replace(/^snapshot · /u, "Course details · ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ReviewItems({ detail }: { detail: CourseImportTargetDetail }) {
  if (detail.reviewItems.length === 0) {
    return (
      <DataTableShell>
        <DataTableEmpty
          description="No ambiguity or validation issue was recorded for this candidate."
          title="No review items"
        />
      </DataTableShell>
    );
  }

  return (
    <div className="space-y-3">
      {detail.reviewItems.map((item) => (
        <Card key={item.id}>
          <CardHeader
            action={
              <div className="flex flex-wrap gap-1.5">
                {item.isBlocking ? <Badge tone="danger">Blocking</Badge> : null}
                <Badge
                  tone={
                    item.importance === "critical" || item.importance === "high"
                      ? "warning"
                      : "neutral"
                  }
                >
                  {readable(item.importance)}
                </Badge>
                <Badge tone={statusTone(item.status)}>
                  {readable(item.status)}
                </Badge>
              </div>
            }
            description={`${item.entityKind} · ${item.fieldPath} · ${confidence(item.confidence)}`}
            title={item.summary}
          />
          <CardContent className="space-y-3">
            {item.sourceExcerpt ? (
              <blockquote className="border-l-2 border-zinc-300 pl-3 text-xs leading-5 whitespace-pre-wrap text-zinc-600">
                {item.sourceExcerpt}
              </blockquote>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                  Before
                </p>
                <p className="mt-1 font-mono text-xs break-words whitespace-pre-wrap text-zinc-700">
                  {jsonPreview(item.oldValue)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
                <p className="text-[10px] font-medium tracking-wide text-brand-600 uppercase">
                  Candidate
                </p>
                <p className="mt-1 font-mono text-xs break-words whitespace-pre-wrap text-zinc-800">
                  {jsonPreview(item.newValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReviewChanges({ detail }: { detail: CourseImportTargetDetail }) {
  const changes = useMemo(
    () =>
      compareCourseSnapshotProjections(
        detail.previousSnapshot?.projection ?? null,
        detail.candidateProjection,
      ),
    [detail.candidateProjection, detail.previousSnapshot],
  );
  const previousLabel = detail.previousSnapshot?.label ?? "No saved snapshot";

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="snapshot-changes-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2
              className="text-sm font-semibold text-zinc-950"
              id="snapshot-changes-title"
            >
              Saved snapshot comparison
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Candidate compared field by field with{" "}
              {previousLabel.toLowerCase()}.
            </p>
          </div>
          <Badge tone={changes.length === 0 ? "neutral" : "brand"}>
            {changes.length} field {changes.length === 1 ? "change" : "changes"}
          </Badge>
        </div>

        {!detail.candidateProjection ? (
          <DataTableShell>
            <DataTableEmpty
              description="The comparison becomes available after relational candidate rows have been saved."
              title="No candidate projection"
            />
          </DataTableShell>
        ) : changes.length === 0 ? (
          <DataTableShell>
            <DataTableEmpty
              description={`The relational candidate matches ${previousLabel.toLowerCase()}.`}
              title="No saved field changes"
            />
          </DataTableShell>
        ) : (
          <DataTableShell>
            <Table className="min-w-[980px]">
              <TableCaption>
                Relational course fields changed by this import
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-64">Field</TableHead>
                  <TableHead className="w-24">Change</TableHead>
                  <TableHead>{previousLabel}</TableHead>
                  <TableHead>AI candidate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map((change) => (
                  <TableRow key={change.fieldPath}>
                    <TableCell className="align-top">
                      <span className="block text-xs font-medium text-zinc-900">
                        {fieldLabel(change.fieldPath)}
                      </span>
                      <span className="mt-1 block font-mono text-[10px] break-all text-zinc-500">
                        {change.fieldPath}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge
                        tone={
                          change.kind === "added"
                            ? "success"
                            : change.kind === "removed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {readable(change.kind)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md align-top">
                      <pre className="font-mono text-xs break-words whitespace-pre-wrap text-zinc-700">
                        {comparisonValue(change.before)}
                      </pre>
                    </TableCell>
                    <TableCell className="max-w-md bg-brand-50/30 align-top">
                      <pre className="font-mono text-xs break-words whitespace-pre-wrap text-zinc-900">
                        {comparisonValue(change.after)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="review-items-title">
        <div>
          <h2
            className="text-sm font-semibold text-zinc-950"
            id="review-items-title"
          >
            Review items
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Confidence, source evidence and validation issues recorded during
            extraction.
          </p>
        </div>
        <ReviewItems detail={detail} />
      </section>
    </div>
  );
}

function Pipeline({ detail }: { detail: CourseImportTargetDetail }) {
  return (
    <div className="space-y-4">
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
            {detail.stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell className="text-xs text-zinc-500 tabular-nums">
                  {stage.position}
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-800">
                  {stage.stage_name}
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

      {detail.extractions.map((extraction) => (
        <Card key={extraction.id}>
          <CardHeader
            action={
              <Badge tone={statusTone(extraction.validation_status)}>
                {readable(extraction.validation_status)}
              </Badge>
            }
            description={`Extraction ${extraction.extraction_number} · ${extraction.provider_request_id ?? "No provider request ID"}`}
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
              <p className="mt-3 font-mono text-[11px] text-zinc-500">
                Reused extraction {extraction.reused_from_extraction_id}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CourseImportTargetReview({
  detail,
}: {
  detail: CourseImportTargetDetail;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const active = ["queued", "processing"].includes(
    detail.target.processingStatus,
  );
  const canDecide =
    detail.target.processingStatus === "ready_for_review" &&
    detail.target.reviewStatus === "pending";
  const accepted = detail.target.reviewStatus === "accepted";
  const courseWorkspaceHref = detail.target.coursePublicId
    ? `/admin/courses/${detail.target.coursePublicId}?year=${detail.run.academicYear}`
    : null;

  async function decide(decision: "accept" | "reject") {
    const action =
      decision === "accept"
        ? acceptCourseImportTarget
        : rejectCourseImportTarget;
    const result = await action({
      runId: detail.run.id,
      targetId: detail.target.id,
      expectedBaselineDraftSnapshotId: detail.target.baselineDraftSnapshotId,
      expectedCurrentDraftSnapshotId: detail.target.currentDraftSnapshotId,
      resolutionNote: note,
    });
    setMessage({
      tone: result.ok ? "success" : "danger",
      text: result.message,
    });
    if (result.ok) router.refresh();
  }

  const snapshotForDisplay = detail.candidateSnapshot
    ? {
        ...detail.candidateSnapshot,
        projection_sha256: detail.candidateSnapshot.projection_sha256,
      }
    : null;

  return (
    <AppShell
      actions={
        <div className="flex items-center gap-2">
          {accepted ? (
            courseWorkspaceHref ? (
              <ButtonLink href={courseWorkspaceHref} variant="primary">
                <Pencil aria-hidden="true" size={15} />
                Open course workspace
              </ButtonLink>
            ) : (
              <Button
                disabled
                title="The permanent course identity is unavailable"
              >
                <Pencil aria-hidden="true" size={15} /> Course workspace
              </Button>
            )
          ) : null}
        </div>
      }
      admin
      currentBreadcrumbLabel={detail.target.courseCode}
    >
      <CourseImportAutoRefresh active={active} />
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-10">
        <h1 className="sr-only">Review {detail.target.courseCode} import</h1>

        <header className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-lg font-semibold text-zinc-950">
            {detail.target.courseCode}
          </span>
          <Badge tone="neutral">{detail.run.academicYear}</Badge>
          <Badge tone={statusTone(detail.target.processingStatus)}>
            {readable(detail.target.processingStatus)}
          </Badge>
          <Badge tone={statusTone(detail.target.reviewStatus)}>
            {readable(detail.target.reviewStatus)}
          </Badge>
          {detail.candidateSnapshot?.overall_confidence !== null &&
          detail.candidateSnapshot?.overall_confidence !== undefined ? (
            <Badge
              tone={
                detail.candidateSnapshot.overall_confidence >= 0.85
                  ? "success"
                  : "warning"
              }
            >
              {Math.round(detail.candidateSnapshot.overall_confidence * 100)}%
              confidence
            </Badge>
          ) : null}
        </header>

        {message ? (
          <Alert tone={message.tone}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        {detail.target.errorSummary ? (
          <Alert tone="danger">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              {detail.target.errorCode ? `${detail.target.errorCode}: ` : ""}
              {detail.target.errorSummary}
            </AlertDescription>
          </Alert>
        ) : null}
        {active ? (
          <Alert tone="brand">
            <Clock3 aria-hidden="true" />
            <AlertDescription>
              This target is still running. Saved stages and artefacts update
              automatically.
            </AlertDescription>
          </Alert>
        ) : null}
        {accepted ? (
          <Alert tone="success">
            <Check aria-hidden="true" />
            <AlertDescription>
              This candidate is the current draft. It is not published. Manual
              editing and publication remain separate snapshot operations.
            </AlertDescription>
          </Alert>
        ) : null}

        {canDecide ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <Field
                className="min-w-0 flex-1"
                hint="Optional. Saved with every review item in this target."
                label="Review note"
              >
                <Textarea
                  className="min-h-20 bg-white"
                  maxLength={2000}
                  onChange={(event) => setNote(event.target.value)}
                  value={note}
                />
              </Field>
              <div className="flex shrink-0 justify-end gap-2">
                <ConfirmDialog
                  confirmLabel="Reject candidate"
                  description="The imported snapshot remains in the audit history. The current draft and published snapshot will not change."
                  destructive
                  onConfirm={() => decide("reject")}
                  title={`Reject ${detail.target.courseCode}?`}
                  trigger={
                    <Button variant="danger">
                      <X aria-hidden="true" size={15} />
                      Reject
                    </Button>
                  }
                />
                <ConfirmDialog
                  confirmLabel="Accept as draft"
                  description="This makes the sealed candidate the current draft. Students will not see it until a separate publication action."
                  onConfirm={() => decide("accept")}
                  title={`Accept ${detail.target.courseCode} as draft?`}
                  trigger={
                    <Button variant="primary">
                      <Check aria-hidden="true" size={15} />
                      Accept as draft
                    </Button>
                  }
                />
              </div>
            </div>
          </section>
        ) : null}

        <Tabs defaultValue="changes">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max">
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="fields">All fields</TabsTrigger>
              <TabsTrigger value="source">Source and artefacts</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="preview">Student preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="changes">
            <ReviewChanges detail={detail} />
          </TabsContent>
          <TabsContent value="fields">
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
                <div className="flex items-center gap-2 px-5 py-4">
                  <FileCode2
                    aria-hidden="true"
                    className="text-zinc-400"
                    size={17}
                  />
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Candidate snapshot
                  </h2>
                </div>
                <JsonCode
                  label="Candidate snapshot fields"
                  value={snapshotForDisplay}
                />
              </section>
              <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
                <div className="flex items-center gap-2 px-5 py-4">
                  <FileCode2
                    aria-hidden="true"
                    className="text-zinc-400"
                    size={17}
                  />
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Relational child rows
                  </h2>
                </div>
                <JsonCode
                  label="Candidate relational database rows"
                  value={detail.relationalData}
                />
              </section>
            </div>
          </TabsContent>
          <TabsContent value="source">
            <div className="space-y-4">
              {detail.sourcePage ? (
                <dl className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-zinc-500">ANU page</dt>
                    <dd className="mt-1 break-all">
                      <a
                        className="text-brand-700 underline underline-offset-2"
                        href={detail.sourcePage.canonical_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {detail.sourcePage.canonical_url}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Fetched</dt>
                    <dd className="mt-1 tabular-nums">
                      {dateFormatter.format(
                        new Date(detail.sourcePage.fetched_at),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">HTTP status</dt>
                    <dd className="mt-1 tabular-nums">
                      {detail.sourcePage.http_status ?? "Not recorded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Source hash</dt>
                    <dd
                      className="mt-1 truncate font-mono"
                      title={detail.sourcePage.content_sha256}
                    >
                      {detail.sourcePage.content_sha256}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <CourseImportArtifactViewer artifacts={detail.artifacts} />
            </div>
          </TabsContent>
          <TabsContent value="pipeline">
            <Pipeline detail={detail} />
          </TabsContent>
          <TabsContent value="preview">
            {detail.candidateSnapshot ? (
              <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"
                  >
                    <Eye size={17} />
                  </span>
                  <div>
                    <p className="font-mono text-xs text-zinc-500">
                      {detail.target.courseCode} · {detail.run.academicYear}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                      {detail.candidateSnapshot.title}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      {detail.candidateSnapshot.units ?? "Unknown"} units ·{" "}
                      {detail.candidateSnapshot.offering_status.replaceAll(
                        "_",
                        " ",
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-5 max-w-3xl text-sm leading-7 whitespace-pre-wrap text-zinc-700">
                  {detail.candidateSnapshot.description ??
                    detail.candidateSnapshot.introduction ??
                    "No description was extracted."}
                </p>
                <Alert className="mt-5" tone="neutral">
                  <AlertDescription>
                    This preview uses the candidate only. It does not publish
                    the snapshot or replace the published course reader.
                  </AlertDescription>
                </Alert>
              </article>
            ) : (
              <DataTableShell>
                <DataTableEmpty
                  description="A preview becomes available after the candidate snapshot is saved."
                  title="No candidate preview"
                />
              </DataTableShell>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
