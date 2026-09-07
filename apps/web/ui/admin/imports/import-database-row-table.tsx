import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coursemap/ui/primitives/table";
import { normaliseImportDatabaseTable } from "@/lib/coursemap/import-database-table";
import {
  importDatabaseFieldLabel,
  importDatabaseTableLabel,
} from "@/lib/coursemap/import-database-labels";
import { formatImportDatabaseValue } from "@/lib/coursemap/import-database-value";

function DatabaseCellValue({
  column,
  value,
  timezone,
}: {
  column: string;
  value: unknown;
  timezone: string;
}) {
  return (
    <span
      title={typeof value === "object" ? JSON.stringify(value) : String(value)}
      className="block max-w-xl min-w-0 [overflow-wrap:anywhere] break-words whitespace-pre-wrap"
    >
      {formatImportDatabaseValue(column, value, timezone)}
    </span>
  );
}

export function ImportDatabaseRowTable({
  rows,
  tableName,
  timezone = "UTC",
}: {
  rows: readonly unknown[];
  tableName: string;
  timezone?: string;
}) {
  const table = normaliseImportDatabaseTable(rows);
  const single = table.rows.length === 1;
  return (
    <Table className="text-sm">
      <TableCaption className="sr-only">
        {importDatabaseTableLabel(tableName)} database rows
      </TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {(single ? ["Field", "Value"] : table.columns).map((column) => (
            <TableHead
              key={column}
              title={column}
              className="h-11 bg-muted/30 px-4 font-medium"
            >
              {importDatabaseFieldLabel(column)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {single
          ? table.columns.map((column) => (
              <TableRow key={column}>
                <TableHead
                  scope="row"
                  title={column}
                  className="w-1/3 min-w-40 px-4 py-3 align-top font-normal whitespace-normal text-muted-foreground"
                >
                  {importDatabaseFieldLabel(column)}
                </TableHead>
                <TableCell className="px-4 py-3 align-top whitespace-normal">
                  <DatabaseCellValue
                    column={column}
                    value={table.rows[0][column]}
                    timezone={timezone}
                  />
                </TableCell>
              </TableRow>
            ))
          : table.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {table.columns.map((column) => (
                  <TableCell
                    key={column}
                    className="min-w-32 px-4 py-3 align-top whitespace-normal"
                  >
                    <DatabaseCellValue
                      column={column}
                      value={row[column]}
                      timezone={timezone}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}
