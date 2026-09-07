import { canManageCourseImports } from "@/lib/auth/viewer";
import { readCourseImportArtifact } from "@/lib/course-import/artifact-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  if (!(await canManageCourseImports())) {
    return Response.json({ error: "Not authorised." }, { status: 403 });
  }

  const { artifactId } = await params;
  const supabase = await createClient();
  const { data: artifact, error } = await supabase
    .from("course_import_artifacts")
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

  try {
    const content = await readCourseImportArtifact({
      artifact: {
        bucket: artifact.storage_bucket as "course-import-artifacts",
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
