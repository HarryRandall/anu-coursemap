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
import { DatabaseRowsViewer } from "./database-rows-viewer";
import {
  parseImportArtefact,
  type ImportArtefact,
} from "./import-artefact-data";
import { useImportArtefact } from "./use-import-artefact";
import { ArtefactViewport } from "./artefact-viewport";

type DatabaseTable = { name: string; rows: unknown[] };

export function ImportDatabaseRows({
  tables,
  artifacts,
  endpoint,
  project,
}: {
  tables: DatabaseTable[];
  artifacts: ImportArtefact[];
  endpoint: string;
  project: (value: unknown) => DatabaseTable[];
}) {
  const projections = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.kind === "database_projection")
        .sort((a, b) => b.attemptNumber - a.attemptNumber),
    [artifacts],
  );
  const [source, setSource] = useState(
    tables.some((table) => table.rows.length) ? "saved" : "planned",
  );
  const [attemptId, setAttemptId] = useState("");
  const [raw, setRaw] = useState(false);
  const artifact =
    projections.find((entry) => entry.id === attemptId) ??
    projections[0] ??
    null;
  const { content, loading, error, retry } = useImportArtefact(
    source === "planned" ? artifact : null,
    endpoint,
  );
  const parsed = useMemo(
    () => (content === undefined ? null : parseImportArtefact(content)),
    [content],
  );
  const planned = useMemo(
    () => (parsed === null ? [] : project(parsed)),
    [parsed, project],
  );

  return (
    <Tabs value={source} onValueChange={setSource} className="min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <TabsList aria-label="Database row source">
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="planned">Planned</TabsTrigger>
        </TabsList>
        {source === "planned" && projections.length > 1 && (
          <OptionPicker
            value={artifact?.id ?? ""}
            onValueChange={setAttemptId}
            aria-label="Projection attempt"
            className="w-44"
            items={projections.map((entry, index) => ({
              value: entry.id,
              label: `Attempt ${entry.attemptNumber}${index === 0 ? " (latest)" : ""}`,
            }))}
          />
        )}
        {source === "planned" && parsed !== null && (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto"
            aria-pressed={raw}
            onClick={() => setRaw((value) => !value)}
          >
            {raw ? "View tables" : "Original projection JSON"}
          </Button>
        )}
      </div>
      <TabsContent value="saved" className="min-w-0">
        {tables.some((table) => table.rows.length) ? (
          <DatabaseRowsViewer tables={tables} label="Saved database rows" />
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            No database rows were saved for this import.
          </p>
        )}
      </TabsContent>
      <TabsContent value="planned" className="min-w-0">
        {!artifact ? (
          <p className="py-8 text-sm text-muted-foreground">
            No database projection was saved for this import.
          </p>
        ) : error ? (
          <div className="space-y-3">
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
            className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <LoaderCircle
              aria-hidden="true"
              size={17}
              className="animate-spin motion-reduce:animate-none"
            />
            Loading planned rows...
          </div>
        ) : raw || parsed === null ? (
          <ArtefactViewport label="Original database projection">
            <JsonCode
              label="Original database projection JSON"
              value={parsed ?? content}
              uncapped
            />
          </ArtefactViewport>
        ) : (
          <DatabaseRowsViewer tables={planned} label="Planned database rows" />
        )}
      </TabsContent>
    </Tabs>
  );
}
