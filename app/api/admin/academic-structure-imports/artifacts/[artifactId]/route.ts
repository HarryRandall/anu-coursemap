import { canManageCatalogueImports } from "@/lib/auth/viewer";
import {
  COURSE_IMPORT_ARTIFACT_BUCKET,
  readCourseImportArtifact,
} from "@/lib/course-import/artifact-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  if (!(await canManageCatalogueImports())) {
    return Response.json({ error: "Not authorised." }, { status: 403 });
  }

  const { artifactId } = await params;
  const supabase = await createClient();
  const { data: artifact, error } = await supabase
    .from("academic_structure_import_artifacts")
    .select(
      "id,storage_bucket,storage_path,media_type,byte_size,content_sha256",
    )
    .eq("id", artifactId)
    .maybeSingle();
  if (error) {
    return Response.json(
      { error: "The import artefact metadata could not be loaded." },
      { status: 502 },
    );
  }
  if (!artifact) {
    return Response.json(
      { error: "Import artefact not found." },
      { status: 404 },
    );
  }
  if (artifact.storage_bucket !== COURSE_IMPORT_ARTIFACT_BUCKET) {
    return Response.json(
      { error: "The import artefact uses an unexpected storage location." },
      { status: 502 },
    );
  }

  try {
    const content = await readCourseImportArtifact({
      artifact: {
        bucket: COURSE_IMPORT_ARTIFACT_BUCKET,
        path: artifact.storage_path,
        mediaType: artifact.media_type,
        byteSize: artifact.byte_size,
        contentSha256: artifact.content_sha256,
      },
    });
    return new Response(content, {
      headers: {
        "cache-control": "private, no-store",
        "content-security-policy": "default-src 'none'; sandbox",
        "content-type": "text/plain; charset=utf-8",
        "x-content-type-options": "nosniff",
        "x-coursemap-original-media-type": artifact.media_type,
      },
    });
  } catch {
    return Response.json(
      { error: "The import artefact could not be read or verified." },
      { status: 502 },
    );
  }
}
