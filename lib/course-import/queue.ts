import {
  handleCallback,
  send as sendVercelQueueMessage,
  type MessageMetadata,
  type RetryDirective,
} from "@vercel/queue";
import {
  assertAllowedOpenRouterModel,
  configuredOpenRouterModels,
} from "./openrouter.ts";

export const COURSE_IMPORT_QUEUE_TOPIC = "course-import-v1";
export const COURSE_IMPORT_QUEUE_MESSAGE_VERSION = 1 as const;
export const COURSE_IMPORT_QUEUE_RETENTION_SECONDS = 24 * 60 * 60;
// A course receives at most five processing attempts. Later queue deliveries
// exist only to finish or recover durable database state after an
// infrastructure failure, so they must not trigger another paid extraction.
export const COURSE_IMPORT_QUEUE_MAX_DELIVERIES = 5;
export const COURSE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES = 12;
export const COURSE_IMPORT_QUEUE_VISIBILITY_TIMEOUT_SECONDS = 600;
export const COURSE_IMPORT_QUEUE_DELIVERY_BUDGET_MS = 55_000;
export const MAX_COURSES_PER_IMPORT_RUN = 10;
export const MIN_IMPORTABLE_ACADEMIC_YEAR = 2020;
export const MAX_IMPORTABLE_ACADEMIC_YEAR = 2030;

const COURSE_CODE_PATTERN = /^[A-Z]{4}\d{4}[A-Z]?$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CourseImportQueueMessage = {
  version: typeof COURSE_IMPORT_QUEUE_MESSAGE_VERSION;
  runId: string;
  targetId: string;
};

export type ParsedCourseImportRequest = {
  academicYear: number;
  courseCodes: string[];
  requestedModel: string;
};

export type CourseImportQueueSend = (
  topic: string,
  message: CourseImportQueueMessage,
  options: {
    idempotencyKey: string;
    retentionSeconds: number;
  },
) => Promise<{ messageId: string | null }>;

type CourseImportRequestBody = {
  academicYear?: unknown;
  courseCodes?: unknown;
  requestedModel?: unknown;
};

export class CourseImportRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseImportRequestError";
  }
}

export class CourseImportQueueMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseImportQueueMessageError";
  }
}

export class CourseImportQueueDispatchError extends Error {
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
      `Queued ${dispatched.length} course import target${
        dispatched.length === 1 ? "" : "s"
      }, but ${failedTargetIds.length} could not be queued.`,
    );
    this.name = "CourseImportQueueDispatchError";
    this.dispatched = dispatched;
    this.succeededTargetIds = dispatched.map(({ targetId }) => targetId);
    this.failedTargetIds = failedTargetIds;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAcademicYear(body: CourseImportRequestBody) {
  const academicYear = body.academicYear;
  if (
    !Number.isInteger(academicYear) ||
    Number(academicYear) < MIN_IMPORTABLE_ACADEMIC_YEAR ||
    Number(academicYear) > MAX_IMPORTABLE_ACADEMIC_YEAR
  ) {
    throw new CourseImportRequestError(
      `Choose an academic year from ${MIN_IMPORTABLE_ACADEMIC_YEAR} to ${MAX_IMPORTABLE_ACADEMIC_YEAR}.`,
    );
  }
  return Number(academicYear);
}

function parseCourseCodes(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CourseImportRequestError("Choose one or more courses to import.");
  }
  if (value.length > MAX_COURSES_PER_IMPORT_RUN) {
    throw new CourseImportRequestError(
      `Choose no more than ${MAX_COURSES_PER_IMPORT_RUN} courses per import run.`,
    );
  }
  if (value.some((courseCode) => typeof courseCode !== "string")) {
    throw new CourseImportRequestError("Every course code must be text.");
  }

  const courseCodes = value.map((courseCode) =>
    String(courseCode).trim().toUpperCase(),
  );
  if (courseCodes.some((courseCode) => !COURSE_CODE_PATTERN.test(courseCode))) {
    throw new CourseImportRequestError(
      "Every course code must use the ANU format, such as COMP1100.",
    );
  }
  if (new Set(courseCodes).size !== courseCodes.length) {
    throw new CourseImportRequestError(
      "Choose each course only once per import run.",
    );
  }
  return courseCodes;
}

function parseRequestedModel(value: unknown, env: NodeJS.ProcessEnv) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    const defaultModel = configuredOpenRouterModels(env)[0];
    if (!defaultModel) {
      throw new CourseImportRequestError(
        "Configure at least one valid OpenRouter model.",
      );
    }
    return defaultModel;
  }
  if (typeof value !== "string") {
    throw new CourseImportRequestError("The requested model must be text.");
  }
  const requestedModel = value.trim();
  if (requestedModel.length === 0 || requestedModel.length > 120) {
    throw new CourseImportRequestError(
      "Choose a valid OpenRouter model identifier.",
    );
  }
  try {
    return assertAllowedOpenRouterModel(requestedModel, env);
  } catch {
    throw new CourseImportRequestError("Choose a configured OpenRouter model.");
  }
}

export function parseCourseImportRequest(
  value: unknown,
  env: NodeJS.ProcessEnv = process.env,
): ParsedCourseImportRequest {
  if (!isRecord(value)) {
    throw new CourseImportRequestError("Invalid course import request.");
  }
  const body = value as CourseImportRequestBody;
  return {
    academicYear: parseAcademicYear(body),
    courseCodes: parseCourseCodes(body.courseCodes),
    requestedModel: parseRequestedModel(body.requestedModel, env),
  };
}

