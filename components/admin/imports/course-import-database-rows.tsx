import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ImportDatabaseRowTable } from "@/components/admin/imports/import-database-row-table";
import type { CourseImportDatabaseTable } from "@/lib/coursemap/course-import-database-view";

export function CourseImportDatabaseRows({
  emptyLabel = "No rows",
  tables,
}: {
  emptyLabel?: string;
  tables: CourseImportDatabaseTable[];
}) {
  return (
    <div className="space-y-3">
      {tables.map((table) => (
        <Card className="overflow-hidden" key={table.name}>
          <CardHeader
            action={
              <Badge tone={table.rows.length ? "neutral" : "info"}>
                {table.rows.length || emptyLabel}
              </Badge>
            }
            title={<span className="font-mono text-sm">{table.name}</span>}
          />
          {table.rows.length ? (
            <ImportDatabaseRowTable rows={table.rows} tableName={table.name} />
          ) : (
            <p className="border-t border-zinc-200 px-5 py-4 text-xs text-zinc-500">
              This import will not write a row to this table.
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
