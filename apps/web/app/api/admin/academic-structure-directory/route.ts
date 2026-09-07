import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { isAcademicStructureDirectoryKind } from "@/lib/catalogue-import/anu-academic-structure-directory";
import {
  AcademicStructureDirectoryConfigurationError,
  refreshAcademicStructureDirectoryForYear,
} from "@/lib/catalogue-import/run-academic-structure-directory-refresh";

export const runtime = "nodejs";
export const maxDuration = 60;

type AcademicStructureDirectoryRequest = {
  academicYear?: unknown;
  structureKind?: unknown;
};

const encoder = new TextEncoder();

function event(data: unknown) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  if (!(await canManageCatalogueImports())) {
    return new Response(
      event({ type: "error", message: "Import permission is required." }),
      {
        status: 403,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }

  let payload: AcademicStructureDirectoryRequest;
  try {
    payload = (await request.json()) as AcademicStructureDirectoryRequest;
  } catch {
    return new Response(
      event({
        type: "error",
        message: "Invalid academic structure directory request.",
      }),
      {
        status: 400,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }

  const academicYear = Number(payload.academicYear);
  if (!isAcademicStructureDirectoryKind(payload.structureKind)) {
    return new Response(
      event({
        type: "error",
        message: "Choose programme, major, minor or specialisation.",
      }),
      {
        status: 400,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }
  const structureKind = payload.structureKind;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(event(data));
      try {
        send({ type: "started" });
        const result = await refreshAcademicStructureDirectoryForYear({
          academicYear,
          structureKind,
          onProgress: (progress) => send({ type: "progress", ...progress }),
        });
        send({ type: "complete", result });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof AcademicStructureDirectoryConfigurationError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Academic structure directory refresh failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream",
    },
  });
}