export function parseCourseImportQueueMessage(
  value: unknown,
): CourseImportQueueMessage {
  if (!isRecord(value)) {
    throw new CourseImportQueueMessageError(
      "Course import queue messages must be objects.",
    );
  }
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "runId,targetId,version") {
    throw new CourseImportQueueMessageError(
      "Course import queue message fields do not match version 1.",
    );
  }
  if (value.version !== COURSE_IMPORT_QUEUE_MESSAGE_VERSION) {
    throw new CourseImportQueueMessageError(
      "Unsupported course import queue message version.",
    );
  }
  if (typeof value.runId !== "string" || !UUID_PATTERN.test(value.runId)) {
    throw new CourseImportQueueMessageError(
      "Course import queue runId must be a UUID.",
    );
  }
  if (
    typeof value.targetId !== "string" ||
    !UUID_PATTERN.test(value.targetId)
  ) {
    throw new CourseImportQueueMessageError(
      "Course import queue targetId must be a UUID.",
    );
  }
  return {
    version: COURSE_IMPORT_QUEUE_MESSAGE_VERSION,
    runId: value.runId,
    targetId: value.targetId,
  };
}

export function createCourseImportQueueMessage({
  runId,
  targetId,
}: {
  runId: string;
  targetId: string;
}): CourseImportQueueMessage {
  return parseCourseImportQueueMessage({
    version: COURSE_IMPORT_QUEUE_MESSAGE_VERSION,
    runId,
    targetId,
  });
}

export function createCourseImportQueueIdempotencyKey(
  message: CourseImportQueueMessage,
) {
  const parsed = parseCourseImportQueueMessage(message);
  return `course-import:v${parsed.version}:${parsed.runId}:${parsed.targetId}`;
}

export function courseImportQueuesEnabled(
  value = process.env.COURSEMAP_QUEUE_IMPORTS_ENABLED,
) {
  return value === "true";
}

async function sendWithVercelQueue(
  topic: string,
  message: CourseImportQueueMessage,
  options: {
    idempotencyKey: string;
    retentionSeconds: number;
  },
) {
  return sendVercelQueueMessage(topic, message, options);
}

export async function enqueueCourseImportTargets(
  {
    runId,
    targetIds,
  }: {
    runId: string;
    targetIds: readonly string[];
  },
  send: CourseImportQueueSend = sendWithVercelQueue,
) {
  if (targetIds.length === 0 || targetIds.length > MAX_COURSES_PER_IMPORT_RUN) {
    throw new RangeError(
      `A course import run must contain 1 to ${MAX_COURSES_PER_IMPORT_RUN} targets.`,
    );
  }
  if (new Set(targetIds).size !== targetIds.length) {
    throw new TypeError("A course import target may only be queued once.");
  }

  const messages = targetIds.map((targetId) =>
    createCourseImportQueueMessage({ runId, targetId }),
  );
  const results = await Promise.allSettled(
    messages.map(async (message) => {
      const result = await send(COURSE_IMPORT_QUEUE_TOPIC, message, {
        idempotencyKey: createCourseImportQueueIdempotencyKey(message),
        retentionSeconds: COURSE_IMPORT_QUEUE_RETENTION_SECONDS,
      });
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
    throw new CourseImportQueueDispatchError({
      dispatched: sent.map(({ message, messageId }) => ({
        targetId: message.targetId,
        messageId,
      })),
      failedTargetIds,
    });
  }
  return sent;
}

function retryCourseImportQueueMessage(
  error: unknown,
  metadata: MessageMetadata,
): RetryDirective {
  if (error instanceof CourseImportQueueMessageError) {
    return { acknowledge: true } as const;
  }
  if (metadata.deliveryCount >= COURSE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES) {
    return { acknowledge: true } as const;
  }
  return {
    afterSeconds: Math.min(300, 5 * 2 ** (metadata.deliveryCount - 1)),
  };
}

export const courseImportQueueInternals = {
  retryCourseImportQueueMessage,
};

export function createCourseImportQueueConsumer(
  processTarget: (input: {
    runId: string;
    targetId: string;
    messageId?: string;
    deliveryCount: number;
    maxDeliveries: number;
    signal: AbortSignal;
  }) => void | Promise<void>,
) {
  return handleCallback<unknown>(
    async (value, metadata) => {
      // The feature flag stops new runs at the publishing route. A private
      // queue consumer must still drain work that was accepted before the flag
      // changed, otherwise a queued run can hold the single-active-run lock
      // indefinitely.
      const message = parseCourseImportQueueMessage(value);
      const signal = AbortSignal.timeout(
        COURSE_IMPORT_QUEUE_DELIVERY_BUDGET_MS,
      );
      await processTarget({
        runId: message.runId,
        targetId: message.targetId,
        messageId: metadata.messageId,
        deliveryCount: metadata.deliveryCount,
        maxDeliveries: COURSE_IMPORT_QUEUE_MAX_DELIVERIES,
        signal,
      });
    },
    {
      visibilityTimeoutSeconds: COURSE_IMPORT_QUEUE_VISIBILITY_TIMEOUT_SECONDS,
      retry: retryCourseImportQueueMessage,
    },
  );
}
