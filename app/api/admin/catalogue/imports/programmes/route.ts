import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { CatalogueImportConfigurationError } from "@/lib/catalogue-import/run-selected-course-import";
import { runSelectedProgrammeImport } from "@/lib/catalogue-import/run-selected-programme-import";

export const runtime = "nodejs";
export const maxDuration = 300;

type ImportRequest = { catalogueYear?: unknown; programmeCodes?: unknown };
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
  let payload: ImportRequest;
  try {
    payload = (await request.json()) as ImportRequest;
  } catch {
    return new Response(
      event({ type: "error", message: "Invalid import request." }),
      {
        status: 400,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }

  const catalogueYear = Number(payload.catalogueYear);
  const programmeCodes = Array.isArray(payload.programmeCodes)
    ? payload.programmeCodes.filter(
        (code): code is string => typeof code === "string",
      )
    : [];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(event(data));
      try {
        send({ type: "started" });
        const result = await runSelectedProgrammeImport({
          catalogueYear,
          programmeCodes,
          onProgress: (progress) => send({ type: "progress", ...progress }),
        });
        send({ type: "complete", result });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof CatalogueImportConfigurationError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Programme import failed.",
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
