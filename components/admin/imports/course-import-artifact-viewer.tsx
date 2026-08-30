"use client";

import { useMemo, useState } from "react";
import { FileCode2, LoaderCircle } from "lucide-react";
import { CourseImportDatabaseRows } from "@/components/admin/imports/course-import-database-rows";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonCode } from "@/components/ui/json-code";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseImportArtifact } from "@/lib/coursemap/admin-course-imports";
import { projectedCourseDatabaseTables } from "@/lib/coursemap/course-import-database-view";

const artefactOrder = [
  "raw_html",
  "normalised_markdown",
  "model_input",
  "deterministic_output",
  "model_request",
  "model_response",
  "validated_json",
  "validation_report",
  "database_projection",
  "change_set",
];

const labels: Record<string, string> = {
  raw_html: "Raw HTML",
  normalised_markdown: "Markdown",
  model_input: "Model input",
  deterministic_output: "Deterministic output",
  model_request: "Model request",
  model_response: "Model response",
  validated_json: "Validated JSON",
  validation_report: "Validation",
  database_projection: "Planned database rows",
  change_set: "Persistence decision",
};

function parseJson(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function yesNo(value: unknown) {
  return value === true ? "Yes" : value === false ? "No" : "Not recorded";
}

function PersistenceDecision({ value }: { value: unknown }) {
  if (!isRecord(value)) {
    return <JsonCode label="Persistence decision" value={value} />;
  }
  const changeKind =
    typeof value.changeKind === "string" ? value.changeKind : "unknown";
  const decision =
    changeKind === "new"
      ? "Create a new candidate snapshot"
      : changeKind === "changed"
        ? "Create a changed candidate snapshot"
        : changeKind === "unchanged"
          ? "Reuse the existing saved course data"
          : "Persistence decision not recorded";

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Database action</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">{decision}</p>
        </div>
        <Badge tone={changeKind === "unchanged" ? "neutral" : "warning"}>
          {changeKind.replaceAll("_", " ")}
        </Badge>
      </div>
      <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-zinc-500">Compared snapshot</dt>
          <dd className="mt-1 font-mono text-zinc-800">
            {String(value.comparedSnapshotId ?? "None")}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Candidate snapshot</dt>
          <dd className="mt-1 font-mono text-zinc-800">
            {String(value.candidateSnapshotId ?? "None")}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Manual review required</dt>
          <dd className="mt-1 text-zinc-800">
            {yesNo(value.requiresManualReview)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Course changed during import</dt>
          <dd className="mt-1 text-zinc-800">
            {yesNo(value.baselineChangedDuringImport)}
          </dd>
        </div>
      </dl>
      <details className="group rounded-lg border border-zinc-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none">
          View complete persistence record
        </summary>
        <JsonCode label="Complete persistence decision" value={value} />
      </details>
    </div>
  );
}

function ArtifactContent({
  artifact,
  content,
}: {
  artifact: CourseImportArtifact;
  content: string;
}) {
  const parsed =
    artifact.mediaType === "application/json" ? parseJson(content) : null;

  if (artifact.kind === "database_projection" && parsed !== null) {
    return (
      <div className="space-y-4 bg-zinc-50/40 p-4 sm:p-5">
        <p className="text-xs leading-5 text-zinc-600">
          These are the destination tables and row shapes prepared by the
          import. Angle-bracketed values are identifiers assigned when the
          candidate is saved.
        </p>
        <CourseImportDatabaseRows
          emptyLabel="0 rows"
          tables={projectedCourseDatabaseTables(parsed)}
        />
      </div>
    );
  }
  if (artifact.kind === "change_set" && parsed !== null) {
    return <PersistenceDecision value={parsed} />;
  }
  if (parsed !== null) {
    return (
      <JsonCode
        label={`${labels[artifact.kind] ?? artifact.kind} content`}
        value={parsed}
      />
    );
  }
  return (
    <pre
      aria-label={`${labels[artifact.kind] ?? artifact.kind} content`}
      className="max-h-[70vh] overflow-auto border-t border-zinc-200 bg-zinc-50/60 px-5 py-4 font-mono text-xs leading-5 whitespace-pre text-zinc-700 outline-none selection:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset"
      tabIndex={0}
    >
      <code>{content}</code>
    </pre>
  );
}

export function CourseImportArtifactViewer({
  artifacts,
}: {
  artifacts: CourseImportArtifact[];
}) {
  const ordered = useMemo(() => {
    return [...artifacts].sort((left, right) => {
      const leftIndex = artefactOrder.indexOf(left.kind);
      const rightIndex = artefactOrder.indexOf(right.kind);
      const leftPosition = leftIndex === -1 ? artefactOrder.length : leftIndex;
      const rightPosition =
        rightIndex === -1 ? artefactOrder.length : rightIndex;
      if (leftPosition !== rightPosition) return leftPosition - rightPosition;
      return right.attemptNumber - left.attemptNumber;
    });
  }, [artifacts]);
  const grouped = useMemo(() => {
    const groups = new Map<string, CourseImportArtifact[]>();
    for (const artifact of ordered) {
      const group = groups.get(artifact.kind) ?? [];
      group.push(artifact);
      groups.set(artifact.kind, group);
    }
    return [...groups].map(([kind, attempts]) => ({ kind, attempts }));
  }, [ordered]);
  const [activeKind, setActiveKind] = useState(grouped[0]?.kind ?? "");
  const [selectedAttempts, setSelectedAttempts] = useState<
    Record<string, string>
  >({});
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedGroup =
    grouped.find((group) => group.kind === activeKind) ?? grouped[0] ?? null;
  const selected = selectedGroup
    ? (selectedGroup.attempts.find(
        (artifact) => artifact.id === selectedAttempts[selectedGroup.kind],
      ) ?? selectedGroup.attempts[0])
    : null;

  function selectedArtifactForKind(kind: string) {
    const group = grouped.find((candidate) => candidate.kind === kind);
    return group
      ? (group.attempts.find(
          (artifact) => artifact.id === selectedAttempts[kind],
        ) ?? group.attempts[0])
      : null;
  }

  function loadArtifact(artifact: CourseImportArtifact) {
    if (content[artifact.id] || loading.includes(artifact.id)) return;
    const controller = new AbortController();
    setLoading((current) => [...new Set([...current, artifact.id])]);
    setErrors((current) => {
      const next = { ...current };
      delete next[artifact.id];
      return next;
    });
    void fetch(`/api/admin/course-imports/artifacts/${artifact.id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const text = await response.text();
        if (!response.ok) {
          let message = "The import artefact could not be loaded.";
          try {
            const parsed = JSON.parse(text) as { error?: unknown };
            if (typeof parsed.error === "string") message = parsed.error;
          } catch {
            // The safe generic message already covers a non-JSON failure.
          }
          throw new Error(message);
        }
        setContent((current) => ({
          ...current,
          [artifact.id]: text,
        }));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setErrors((current) => ({
          ...current,
          [artifact.id]:
            reason instanceof Error
              ? reason.message
              : "The import artefact could not be loaded.",
        }));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading((current) => current.filter((id) => id !== artifact.id));
        }
      });
  }

  if (ordered.length === 0) {
    return (
      <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 text-center">
        <div>
          <FileCode2 aria-hidden="true" className="mx-auto text-zinc-300" />
          <p className="mt-2 text-sm font-medium text-zinc-700">
            No artefacts saved yet
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Artefacts appear as the background worker completes each stage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs
      onValueChange={(value) => {
        setActiveKind(value);
        const artifact = selectedArtifactForKind(value);
        if (artifact) loadArtifact(artifact);
      }}
      value={selectedGroup?.kind ?? ""}
    >
      <div className="overflow-x-auto pb-1">
        <TabsList className="h-auto min-w-max">
          {grouped.map((group) => (
            <TabsTrigger
              key={group.kind}
              onFocus={() => {
                const artifact = selectedArtifactForKind(group.kind);
                if (artifact) loadArtifact(artifact);
              }}
              onPointerEnter={() => {
                const artifact = selectedArtifactForKind(group.kind);
                if (artifact) loadArtifact(artifact);
              }}
              value={group.kind}
            >
              {labels[group.kind] ?? group.kind}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {selected && selectedGroup ? (
        <TabsContent key={selectedGroup.kind} value={selectedGroup.kind}>
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-3 text-xs text-zinc-500">
              {selectedGroup.attempts.length > 1 ? (
                <Select
                  aria-label={`Choose ${labels[selected.kind] ?? selected.kind} attempt`}
                  className="w-40"
                  onChange={(artifactId) => {
                    setSelectedAttempts((current) => ({
                      ...current,
                      [selectedGroup.kind]: artifactId,
                    }));
                    const artifact = selectedGroup.attempts.find(
                      (candidate) => candidate.id === artifactId,
                    );
                    if (artifact) loadArtifact(artifact);
                  }}
                  options={selectedGroup.attempts.map((artifact, index) => ({
                    value: artifact.id,
                    label: `Attempt ${artifact.attemptNumber}${index === 0 ? " (latest)" : ""}`,
                  }))}
                  value={selected.id}
                />
              ) : (
                <Badge tone="neutral">Attempt {selected.attemptNumber}</Badge>
              )}
              <span>{selected.mediaType}</span>
              <span className="tabular-nums">
                {selected.byteSize.toLocaleString("en-AU")} bytes
              </span>
              <span
                className="min-w-0 truncate font-mono"
                title={selected.contentSha256}
              >
                sha256:{selected.contentSha256.slice(0, 12)}
              </span>
            </div>
            {errors[selected.id] ? (
              <Alert className="m-4" tone="danger">
                <AlertDescription>{errors[selected.id]}</AlertDescription>
              </Alert>
            ) : loading.includes(selected.id) && !content[selected.id] ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-500">
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={17}
                />
                Loading artefact...
              </div>
            ) : content[selected.id] ? (
              <ArtifactContent
                artifact={selected}
                content={content[selected.id]}
              />
            ) : (
              <div className="grid min-h-64 place-items-center">
                <Button onClick={() => loadArtifact(selected)}>
                  Load {labels[selected.kind] ?? selected.kind}
                </Button>
              </div>
            )}
          </section>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
