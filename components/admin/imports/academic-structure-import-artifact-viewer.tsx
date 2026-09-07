import type { AcademicStructureImportArtifact } from "@/lib/coursemap/admin-academic-structure-imports";
import { ImportArtefactViewer } from "./import-artefact-viewer";

export function AcademicStructureImportArtifactViewer({
  artifacts,
}: {
  artifacts: AcademicStructureImportArtifact[];
}) {
  return (
    <ImportArtefactViewer
      artifacts={artifacts}
      endpoint="/api/admin/academic-structure-imports/artifacts"
    />
  );
}
