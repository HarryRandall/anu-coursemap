export type ImportDatabaseRow = Record<string, unknown>;

export type ImportDatabaseTable = {
  columns: string[];
  rows: ImportDatabaseRow[];
};

function isRecord(value: unknown): value is ImportDatabaseRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normaliseImportDatabaseTable(
  rows: readonly unknown[],
): ImportDatabaseTable {
  const normalisedRows = rows.map((row) =>
    isRecord(row) ? row : { value: row },
  );
  const columns = [
    ...new Set(normalisedRows.flatMap((row) => Object.keys(row))),
  ];

  if (columns.length > 0) {
    return { columns, rows: normalisedRows };
  }

  return {
    columns: ["value"],
    rows: rows.map((row) => ({ value: row })),
  };
}
