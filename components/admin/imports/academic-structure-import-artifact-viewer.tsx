"use client";
import { badgeVariantForTone } from "@/lib/ui";

import { Alert, AlertDescription } from "@reui/components/alert";
import { Badge } from "@reui/components/badge";
import { Button } from "@reui/ui/button";
import { OptionPicker } from "@/components/ui/option-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@reui/ui/tabs";

import { useMemo, useState } from "react";
import { FileCode2, LoaderCircle } from "lucide-react";
import { projectedAcademicStructureDatabaseTables } from "@/components/admin/imports/academic-structure-import-database-rows";
import { DatabaseRowsViewer } from "./database-rows-viewer";
import { ArtefactViewport } from "./artefact-viewport";

import navigationStyles from "./artefact-navigation.module.css";
import { SourceCode } from "./source-code";
import { JsonCode } from "@/components/ui/json-code";

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
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Database action
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {summary}
          </p>
        </div>
        <Badge
          variant={
            badgeVariantForTone[
              changeKind === "unchanged" ? "neutral" : "warning"
            ]
          }
        >
          {readable(changeKind)}
        </Badge>
      </div>
      <dl className="grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Compared snapshot</dt>
          <dd className="mt-1 font-mono text-foreground/90">
            {String(value.comparedSnapshotId ?? "None")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Candidate snapshot</dt>
          <dd className="mt-1 font-mono text-foreground/90">
            {String(value.candidateSnapshotId ?? "None")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Manual review</dt>
          <dd className="mt-1 text-foreground/90">
            {value.requiresManualReview === false ? "Not required" : "Required"}
          </dd>
        </div>
      </dl>
      <details className="group rounded-lg border border-border bg-card">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
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
      <DatabaseRowsViewer
        tables={projectedAcademicStructureDatabaseTables(parsed)}
        label="Planned database rows"
      />
    );
  }
  if (artifact.kind === "change_set" && parsed !== null) {
    return <PersistenceDecision value={parsed} />;
  }
  if (parsed !== null) {
    return (
      <ArtefactViewport
        label={`${labels[artifact.kind] ?? artifact.kind} content`}
      >
        <JsonCode
          label={`${labels[artifact.kind] ?? artifact.kind} JSON`}
          value={parsed}
          uncapped
        />
      </ArtefactViewport>
    );
  }
  return (
    <SourceCode
      content={content}
      kind={artifact.kind}
      label={`${labels[artifact.kind] ?? artifact.kind} content`}
    />
  );
}

export function AcademicStructureImportArtifactViewer({
  artifacts,
}: {
  artifacts: AcademicStructureImportArtifact[];
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
    const groups = new Map<string, AcademicStructureImportArtifact[]>();
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
      <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-input bg-card px-6 text-center">
        <div>
          <FileCode2
            aria-hidden="true"
            className="mx-auto text-muted-foreground/60"
          />
          <p className="mt-2 text-sm font-medium text-foreground/80">
            No artefacts saved yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Artefacts appear as the worker completes each stage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs
      orientation="vertical"
      className="min-w-0 flex-col gap-4 md:flex-row"
      onValueChange={(value) => {
        setActiveKind(value);
        const artifact = selectedArtifactForKind(value);
        if (artifact) loadArtifact(artifact);
      }}
      value={selectedGroup?.kind ?? ""}
    >
      <div className="shrink-0 md:w-52">
        <div className="md:hidden">
          <OptionPicker
            value={selectedGroup?.kind ?? ""}
            onValueChange={(kind) => {
              setActiveKind(kind);
              const artifact = selectedArtifactForKind(kind);
              if (artifact) loadArtifact(artifact);
            }}
            aria-label="Choose artefact"
            className="w-full"
            items={grouped.map((group) => ({
              value: group.kind,
              label: labels[group.kind] ?? group.kind,
            }))}
          />
        </div>
        <TabsList
          aria-label="Import artefacts"
          className={`${navigationStyles.list} hidden h-auto w-full items-stretch gap-1 bg-transparent p-0 md:flex`}
        >
          {grouped.map((group) => (
            <TabsTrigger
              className="h-9 w-full shrink-0 justify-start rounded-md px-3 text-left text-[13px] hover:bg-accent data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
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
        <TabsContent
          className="min-w-0 flex-1"
          key={selectedGroup.kind}
          value={selectedGroup.kind}
        >
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {selectedGroup.attempts.length > 1 ? (
              <div className="border-b border-border p-3">
                <OptionPicker
                  value={"coursemap:" + String(selected.id)}
                  onValueChange={(nextValue) => {
                    const option = selectedGroup.attempts
                      .map((artifact, index) => ({
                        value: artifact.id,
                        label: `Attempt ${artifact.attemptNumber}${index === 0 ? " (latest)" : ""}`,
                      }))
                      .find(
                        (option) =>
                          "coursemap:" + String(option.value) === nextValue,
                      );
                    if (option)
                      ((artifactId) => {
                        setSelectedAttempts((current) => ({
                          ...current,
                          [selectedGroup.kind]: artifactId,
                        }));
                        const artifact = selectedGroup.attempts.find(
                          (candidate) => candidate.id === artifactId,
                        );
                        if (artifact) loadArtifact(artifact);
                      })(option.value);
                  }}
                  className={"w-40"}
                  aria-label={`Choose ${labels[selected.kind] ?? selected.kind} attempt`}
                  onPointerDown={(event) => event.stopPropagation()}
                  placeholder={"Select..."}
                  items={selectedGroup.attempts
                    .map((artifact, index) => ({
                      value: artifact.id,
                      label: `Attempt ${artifact.attemptNumber}${index === 0 ? " (latest)" : ""}`,
                    }))
                    .map((option) => ({
                      value: "coursemap:" + String(option.value),
                      label: option.label,
                    }))}
                />
              </div>
            ) : null}
            {errors[selected.id] ? (
              <Alert className="m-4" variant={"destructive"}>
                <AlertDescription>{errors[selected.id]}</AlertDescription>
              </Alert>
            ) : loading.includes(selected.id) && !content[selected.id] ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
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
                <Button
                  onClick={() => loadArtifact(selected)}
                  variant="outline"
                  type="button"
                >
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
