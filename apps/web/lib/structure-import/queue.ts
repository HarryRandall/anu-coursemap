import type { MessageMetadata, RetryDirective } from "@vercel/queue";
import {
  assertAllowedOpenRouterModel,
  configuredOpenRouterModels,
} from "../course-import/openrouter.ts";
import {
  ACADEMIC_STRUCTURE_KINDS,
  type AcademicStructureKind,
} from "./contract.ts";

export const ACADEMIC_STRUCTURE_IMPORT_QUEUE_TOPIC =
  "academic-structure-import-v1";
export const ACADEMIC_STRUCTURE_IMPORT_QUEUE_MESSAGE_VERSION = 1 as const;
export const ACADEMIC_STRUCTURE_IMPORT_QUEUE_RETENTION_SECONDS = 24 * 60 * 60;
// A target receives at most five processing attempts. Later callback
// deliveries may only reconcile durable state and must not start another paid
// extraction.
export const ACADEMIC_STRUCTURE_IMPORT_QUEUE_MAX_DELIVERIES = 5;
export const ACADEMIC_STRUCTURE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES = 12;
export const ACADEMIC_STRUCTURE_IMPORT_QUEUE_VISIBILITY_TIMEOUT_SECONDS = 600;
export const ACADEMIC_STRUCTURE_IMPORT_QUEUE_DELIVERY_BUDGET_MS = 55_000;
export const MAX_STRUCTURES_PER_IMPORT_RUN = 10;
export const MIN_IMPORTABLE_ACADEMIC_YEAR = 2020;
export const MAX_IMPORTABLE_ACADEMIC_YEAR = 2030;

const STRUCTURE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,31}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AcademicStructureImportQueueMessage = {
  version: typeof ACADEMIC_STRUCTURE_IMPORT_QUEUE_MESSAGE_VERSION;
  runId: string;
  targetId: string;
};

export type ParsedAcademicStructureImportRequest = {
  academicYear: number;
  structureKind: AcademicStructureKind;
  structureCodes: string[];
  requestedModel: string;
};

export type AcademicStructureImportQueueSend = (
  topic: string,
  message: AcademicStructureImportQueueMessage,
  options: {
    idempotencyKey: string;
    retentionSeconds: number;
  },
) => Promise<{ messageId: string | null }>;

type AcademicStructureImportRequestBody = {
  academicYear?: unknown;
  structureKind?: unknown;
  structureCodes?: unknown;
  requestedModel?: unknown;
};

export class AcademicStructureImportRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicStructureImportRequestError";
  }
}

export class AcademicStructureImportQueueMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicStructureImportQueueMessageError";
  }
}

export class AcademicStructureImportQueueDispatchError extends Error {
  readonly dispatched: Array<{ targetId: string; messageId: string | null }>;
  readonly succeededTargetIds: string[];
  readonly failedTargetIds: string[];

  constructor({
    dispatched,
    failedTargetIds,
  }: {
    dispatched: Array<{ targetId: string; messageId: string | null }>;
    failedTargetIds: string[];
  }) {
    super(
      `Queued ${dispatched.length} academic structure import target${
        dispatched.length === 1 ? "" : "s"
      }, but ${failedTargetIds.length} could not be queued.`,
    );
    this.name = "AcademicStructureImportQueueDispatchError";
    this.dispatched = dispatched;
    this.succeededTargetIds = dispatched.map(({ targetId }) => targetId);
    this.failedTargetIds = failedTargetIds;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAcademicYear(body: AcademicStructureImportRequestBody) {
  const academicYear = body.academicYear;
  if (
    !Number.isInteger(academicYear) ||
    Number(academicYear) < MIN_IMPORTABLE_ACADEMIC_YEAR ||
    Number(academicYear) > MAX_IMPORTABLE_ACADEMIC_YEAR
  ) {
    throw new AcademicStructureImportRequestError(
      `Choose an academic year from ${MIN_IMPORTABLE_ACADEMIC_YEAR} to ${MAX_IMPORTABLE_ACADEMIC_YEAR}.`,
    );
  }
  return Number(academicYear);
}

function parseStructureKind(value: unknown): AcademicStructureKind {
  const normalised =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!ACADEMIC_STRUCTURE_KINDS.includes(normalised as AcademicStructureKind)) {
    throw new AcademicStructureImportRequestError(
      "Choose programmes, majors, minors or specialisations to import.",
    );
  }
  return normalised as AcademicStructureKind;
}

function parseStructureCodes(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AcademicStructureImportRequestError(
      "Choose one or more academic structures to import.",
    );
  }
  if (value.length > MAX_STRUCTURES_PER_IMPORT_RUN) {
    throw new AcademicStructureImportRequestError(
      `Choose no more than ${MAX_STRUCTURES_PER_IMPORT_RUN} academic structures per import run.`,
    );
  }
  if (value.some((code) => typeof code !== "string")) {
    throw new AcademicStructureImportRequestError(
      "Every academic structure code must be text.",
    );
  }

