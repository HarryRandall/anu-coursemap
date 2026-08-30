"use client";

import { useMemo, useState } from "react";
import { FileCode2, LoaderCircle } from "lucide-react";
import {
  AcademicStructureImportDatabaseRows,
  projectedAcademicStructureDatabaseTables,
} from "@/components/admin/imports/academic-structure-import-database-rows";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonCode } from "@/components/ui/json-code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcademicStructureImportArtifact } from "@/lib/coursemap/admin-academic-structure-imports";

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

function readable(value: unknown) {
  if (typeof value !== "string") return "Not recorded";
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function PersistenceDecision({ value }: { value: unknown }) {
  if (!isRecord(value)) {
    return <JsonCode label="Persistence decision" value={value} />;
  }
  const changeKind = value.changeKind;
  const summary =
    changeKind === "new"
      ? "Create a new candidate snapshot"
      : changeKind === "changed"
        ? "Create a changed candidate snapshot"
        : changeKind === "unchanged"
          ? "Reuse the existing saved structure data"
          : "Persistence decision not recorded";

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Database action</p>
          <p className="mt-1 text-sm font-semibold text-zinc-950">{summary}</p>
        </div>
        <Badge tone={changeKind === "unchanged" ? "neutral" : "warning"}>
          {readable(changeKind)}
        </Badge>
      </div>
      <dl className="grid gap-3 text-xs sm:grid-cols-3">
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
          <dt className="text-zinc-500">Manual review</dt>
          <dd className="mt-1 text-zinc-800">
            {value.requiresManualReview === false ? "Not required" : "Required"}
          </dd>
        </div>
      </dl>
      <details className="group rounded-lg border border-zinc-200 bg-white">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none">
          Complete persistence record
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
  artifact: AcademicStructureImportArtifact;
  content: string;
}) {
  const parsed =
    artifact.mediaType === "application/json" ? parseJson(content) : null;

  if (artifact.kind === "database_projection" && parsed !== null) {
    return (
      <div className="space-y-4 bg-zinc-50/40 p-4 sm:p-5">
        <p className="text-xs leading-5 text-zinc-600">
          These are the destination tables and row shapes prepared by the
          worker. Angle-bracketed values are identifiers assigned when the
          candidate is saved.
        </p>
        <AcademicStructureImportDatabaseRows
          emptyLabel="0 rows"
          tables={projectedAcademicStructureDatabaseTables(parsed)}
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

export function AcademicStructureImportArtifactViewer({
  artifacts,
}: {
  artifacts: AcademicStructureImportArtifact[];
}) {
  const ordered = useMemo(() => {
    return [...artifacts].sort((left, right) => {
      const leftPosition = artefactOrder.indexOf(left.kind);
      const rightPosition = artefactOrder.indexOf(right.kind);
      if (leftPosition !== rightPosition) return leftPosition - rightPosition;
      return right.attemptNumber - left.attemptNumber;
    });
  }, [artifacts]);
  const attemptCountByKind = useMemo(() => {
    const counts = new Map<string, number>();
    for (const artifact of ordered) {
      counts.set(artifact.kind, (counts.get(artifact.kind) ?? 0) + 1);
    }
    return counts;
  }, [ordered]);
  const [active, setActive] = useState(ordered[0]?.id ?? "");
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selected =
    ordered.find((artifact) => artifact.id === active) ?? ordered[0] ?? null;

  function loadArtifact(artifact: AcademicStructureImportArtifact) {
    if (content[artifact.id] || loading.includes(artifact.id)) return;
    const controller = new AbortController();
    setLoading((current) => [...new Set([...current, artifact.id])]);
    setErrors((current) => {
      const next = { ...current };
      delete next[artifact.id];
      return next;
    });
    void fetch(
      `/api/admin/academic-structure-imports/artifacts/${artifact.id}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const body = await response.text();
        if (!response.ok) {
          let message = "The import artefact could not be loaded.";
          try {
            const parsed = JSON.parse(body) as { error?: unknown };
            if (typeof parsed.error === "string") message = parsed.error;
          } catch {
            // The safe generic message covers a non-JSON response.
          }
          throw new Error(message);
        }
        setContent((current) => ({ ...current, [artifact.id]: body }));
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
            Artefacts appear as the worker completes each stage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs
      onValueChange={(value) => {
        setActive(value);
        const artifact = ordered.find((candidate) => candidate.id === value);
        if (artifact) loadArtifact(artifact);
      }}
      value={selected?.id ?? ""}
    >
      <div className="overflow-x-auto pb-1">
        <TabsList className="h-auto min-w-max">
          {ordered.map((artifact) => (
            <TabsTrigger
              key={artifact.id}
              onFocus={() => loadArtifact(artifact)}
              onPointerEnter={() => loadArtifact(artifact)}
              value={artifact.id}
            >
              {labels[artifact.kind] ?? artifact.kind}
              {(attemptCountByKind.get(artifact.kind) ?? 0) > 1
                ? ` · attempt ${artifact.attemptNumber}`
                : ""}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {ordered.map((artifact) => (
        <TabsContent key={artifact.id} value={artifact.id}>
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-3 text-xs text-zinc-500">
              <Badge tone="neutral">Attempt {artifact.attemptNumber}</Badge>
              <span>{artifact.mediaType}</span>
              <span className="tabular-nums">
                {artifact.byteSize.toLocaleString("en-AU")} bytes
              </span>
              <span
                className="min-w-0 truncate font-mono"
                title={artifact.contentSha256}
              >
                sha256:{artifact.contentSha256.slice(0, 12)}
              </span>
            </div>
            {errors[artifact.id] ? (
              <Alert className="m-4" tone="danger">
                <AlertDescription>{errors[artifact.id]}</AlertDescription>
              </Alert>
            ) : loading.includes(artifact.id) && !content[artifact.id] ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-500">
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  size={17}
                />
                Loading artefact...
              </div>
            ) : content[artifact.id] ? (
              <ArtifactContent
                artifact={artifact}
                content={content[artifact.id]}
              />
            ) : (
              <div className="grid min-h-64 place-items-center">
                <Button onClick={() => loadArtifact(artifact)}>
                  Load {labels[artifact.kind] ?? artifact.kind}
                </Button>
              </div>
            )}
          </section>
        </TabsContent>
      ))}
    </Tabs>
  );
}
