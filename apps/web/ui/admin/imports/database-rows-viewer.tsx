"use client";

import { useState, useSyncExternalStore } from "react";
import { Checkbox } from "@coursemap/ui/primitives/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@coursemap/ui/primitives/tabs";
import { FilterBar } from "@/ui/ui/filter-bar";
import { JsonCode } from "@/ui/ui/json-code";
import {
  filterImportDatabaseTables,
  importDatabaseTableLabel,
} from "@/lib/coursemap/import-database-labels";
import { ArtefactViewport } from "./artefact-viewport";
import { ImportDatabaseRowTable } from "./import-database-row-table";

const subscribe = () => () => {};
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimezone = () => "UTC";

export function DatabaseRowsViewer({
  tables,
  label = "Database rows",
}: {
  tables: { name: string; rows: unknown[] }[];
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [selected, setSelected] = useState("");
  const [view, setView] = useState("table");
  const timezone = useSyncExternalStore(
    subscribe,
    localTimezone,
    serverTimezone,
  );
  const visible = filterImportDatabaseTables(tables, query, showEmpty);
  const selectedTable =
    visible.find((table) => table.name === selected) ?? visible[0];
  const selectedLabel = selectedTable
    ? importDatabaseTableLabel(selectedTable.name)
    : "No matching tables";

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <FilterBar
            searchPlaceholder="Search tables"
            state={{
              query,
              values: {},
              onQueryChange: setQuery,
              onFilterChange: () => {},
            }}
          />
        </div>
        <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={showEmpty}
            onCheckedChange={(checked) => setShowEmpty(checked === true)}
            aria-label="Show empty tables"
          />
          Show empty tables
        </label>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <nav
          aria-label="Database tables"
          className="flex max-h-48 flex-col gap-1 overflow-y-auto md:max-h-[calc(100dvh-15rem)]"
        >
          {visible.map((entry) => (
            <button
              type="button"
              key={entry.name}
              title={entry.name}
              aria-current={
                selectedTable?.name === entry.name ? "true" : undefined
              }
              onClick={() => setSelected(entry.name)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selectedTable?.name === entry.name ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              <span className="min-w-0">
                {importDatabaseTableLabel(entry.name)}
              </span>
              <span className="ml-auto shrink-0 text-xs tabular-nums">
                {entry.rows.length.toLocaleString("en-AU")}
              </span>
            </button>
          ))}
          {visible.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              No matching tables.
            </p>
          )}
        </nav>
        <div className="min-w-0 overflow-hidden rounded-xl border border-border">
          <ArtefactViewport
            label={label}
            toolbar={
              <>
                <span
                  title={selectedTable?.name}
                  className="min-w-0 text-sm font-medium"
                >
                  {selectedLabel}
                </span>
                <Tabs value={view} onValueChange={setView} className="ml-auto">
                  <TabsList aria-label="Database preview format">
                    <TabsTrigger value="table">Table</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            }
          >
            {view === "json" ? (
              <JsonCode
                label={`${selectedLabel} JSON`}
                value={selectedTable?.rows ?? []}
                uncapped
              />
            ) : selectedTable?.rows.length ? (
              <ImportDatabaseRowTable
                rows={selectedTable.rows}
                tableName={selectedTable.name}
                timezone={timezone}
              />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                {selectedTable
                  ? "No rows in this table."
                  : "Try another search or show empty tables."}
              </p>
            )}
          </ArtefactViewport>
        </div>
      </div>
    </div>
  );
}
