import type { CourseImportArtifact } from "@/lib/coursemap/admin-course-imports";
import { ImportArtefactViewer } from "./import-artefact-viewer";

export function CourseImportArtifactViewer({
  artifacts,
}: {
  artifacts: CourseImportArtifact[];
}) {
  return (
    <ImportArtefactViewer
      artifacts={artifacts}
      endpoint="/api/admin/course-imports/artifacts"
    />
  );
}
