import { canManageCatalogueImports } from "@/lib/auth/viewer";
import {
  CatalogueImportConfigurationError,
  runDirectorySync,
  type DirectorySyncTarget,
} from "@/lib/catalogue-import/run-directory-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

type DirectoryRequest = {
  catalogueYear?: unknown;
  target?: unknown;
};

const encoder = new TextEncoder();

function event(data: unknown) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function parseTarget(value: unknown): DirectorySyncTarget | null {
  return value === "courses" || value === "programmes" ? value : null;
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

  let payload: DirectoryRequest;
  try {
    payload = (await request.json()) as DirectoryRequest;
  } catch {
    return new Response(
      event({ type: "error", message: "Invalid directory sync request." }),
      {
        status: 400,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }

  const catalogueYear = Number(payload.catalogueYear);
  const target = parseTarget(payload.target);
  if (!target) {
    return new Response(
      event({
        type: "error",
        message: "Choose courses or programmes for the directory refresh.",
      }),
      {
        status: 400,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(event(data));
      try {
        send({ type: "started", target });
        const result = await runDirectorySync({
          catalogueYear,
          target,
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
                : "Directory sync failed.",
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
