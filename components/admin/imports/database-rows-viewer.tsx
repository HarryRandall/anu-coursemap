"use client";

import { useState, useSyncExternalStore } from "react";
import { Tabs, TabsList, TabsTrigger } from "@reui/ui/tabs";
import { FilterBar } from "@/components/ui/filter-bar";
import { JsonCode } from "@/components/ui/json-code";
import { normaliseImportDatabaseTable } from "@/lib/coursemap/import-database-table";
import { formatImportDatabaseValue } from "@/lib/coursemap/import-database-value";
import { ArtefactViewport } from "./artefact-viewport";

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
  const [tableFilter, setTableFilter] = useState("");
  const [selected, setSelected] = useState("");
  const [view, setView] = useState("table");
  const timezone = useSyncExternalStore(
    subscribe,
    localTimezone,
    serverTimezone,
  );
  const visible = tables.filter(
    (table) =>
      table.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!tableFilter || table.name === tableFilter),
  );
  const selectedTable =
    visible.find((table) => table.name === selected) ?? visible[0];
  const table = normaliseImportDatabaseTable(selectedTable?.rows ?? []);
  const single = table.rows.length === 1;
  const cell = (column: string, value: unknown) => (
    <span
      title={typeof value === "object" ? JSON.stringify(value) : String(value)}
      className="break-words whitespace-pre-wrap"
    >
      {formatImportDatabaseValue(column, value, timezone)}
    </span>
  );

  return (
    <div className="min-w-0">
      <div className="border-b border-border p-3">
        <FilterBar
          searchPlaceholder="Search tables"
          filters={[
            {
              key: "table",
              label: "Table",
              allLabel: "All tables",
              options: tables.map((table) => ({
                value: table.name,
                label: table.name,
              })),
            },
          ]}
          state={{
            query,
            values: { table: tableFilter },
            onQueryChange: setQuery,
            onFilterChange: (_key, value) => setTableFilter(value),
          }}
        />
      </div>
      <div className="grid min-w-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <nav
          aria-label="Database tables"
          className="flex max-h-44 flex-col gap-1 overflow-y-auto border-b border-border p-2 md:max-h-[min(65vh,40rem)] md:border-r md:border-b-0"
        >
          {visible.map((entry) => (
            <button
              type="button"
              key={entry.name}
              aria-current={
                selectedTable?.name === entry.name ? "true" : undefined
              }
              onClick={() => setSelected(entry.name)}
              className={`flex min-h-9 shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selectedTable?.name === entry.name ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              <span className="min-w-0 break-all">{entry.name}</span>
              <span className="ml-auto shrink-0 tabular-nums">
                {entry.rows.length.toLocaleString("en-AU")}
              </span>
            </button>
          ))}
          {visible.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">
              No matching tables.
            </p>
          )}
        </nav>
        <ArtefactViewport
          label={label}
          toolbar={
            <>
              <span className="min-w-0 text-xs font-medium break-all">
                {selectedTable?.name ?? "No matching tables"}
              </span>
              <Tabs value={view} onValueChange={setView} className="ml-auto">
                <TabsList
                  aria-label="Database preview format"
                  className="!h-9 !flex-row !rounded-xl !bg-accent p-1"
                >
                  <TabsTrigger
                    className="data-[state=active]:!border-transparent data-[state=active]:!bg-background data-[state=active]:!shadow-none"
                    value="table"
                  >
                    Table
                  </TabsTrigger>
                  <TabsTrigger
                    className="data-[state=active]:!border-transparent data-[state=active]:!bg-background data-[state=active]:!shadow-none"
                    value="json"
                  >
                    JSON
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </>
          }
        >
          {view === "json" ? (
            <JsonCode
              label={`${selectedTable?.name ?? label} JSON`}
              value={selectedTable?.rows ?? []}
              uncapped
            />
          ) : selectedTable?.rows.length ? (
            <table className="w-full border-collapse text-left text-xs">
              <caption className="sr-only">
                {selectedTable.name} database rows
              </caption>
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  {(single ? ["Field", "Value"] : table.columns).map(
                    (column) => (
                      <th
                        scope="col"
                        key={column}
                        className="border-b border-border px-4 py-2 font-mono font-medium"
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {single
                  ? table.columns.map((column) => (
                      <tr
                        key={column}
                        className="border-b border-border last:border-0"
                      >
                        <th
                          scope="row"
                          className="w-1/3 px-4 py-2 align-top font-mono font-normal break-all text-muted-foreground"
                        >
                          {column}
                        </th>
                        <td className="px-4 py-2 align-top">
                          {cell(column, table.rows[0][column])}
                        </td>
                      </tr>
                    ))
                  : table.rows.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-border last:border-0"
                      >
                        {table.columns.map((column) => (
                          <td
                            key={column}
                            className="max-w-96 min-w-40 px-4 py-2 align-top"
                          >
                            {cell(column, row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {selectedTable
                ? "No rows in this table."
                : "Try another search or clear the table filter."}
            </p>
          )}
        </ArtefactViewport>
      </div>
    </div>
  );
}
