"use client";

import { ImportEmptyState } from "./import-empty-state";
import { useMemo } from "react";
import { LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@coursemap/ui/components/alert";
import { Button } from "@coursemap/ui/primitives/button";
import { DatabaseRowsViewer } from "./database-rows-viewer";
import {
  parseImportArtefact,
  type ImportArtefact,
} from "./import-artefact-data";
import { useImportArtefact } from "./use-import-artefact";

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
  const hasSavedRows = tables.some((table) => table.rows.length > 0);
  const artifact = projections[0] ?? null;
  const { content, loading, error, retry } = useImportArtefact(
    hasSavedRows ? null : artifact,
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

  if (hasSavedRows) {
    return (
      <DatabaseRowsViewer tables={tables} label="Imported database rows" />
    );
  }
  if (!artifact) {
    return <ImportEmptyState kind="database" />;
  }
  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={retry}>
          Retry loading
        </Button>
      </div>
    );
  }
  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-64 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <LoaderCircle
          aria-hidden="true"
          size={17}
          className="animate-spin motion-reduce:animate-none"
        />
        Loading import rows...
      </div>
    );
  }
  return (
    <div className="workspace-stack">
      <p className="text-sm text-muted-foreground">
        These rows have not been saved yet.
      </p>
      <DatabaseRowsViewer tables={planned} label="Proposed database rows" />
    </div>
  );
}
