import { canManageCatalogueImports } from "@/lib/auth/viewer";
import { recordAcademicStructureImportDispatch } from "@/lib/structure-import/import-store";
import {
  ACADEMIC_STRUCTURE_IMPORT_PARSER_VERSION,
  ACADEMIC_STRUCTURE_IMPORT_PROMPT_VERSION,
  ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION,
} from "@/lib/structure-import/prompt";
import {
  AcademicStructureImportQueueDispatchError,
  AcademicStructureImportRequestError,
  academicStructureImportQueuesEnabled,
  enqueueAcademicStructureImportTargets,
  parseAcademicStructureImportRequest,
} from "@/lib/structure-import/queue";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type CreatedAcademicStructureImportRun = {
  runId: string;
  runNumber: number;
  targets: Array<{ targetId: string; structureCode: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseReconciliationRequest(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => key !== "runId") ||
    !("runId" in value) ||
    typeof value.runId !== "string" ||
    !UUID_PATTERN.test(value.runId)
  ) {
    throw new TypeError(
      "A valid academic structure import run ID is required.",
    );
  }
  return value.runId;
}

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
  if (!(await canManageCatalogueImports())) {
    return jsonError("Import permission is required.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid academic structure import request.", 400);
  }

  let input;
  try {
    input = parseAcademicStructureImportRequest(body);
  } catch (error) {
    return jsonError(
      error instanceof AcademicStructureImportRequestError
        ? error.message
        : "Invalid academic structure import request.",
      400,
    );
  }

  let run: CreatedAcademicStructureImportRun;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "start_academic_structure_import",
      {
        p_academic_year: input.academicYear,
        p_structure_kind: input.structureKind,
        p_structure_codes: input.structureCodes,
        p_requested_model: input.requestedModel,
        p_parser_version: ACADEMIC_STRUCTURE_IMPORT_PARSER_VERSION,
        p_prompt_version: ACADEMIC_STRUCTURE_IMPORT_PROMPT_VERSION,
        p_schema_version: ACADEMIC_STRUCTURE_SNAPSHOT_SCHEMA_VERSION,
      },
    );
    if (error) throw error;
    const rows = [...(data ?? [])].sort(
      (left, right) => left.target_position - right.target_position,
    );
    const runId = rows[0]?.run_id;
    const runNumber = rows[0]?.run_number;
    if (
      !runId ||
      runNumber === undefined ||
      rows.some((row) => row.run_id !== runId || row.run_number !== runNumber)
    ) {
      throw new Error(
        "The academic structure import run did not return its targets.",
      );
    }
    run = {
      runId,
      runNumber,
      targets: rows.map((row) => ({
        targetId: row.target_id,
        structureCode: row.structure_code,
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
        databaseErrorMessage(
          error,
          "Another academic structure import is already queued or running.",
        ),
        409,
      );
    }
    return jsonError(
      "The academic structure import run could not be created.",
      500,
    );
  }

  let queued: Awaited<ReturnType<typeof enqueueAcademicStructureImportTargets>>;
  try {
    queued = await enqueueAcademicStructureImportTargets({
      runId: run.runId,
      targetIds: run.targets.map(({ targetId }) => targetId),
    });
  } catch (error) {
    if (error instanceof AcademicStructureImportQueueDispatchError) {
      let dispatchStatusRecorded = true;
      try {
        await recordAcademicStructureImportDispatch({
          runId: run.runId,
          dispatched: error.dispatched,
          failedTargetIds: error.failedTargetIds,
          errorSummary: error.message,
        });
      } catch {
        dispatchStatusRecorded = false;
      }
      return jsonError(error.message, 503, {
        runId: run.runId,
        runNumber: run.runNumber,
        status: "queued",
        enqueuedTargetIds: error.succeededTargetIds,
        failedTargetIds: error.failedTargetIds,
        dispatchStatusRecorded,
      });
    }
    try {
      await recordAcademicStructureImportDispatch({
        runId: run.runId,
        dispatched: [],
        failedTargetIds: run.targets.map(({ targetId }) => targetId),
        errorSummary: "The queue did not accept this import run.",
      });
    } catch {
      return jsonError(
        "The academic structure import run could not be queued.",
        503,
        {
          runId: run.runId,
          runNumber: run.runNumber,
          status: "queued",
          dispatchStatusRecorded: false,
        },
      );
    }
    return jsonError(
      "The academic structure import run could not be queued.",
      503,
      {
        runId: run.runId,
        runNumber: run.runNumber,
        status: "failed",
        dispatchStatusRecorded: true,
      },
    );
  }

  try {
    await recordAcademicStructureImportDispatch({
      runId: run.runId,
      dispatched: queued.map(({ message, messageId }) => ({
        targetId: message.targetId,
        messageId,
      })),
      failedTargetIds: [],
    });
  } catch {
    return jsonError(
      "The import was queued, but its dispatch metadata could not be recorded.",
      503,
      {
        runId: run.runId,
        runNumber: run.runNumber,
        status: "queued",
        enqueuedTargetIds: queued.map(({ message }) => message.targetId),
        dispatchStatusRecorded: false,
      },
    );
  }

  return Response.json(
    {
      runId: run.runId,
      runNumber: run.runNumber,
      status: "queued",
      structureKind: input.structureKind,
      targetCount: run.targets.length,
      targets: run.targets.map((target, index) => ({
        targetId: target.targetId,
        structureCode: target.structureCode,
        messageId: queued[index]!.messageId,
        status: "queued",
      })),
    },
    { status: 202, headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!academicStructureImportQueuesEnabled()) {
    return jsonError(
      "Background academic structure imports are not enabled in this deployment.",
      503,
    );
  }
  return startQueuedImport(request);
}

export async function PATCH(request: Request) {
  if (!(await canManageCatalogueImports())) {
    return jsonError("Import permission is required.", 403);
  }

  let runId: string;
  try {
    runId = parseReconciliationRequest(await request.json());
  } catch (error) {
    return jsonError(
      error instanceof TypeError
        ? error.message
        : "Invalid dispatch reconciliation request.",
      400,
    );
  }

  try {
    const supabase = await createClient();
    const untypedRpc = supabase.rpc.bind(supabase) as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: { code?: string; message?: string } | null;
    }>;
    const { data, error } = await untypedRpc(
      "reconcile_academic_structure_import_dispatch",
      { p_run_id: runId },
    );
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    if (
      typeof row !== "object" ||
      row === null ||
      !("reconciled_target_count" in row) ||
      !("run_status" in row)
    ) {
      throw new Error("Dispatch reconciliation returned an invalid result.");
    }
    return Response.json(
      {
        runId,
        reconciledTargetCount: Number(row.reconciled_target_count),
        status: String(row.run_status),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "42501") {
      return jsonError("Import permission is required.", 403);
    }
    if (code === "P0002") {
      return jsonError("Academic structure import run not found.", 404);
    }
    if (code === "22023") {
      return jsonError(
        databaseErrorMessage(error, "Invalid reconciliation request."),
        400,
      );
    }
    return jsonError(
      "The academic structure import dispatch could not be reconciled.",
      500,
    );
  }
}