  const structureCodes = value.map((code) => String(code).trim().toUpperCase());
  if (structureCodes.some((code) => !STRUCTURE_CODE_PATTERN.test(code))) {
    throw new AcademicStructureImportRequestError(
      "Every academic structure code must use the ANU format, such as BCOMP or SOFT-MAJ.",
    );
  }
  if (new Set(structureCodes).size !== structureCodes.length) {
    throw new AcademicStructureImportRequestError(
      "Choose each academic structure only once per import run.",
    );
  }
  return structureCodes;
}

function parseRequestedModel(value: unknown, env: NodeJS.ProcessEnv) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    const defaultModel = configuredOpenRouterModels(env)[0];
    if (!defaultModel) {
      throw new AcademicStructureImportRequestError(
        "Configure at least one valid OpenRouter model.",
      );
    }
    return defaultModel;
  }
  if (typeof value !== "string") {
    throw new AcademicStructureImportRequestError(
      "The requested model must be text.",
    );
  }
  const requestedModel = value.trim();
  if (requestedModel.length === 0 || requestedModel.length > 120) {
    throw new AcademicStructureImportRequestError(
      "Choose a valid OpenRouter model identifier.",
    );
  }
  try {
    return assertAllowedOpenRouterModel(requestedModel, env);
  } catch {
    throw new AcademicStructureImportRequestError(
      "Choose a configured OpenRouter model.",
    );
  }
}

export function parseAcademicStructureImportRequest(
  value: unknown,
  env: NodeJS.ProcessEnv = process.env,
): ParsedAcademicStructureImportRequest {
  if (!isRecord(value)) {
    throw new AcademicStructureImportRequestError(
      "Invalid academic structure import request.",
    );
  }
  const body = value as AcademicStructureImportRequestBody;
  return {
    academicYear: parseAcademicYear(body),
    structureKind: parseStructureKind(body.structureKind),
    structureCodes: parseStructureCodes(body.structureCodes),
    requestedModel: parseRequestedModel(body.requestedModel, env),
  };
}

export function parseAcademicStructureImportQueueMessage(
  value: unknown,
): AcademicStructureImportQueueMessage {
  if (!isRecord(value)) {
    throw new AcademicStructureImportQueueMessageError(
      "Academic structure import queue messages must be objects.",
    );
  }
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "runId,targetId,version") {
    throw new AcademicStructureImportQueueMessageError(
      "Academic structure import queue message fields do not match version 1.",
    );
  }
  if (value.version !== ACADEMIC_STRUCTURE_IMPORT_QUEUE_MESSAGE_VERSION) {
    throw new AcademicStructureImportQueueMessageError(
      "Unsupported academic structure import queue message version.",
    );
  }
  if (typeof value.runId !== "string" || !UUID_PATTERN.test(value.runId)) {
    throw new AcademicStructureImportQueueMessageError(
      "Academic structure import queue runId must be a UUID.",
    );
  }
  if (
    typeof value.targetId !== "string" ||
    !UUID_PATTERN.test(value.targetId)
  ) {
    throw new AcademicStructureImportQueueMessageError(
      "Academic structure import queue targetId must be a UUID.",
    );
  }
  return {
    version: ACADEMIC_STRUCTURE_IMPORT_QUEUE_MESSAGE_VERSION,
    runId: value.runId,
    targetId: value.targetId,
  };
}

export function createAcademicStructureImportQueueMessage({
  runId,
  targetId,
}: {
  runId: string;
  targetId: string;
}): AcademicStructureImportQueueMessage {
  return parseAcademicStructureImportQueueMessage({
    version: ACADEMIC_STRUCTURE_IMPORT_QUEUE_MESSAGE_VERSION,
    runId,
    targetId,
  });
}

