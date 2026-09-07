"use client";

import type { CourseImportArtifact } from "@/lib/coursemap/admin-course-imports";
import {
  projectedCourseDatabaseTables,
  type CourseImportDatabaseTable,
} from "@/lib/coursemap/course-import-database-view";
import { ImportDatabaseRows } from "./import-database-rows";

export function CourseImportDatabaseRows({
  tables,
  artifacts = [],
}: {
  emptyLabel?: string;
  tables: CourseImportDatabaseTable[];
  artifacts?: CourseImportArtifact[];
}) {
  return (
    <ImportDatabaseRows
      tables={tables}
      artifacts={artifacts}
      endpoint="/api/admin/course-imports/artifacts"
      project={projectedCourseDatabaseTables}
    />
  );
}
