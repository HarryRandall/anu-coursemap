import { DatabaseRowsViewer } from "./database-rows-viewer";
import type { CourseImportDatabaseTable } from "@/lib/coursemap/course-import-database-view";

export function CourseImportDatabaseRows({
  tables,
}: {
  emptyLabel?: string;
  tables: CourseImportDatabaseTable[];
}) {
  return <DatabaseRowsViewer tables={tables} label="Saved database rows" />;
}
