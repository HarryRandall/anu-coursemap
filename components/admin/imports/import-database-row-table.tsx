import {
  DataTableShell,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { normaliseImportDatabaseTable } from "@/lib/coursemap/import-database-table";

function DatabaseCellValue({ value }: { value: unknown }) {
  if (value === undefined) {
    return <span className="text-zinc-400">Not present</span>;
  }
  if (value === null) {
    return <span className="font-mono text-zinc-400">null</span>;
  }
  if (typeof value === "object") {
    return (
      <pre className="max-h-56 max-w-96 min-w-48 overflow-auto font-mono text-xs leading-5 break-words whitespace-pre-wrap text-zinc-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  if (typeof value === "string") {
    return value.length ? (
      <span className="block max-h-56 max-w-96 min-w-32 overflow-auto text-xs leading-5 break-words whitespace-pre-wrap">
        {value}
      </span>
    ) : (
      <span className="font-mono text-zinc-400">&quot;&quot;</span>
    );
  }
  return (
    <span className="font-mono text-xs whitespace-nowrap">{String(value)}</span>
  );
}

export function ImportDatabaseRowTable({
  rows,
  tableName,
}: {
  rows: readonly unknown[];
  tableName: string;
}) {
  const table = normaliseImportDatabaseTable(rows);

  return (
    <DataTableShell className="rounded-none border-x-0 border-b-0 shadow-none">
      <Table className="min-w-max">
        <TableCaption>{tableName} database rows</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {table.columns.map((column) => (
              <TableHead
                className="font-mono tracking-normal normal-case"
                key={column}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {table.columns.map((column) => (
                <TableCell className="align-top" key={column}>
                  <DatabaseCellValue value={row[column]} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
