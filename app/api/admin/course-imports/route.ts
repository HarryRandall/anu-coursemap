import { canManageCourseImports } from "@/lib/auth/viewer";
import { recordCourseImportDispatch } from "@/lib/course-import/import-store";
import {
  COURSE_IMPORT_PARSER_VERSION,
  COURSE_IMPORT_PROMPT_VERSION,
  COURSE_SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/course-import/prompt";
import {
  CourseImportQueueDispatchError,
  CourseImportRequestError,
  courseImportQueuesEnabled,
  enqueueCourseImportTargets,
  parseCourseImportRequest,
} from "@/lib/course-import/queue";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// This endpoint creates the durable run before dispatching any target work.

type CreatedCourseImportRun = {
  runId: string;
  targets: Array<{ targetId: string; courseCode: string }>;
};

function jsonError(
  message: string,
  status: number,
  details: Record<string, unknown> = {},
) {
  return Response.json(
    { error: message, ...details },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function databaseErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

function databaseErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }
  return fallback;
}

async function startQueuedImport(request: Request) {
  if (!(await canManageCourseImports())) {
    return jsonError("Import permission is required.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid course import request.", 400);
  }

  let input;
  try {
    input = parseCourseImportRequest(body);
  } catch (error) {
    return jsonError(
      error instanceof CourseImportRequestError
        ? error.message
        : "Invalid course import request.",
      400,
    );
  }

  let run: CreatedCourseImportRun;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("start_course_import", {
      p_academic_year: input.academicYear,
      p_course_codes: input.courseCodes,
      p_requested_model: input.requestedModel,
      p_parser_version: COURSE_IMPORT_PARSER_VERSION,
      p_prompt_version: COURSE_IMPORT_PROMPT_VERSION,
      p_schema_version: COURSE_SNAPSHOT_SCHEMA_VERSION,
    });
    if (error) throw error;
    const rows = [...(data ?? [])].sort(
      (left, right) => left.target_position - right.target_position,
    );
    const runId = rows[0]?.run_id;
    if (!runId || rows.some((row) => row.run_id !== runId)) {
      throw new Error("The course import run did not return its targets.");
    }
    run = {
      runId,
      targets: rows.map((row) => ({
        targetId: row.target_id,
        courseCode: row.course_code,
      })),
    };
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "42501") {
      return jsonError("Import permission is required.", 403);
    }
    if (code === "22023") {
      return jsonError(
        databaseErrorMessage(error, "Invalid import request."),
        400,
      );
    }
    if (code === "55000") {
      return jsonError(
        "Another course import is already queued or running.",
        409,
      );
    }
    return jsonError("The course import run could not be created.", 500);
  }

  let queued: Awaited<ReturnType<typeof enqueueCourseImportTargets>>;
  try {
    queued = await enqueueCourseImportTargets({
      runId: run.runId,
      targetIds: run.targets.map(({ targetId }) => targetId),
    });
  } catch (error) {
    if (error instanceof CourseImportQueueDispatchError) {
      let dispatchStatusRecorded = true;
      try {
        await recordCourseImportDispatch({
          runId: run.runId,
          dispatched: error.dispatched,
          failedTargetIds: error.failedTargetIds,
          errorSummary: error.message,
        });
      } catch {
        dispatchStatusRecorded = false;
        // The durable run remains available for an administrator to inspect.
        // Do not hide or delete it when recording queue metadata also fails.
      }
      return jsonError(error.message, 503, {
        runId: run.runId,
        status: "queued",
        enqueuedTargetIds: error.succeededTargetIds,
        failedTargetIds: error.failedTargetIds,
        dispatchStatusRecorded,
      });
    }
    try {
      await recordCourseImportDispatch({
        runId: run.runId,
        dispatched: [],
        failedTargetIds: run.targets.map(({ targetId }) => targetId),
        errorSummary: "The queue did not accept this import run.",
      });
    } catch {
      return jsonError("The course import run could not be queued.", 503, {
        runId: run.runId,
        status: "queued",
        dispatchStatusRecorded: false,
      });
    }
    return jsonError("The course import run could not be queued.", 503, {
      runId: run.runId,
      status: "failed",
      dispatchStatusRecorded: true,
    });
  }

  try {
    await recordCourseImportDispatch({
      runId: run.runId,
      dispatched: queued.map(({ message, messageId }) => ({
        targetId: message.targetId,
        messageId,
      })),
      failedTargetIds: [],
    });
  } catch {
    return jsonError(
      "The course import was queued, but its dispatch metadata could not be recorded.",
      503,
      {
        runId: run.runId,
        status: "queued",
        enqueuedTargetIds: queued.map(({ message }) => message.targetId),
        dispatchStatusRecorded: false,
      },
    );
  }

  return Response.json(
    {
      runId: run.runId,
      status: "queued",
      targetCount: run.targets.length,
      targets: run.targets.map((target, index) => ({
        targetId: target.targetId,
        courseCode: target.courseCode,
        messageId: queued[index]!.messageId,
        status: "queued",
      })),
    },
    { status: 202, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!courseImportQueuesEnabled()) {
    return jsonError(
      "Background course imports are not enabled in this deployment.",
      503,
    );
  }
  return startQueuedImport(request);
}