export function createAcademicStructureImportQueueIdempotencyKey(
  message: AcademicStructureImportQueueMessage,
) {
  const parsed = parseAcademicStructureImportQueueMessage(message);
  return `academic-structure-import:v${parsed.version}:${parsed.runId}:${parsed.targetId}`;
}

export function academicStructureImportQueuesEnabled(
  value = process.env.COURSEMAP_QUEUE_IMPORTS_ENABLED,
) {
  return value === "true";
}

async function sendWithVercelQueue(
  topic: string,
  message: AcademicStructureImportQueueMessage,
  options: { idempotencyKey: string; retentionSeconds: number },
) {
  const { send } = await import("@vercel/queue");
  return send(topic, message, options);
}

export async function enqueueAcademicStructureImportTargets(
  {
    runId,
    targetIds,
  }: {
    runId: string;
    targetIds: readonly string[];
  },
  send: AcademicStructureImportQueueSend = sendWithVercelQueue,
) {
  if (
    targetIds.length === 0 ||
    targetIds.length > MAX_STRUCTURES_PER_IMPORT_RUN
  ) {
    throw new RangeError(
      `An academic structure import run must contain 1 to ${MAX_STRUCTURES_PER_IMPORT_RUN} targets.`,
    );
  }
  if (new Set(targetIds).size !== targetIds.length) {
    throw new TypeError(
      "An academic structure import target may only be queued once.",
    );
  }

  const messages = targetIds.map((targetId) =>
    createAcademicStructureImportQueueMessage({ runId, targetId }),
  );
  const results = await Promise.allSettled(
    messages.map(async (message) => {
      const result = await send(
        ACADEMIC_STRUCTURE_IMPORT_QUEUE_TOPIC,
        message,
        {
          idempotencyKey:
            createAcademicStructureImportQueueIdempotencyKey(message),
          retentionSeconds: ACADEMIC_STRUCTURE_IMPORT_QUEUE_RETENTION_SECONDS,
        },
      );
      return { message, messageId: result.messageId };
    }),
  );

  const sent = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const failedTargetIds = results.flatMap((result, index) =>
    result.status === "rejected" ? [messages[index]!.targetId] : [],
  );
  if (failedTargetIds.length > 0) {
    throw new AcademicStructureImportQueueDispatchError({
      dispatched: sent.map(({ message, messageId }) => ({
        targetId: message.targetId,
        messageId,
      })),
      failedTargetIds,
    });
  }
  return sent;
}

function retryAcademicStructureImportQueueMessage(
  error: unknown,
  metadata: MessageMetadata,
): RetryDirective {
  if (error instanceof AcademicStructureImportQueueMessageError) {
    return { acknowledge: true } as const;
  }
  if (
    metadata.deliveryCount >=
    ACADEMIC_STRUCTURE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES
  ) {
    return { acknowledge: true } as const;
  }
  return {
    afterSeconds: Math.min(300, 5 * 2 ** (metadata.deliveryCount - 1)),
  };
}

export const academicStructureImportQueueInternals = {
  retryAcademicStructureImportQueueMessage,
};

export function createAcademicStructureImportQueueConsumer(
  processTarget: (input: {
    runId: string;
    targetId: string;
    messageId?: string;
    deliveryCount: number;
    maxDeliveries: number;
    signal: AbortSignal;
  }) => void | Promise<void>,
) {
  return async (request: Request) => {
    const { handleCallback } = await import("@vercel/queue");
    const consume = handleCallback<unknown>(
      async (value, metadata) => {
        const message = parseAcademicStructureImportQueueMessage(value);
        const signal = AbortSignal.timeout(
          ACADEMIC_STRUCTURE_IMPORT_QUEUE_DELIVERY_BUDGET_MS,
        );
        await processTarget({
          runId: message.runId,
          targetId: message.targetId,
          messageId: metadata.messageId,
          deliveryCount: metadata.deliveryCount,
          maxDeliveries: ACADEMIC_STRUCTURE_IMPORT_QUEUE_MAX_DELIVERIES,
          signal,
        });
      },
      {
        visibilityTimeoutSeconds:
          ACADEMIC_STRUCTURE_IMPORT_QUEUE_VISIBILITY_TIMEOUT_SECONDS,
        retry: retryAcademicStructureImportQueueMessage,
      },
    );
    return consume(request);
  };
}
