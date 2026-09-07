import { canManageCourseImports } from "@/lib/auth/viewer";
import {
  CourseDirectoryConfigurationError,
  refreshCourseDirectoryForYear,
} from "@/lib/catalogue-import/run-course-directory-refresh";

export const runtime = "nodejs";
export const maxDuration = 60;

type CourseDirectoryRequest = {
  academicYear?: unknown;
};

const encoder = new TextEncoder();

function event(data: unknown) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  if (!(await canManageCourseImports())) {
    return new Response(
      event({ type: "error", message: "Import permission is required." }),
      {
        status: 403,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }

  let payload: CourseDirectoryRequest;
  try {
    payload = (await request.json()) as CourseDirectoryRequest;
  } catch {
    return new Response(
      event({ type: "error", message: "Invalid course directory request." }),
      {
        status: 400,
        headers: { "content-type": "text/event-stream" },
      },
    );
  }

  const academicYear = Number(payload.academicYear);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(event(data));
      try {
        send({ type: "started" });
        const result = await refreshCourseDirectoryForYear({
          academicYear,
          onProgress: (progress) => send({ type: "progress", ...progress }),
        });
        send({ type: "complete", result });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof CourseDirectoryConfigurationError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Course directory refresh failed.",
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
