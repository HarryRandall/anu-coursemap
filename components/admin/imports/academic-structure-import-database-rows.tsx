"use client";

import type { AcademicStructureImportArtifact } from "@/lib/coursemap/admin-academic-structure-imports";
import {
  projectedAcademicStructureDatabaseTables,
  type AcademicStructureImportDatabaseTable,
} from "@/lib/coursemap/academic-structure-import-database-view";
import { ImportDatabaseRows } from "./import-database-rows";

export {
  persistedAcademicStructureDatabaseTables,
  projectedAcademicStructureDatabaseTables,
} from "@/lib/coursemap/academic-structure-import-database-view";
export type { AcademicStructureImportDatabaseTable } from "@/lib/coursemap/academic-structure-import-database-view";

export function AcademicStructureImportDatabaseRows({
  tables,
  artifacts = [],
}: {
  emptyLabel?: string;
  tables: AcademicStructureImportDatabaseTable[];
  artifacts?: AcademicStructureImportArtifact[];
}) {
  return (
    <ImportDatabaseRows
      tables={tables}
      artifacts={artifacts}
      endpoint="/api/admin/academic-structure-imports/artifacts"
      project={projectedAcademicStructureDatabaseTables}
    />
  );
}
