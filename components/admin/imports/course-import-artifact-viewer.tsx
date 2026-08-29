"use client";

import { useMemo, useState } from "react";
import { FileCode2, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseImportArtifact } from "@/lib/coursemap/admin-course-imports";

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
  database_projection: "Database projection",
  change_set: "Change set",
};

function displayContent(content: string, mediaType: string) {
  if (mediaType !== "application/json") return content;
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

export function CourseImportArtifactViewer({
  artifacts,
}: {
  artifacts: CourseImportArtifact[];
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
          [artifact.id]: displayContent(text, artifact.mediaType),
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
              <pre
                aria-label={`${labels[artifact.kind] ?? artifact.kind} content`}
                className="max-h-[70vh] overflow-auto bg-zinc-950 px-4 py-4 font-mono text-xs leading-5 whitespace-pre text-zinc-100 outline-none selection:bg-brand-500/40 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset"
                tabIndex={0}
              >
                <code>{content[artifact.id]}</code>
              </pre>
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
