"use client";

import { useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Button } from "@coursemap/ui/primitives/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@coursemap/ui/primitives/tabs";
import { OptionPicker } from "@/ui/ui/option-picker";
import { JsonCode } from "@/ui/ui/json-code";
import { ArtefactViewport } from "./artefact-viewport";
import { PersistenceDecision } from "./import-persistence-decision";
import {
  groupImportArtefacts,
  importArtefactLabels,
  parseImportArtefact,
  type ImportArtefact,
} from "./import-artefact-data";
import { useImportArtefact } from "./use-import-artefact";
import { SourceCode } from "./source-code";
import navigationStyles from "./artefact-navigation.module.css";

export function ImportArtefactViewer({
  artifacts,
  endpoint,
}: {
  artifacts: ImportArtefact[];
  endpoint: string;
}) {
  const grouped = useMemo(() => groupImportArtefacts(artifacts), [artifacts]);
  const [activeKind, setActiveKind] = useState("");
  const [attempts, setAttempts] = useState<Record<string, string>>({});
  const group =
    grouped.find((entry) => entry.kind === activeKind) ?? grouped[0];
  const artifact =
    group?.attempts.find((entry) => entry.id === attempts[group.kind]) ??
    group?.attempts[0] ??
    null;
  const { content, loading, error, retry } = useImportArtefact(
    artifact,
    endpoint,
  );
  const label = artifact
    ? (importArtefactLabels[artifact.kind] ??
      artifact.kind.replaceAll("_", " "))
    : "Artefact";
  const parsed =
    content !== undefined && artifact?.mediaType === "application/json"
      ? parseImportArtefact(content)
      : null;

  if (!group || !artifact)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No artefacts saved yet.
      </p>
    );

  return (
    <Tabs
      orientation="vertical"
      value={group.kind}
      onValueChange={setActiveKind}
      className="min-w-0 flex-col gap-4 md:flex-row"
    >
      <div className="shrink-0 md:w-52">
        <div className="md:hidden">
          <OptionPicker
            value={group.kind}
            onValueChange={setActiveKind}
            aria-label="Choose artefact"
            className="w-full"
            items={grouped.map((entry) => ({
              value: entry.kind,
              label:
                importArtefactLabels[entry.kind] ??
                entry.kind.replaceAll("_", " "),
            }))}
          />
        </div>
        <TabsList
          aria-label="Import artefacts"
          className={`${navigationStyles.list} hidden h-auto w-full items-stretch gap-1 bg-transparent p-0 md:flex`}
        >
          {grouped.map((entry) => (
            <TabsTrigger
              key={entry.kind}
              value={entry.kind}
              className="min-h-11 w-full shrink-0 justify-start rounded-md px-3 text-left text-sm"
            >
              {importArtefactLabels[entry.kind] ??
                entry.kind.replaceAll("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={group.kind} className="min-w-0 flex-1">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
          {group.attempts.length > 1 && (
            <div className="border-b border-border p-3">
              <OptionPicker
                value={artifact.id}
                onValueChange={(id) =>
                  setAttempts((current) => ({ ...current, [group.kind]: id }))
                }
                aria-label={`Choose ${label} attempt`}
                className="w-44"
                items={group.attempts.map((entry, index) => ({
                  value: entry.id,
                  label: `Attempt ${entry.attemptNumber}${index === 0 ? " (latest)" : ""}`,
                }))}
              />
            </div>
          )}
          {error ? (
            <div className="space-y-3 p-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button type="button" variant="outline" onClick={retry}>
                Retry loading
              </Button>
            </div>
          ) : loading ? (
            <div
              role="status"
              className="flex h-[max(24rem,calc(100dvh-14rem))] items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <LoaderCircle
                size={17}
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
              Loading artefact...
            </div>
          ) : parsed !== null ? (
            <ArtefactViewport label={`${label} content`}>
              {artifact.kind === "change_set" ? (
                <PersistenceDecision value={parsed} />
              ) : (
                <JsonCode label={`${label} JSON`} value={parsed} uncapped />
              )}
            </ArtefactViewport>
          ) : (
            <SourceCode
              content={content ?? ""}
              kind={artifact.kind}
              label={`${label} content`}
            />
          )}
        </section>
      </TabsContent>
    </Tabs>
  );
}
