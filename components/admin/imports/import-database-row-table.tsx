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
    const serialised = JSON.stringify(value);
    return (
      <pre
        className="block h-8 max-w-[28rem] min-w-48 [scrollbar-width:thin] overflow-x-auto overflow-y-hidden py-1 font-mono text-xs leading-6 whitespace-nowrap text-zinc-700"
        title={serialised}
      >
        {serialised}
      </pre>
    );
  }
  if (typeof value === "string") {
    return value.length ? (
      <span
        className="block h-8 max-w-[28rem] min-w-32 [scrollbar-width:thin] overflow-x-auto overflow-y-hidden py-1 text-xs leading-6 whitespace-nowrap"
        title={value}
      >
        {value}
      </span>
    ) : (
      <span className="font-mono text-zinc-400">&quot;&quot;</span>
    );
  }
  return (
    <span className="block h-8 max-w-[28rem] [scrollbar-width:thin] overflow-x-auto overflow-y-hidden py-1 font-mono text-xs leading-6 whitespace-nowrap">
      {String(value)}
    </span>
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
                className="max-w-[28rem] font-mono tracking-normal normal-case"
                key={column}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, rowIndex) => (
            <TableRow className="h-12" key={rowIndex}>
              {table.columns.map((column) => (
                <TableCell
                  className="h-12 max-w-[28rem] overflow-hidden py-0 align-middle"
                  key={column}
                >
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
