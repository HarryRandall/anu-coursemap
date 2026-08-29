import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

const {
  COURSE_IMPORT_QUEUE_DELIVERY_BUDGET_MS,
  COURSE_IMPORT_QUEUE_RETENTION_SECONDS,
  COURSE_IMPORT_QUEUE_TOPIC,
  COURSE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES,
  COURSE_IMPORT_QUEUE_VISIBILITY_TIMEOUT_SECONDS,
  CourseImportQueueDispatchError,
  CourseImportQueueMessageError,
  CourseImportRequestError,
  createCourseImportQueueIdempotencyKey,
  createCourseImportQueueMessage,
  courseImportQueueInternals,
  courseImportQueuesEnabled,
  enqueueCourseImportTargets,
  parseCourseImportQueueMessage,
  parseCourseImportRequest,
} = await import("../lib/course-import/queue.ts");

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const FIRST_TARGET_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_TARGET_ID = "33333333-3333-4333-8333-333333333333";

test("normalises a course import request and applies the default model", () => {
  assert.deepEqual(
    parseCourseImportRequest(
      {
        academicYear: 2026,
        courseCodes: [" comp1100 ", "MATH1013"],
      },
      {},
    ),
    {
      academicYear: 2026,
      courseCodes: ["COMP1100", "MATH1013"],
      requestedModel: "google/gemini-3.1-flash-lite",
    },
  );
});

test("uses the first configured model as the request default", () => {
  const env = {
    COURSEMAP_OPENROUTER_MODELS:
      "anthropic/claude-haiku-4.5,google/gemini-3.1-flash-lite",
  };
  assert.equal(
    parseCourseImportRequest(
      {
        academicYear: 2026,
        courseCodes: ["COMP1100"],
      },
      env,
    ).requestedModel,
    "anthropic/claude-haiku-4.5",
  );
  assert.throws(
    () =>
      parseCourseImportRequest(
        {
          academicYear: 2026,
          courseCodes: ["COMP1100"],
        },
        { COURSEMAP_OPENROUTER_MODELS: "invalid" },
      ),
    /at least one valid OpenRouter model/,
  );
});

test("accepts one uppercase ANU course-code variant suffix", () => {
  assert.deepEqual(
    parseCourseImportRequest({
      academicYear: 2026,
      courseCodes: [" comp8900f ", "COMP8900P"],
    }).courseCodes,
    ["COMP8900F", "COMP8900P"],
  );
  assert.throws(
    () =>
      parseCourseImportRequest({
        academicYear: 2026,
        courseCodes: ["COMP8900FF"],
      }),
    /ANU format/,
  );
});

test("requires the snapshot-native academic year field", () => {
  assert.throws(
    () =>
      parseCourseImportRequest({
        catalogueYear: 2025,
        courseCodes: ["COMP1100"],
        requestedModel: "google/gemini-3.1-flash-lite",
      }),
    /Choose an academic year/,
  );
});

test("only accepts OpenRouter models configured for this deployment", () => {
  assert.equal(
    parseCourseImportRequest(
      {
        academicYear: 2026,
        courseCodes: ["COMP1100"],
        requestedModel: "google/gemini-3.1-flash",
      },
      {
        COURSEMAP_OPENROUTER_MODELS:
          "google/gemini-3.1-flash-lite,google/gemini-3.1-flash",
      },
    ).requestedModel,
    "google/gemini-3.1-flash",
  );
  assert.throws(
    () =>
      parseCourseImportRequest(
        {
          academicYear: 2026,
          courseCodes: ["COMP1100"],
          requestedModel: "unconfigured/model",
        },
        {},
      ),
    /configured OpenRouter model/,
  );
});

test("rejects out-of-range years, duplicate codes and more than ten courses", () => {
  assert.throws(
    () =>
      parseCourseImportRequest({
        academicYear: 2019,
        courseCodes: ["COMP1100"],
      }),
    CourseImportRequestError,
  );
  assert.throws(
    () =>
      parseCourseImportRequest({
        academicYear: 2026,
        courseCodes: ["COMP1100", "comp1100"],
      }),
    /each course only once/,
  );
  assert.throws(
    () =>
      parseCourseImportRequest({
        academicYear: 2026,
        courseCodes: Array.from(
          { length: 11 },
          (_, index) => `COMP${String(index).padStart(4, "0")}`,
        ),
      }),
    /no more than 10/,
  );
});

test("pins queue messages to the strict version 1 UUID contract", () => {
  const message = createCourseImportQueueMessage({
    runId: RUN_ID,
    targetId: FIRST_TARGET_ID,
  });
  assert.deepEqual(message, {
    version: 1,
    runId: RUN_ID,
    targetId: FIRST_TARGET_ID,
  });
  assert.equal(
    createCourseImportQueueIdempotencyKey(message),
    `course-import:v1:${RUN_ID}:${FIRST_TARGET_ID}`,
  );
  assert.throws(
    () => parseCourseImportQueueMessage({ ...message, version: 2 }),
    CourseImportQueueMessageError,
  );
  assert.throws(
    () => parseCourseImportQueueMessage({ ...message, unexpected: true }),
    /fields do not match/,
  );
  assert.throws(
    () =>
      parseCourseImportQueueMessage({
        version: 1,
        runId: "not-a-uuid",
        targetId: FIRST_TARGET_ID,
      }),
    /runId must be a UUID/,
  );
});

test("publishes one message per target with one-day retention and stable keys", async () => {
  const calls = [];
  const sent = await enqueueCourseImportTargets(
    {
      runId: RUN_ID,
      targetIds: [FIRST_TARGET_ID, SECOND_TARGET_ID],
    },
    async (topic, message, options) => {
      calls.push({ topic, message, options });
      return { messageId: `message-${calls.length}` };
    },
  );

  assert.equal(sent.length, 2);
  assert.equal(COURSE_IMPORT_QUEUE_RETENTION_SECONDS, 86_400);
  assert.deepEqual(
    calls.map(({ topic }) => topic),
    [COURSE_IMPORT_QUEUE_TOPIC, COURSE_IMPORT_QUEUE_TOPIC],
  );
  assert.deepEqual(
    calls.map(({ message }) => message.targetId),
    [FIRST_TARGET_ID, SECOND_TARGET_ID],
  );
  assert.ok(
    calls.every(
      ({ options }) =>
        options.retentionSeconds === COURSE_IMPORT_QUEUE_RETENTION_SECONDS,
    ),
  );
  assert.deepEqual(
    calls.map(({ options }) => options.idempotencyKey),
    [
      `course-import:v1:${RUN_ID}:${FIRST_TARGET_ID}`,
      `course-import:v1:${RUN_ID}:${SECOND_TARGET_ID}`,
    ],
  );
});

test("reports every partial dispatch without hiding the durable run", async () => {
  await assert.rejects(
    enqueueCourseImportTargets(
      {
        runId: RUN_ID,
        targetIds: [FIRST_TARGET_ID, SECOND_TARGET_ID],
      },
      async (_topic, message) => {
        if (message.targetId === SECOND_TARGET_ID) {
          throw new Error("queue unavailable");
        }
        return { messageId: "message-1" };
      },
    ),
    (error) => {
      assert.ok(error instanceof CourseImportQueueDispatchError);
      assert.deepEqual(error.succeededTargetIds, [FIRST_TARGET_ID]);
      assert.deepEqual(error.dispatched, [
        { targetId: FIRST_TARGET_ID, messageId: "message-1" },
      ]);
      assert.deepEqual(error.failedTargetIds, [SECOND_TARGET_ID]);
      return true;
    },
  );
});

test("only enables queue imports with the explicit true feature flag", () => {
  assert.equal(courseImportQueuesEnabled(undefined), false);
  assert.equal(courseImportQueuesEnabled("1"), false);
  assert.equal(courseImportQueuesEnabled(" TRUE "), false);
  assert.equal(courseImportQueuesEnabled("true"), true);
});

test("bounds infrastructure retries beyond the five paid processing attempts", () => {
  assert.deepEqual(
    courseImportQueueInternals.retryCourseImportQueueMessage(new Error("db"), {
      deliveryCount: 5,
    }),
    { afterSeconds: 80 },
  );
  assert.deepEqual(
    courseImportQueueInternals.retryCourseImportQueueMessage(new Error("db"), {
      deliveryCount: COURSE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES,
    }),
    { acknowledge: true },
  );
  assert.deepEqual(
    courseImportQueueInternals.retryCourseImportQueueMessage(
      new CourseImportQueueMessageError("invalid"),
      { deliveryCount: 1 },
    ),
    { acknowledge: true },
  );
});

test("configures the queue consumer as a private Vercel function", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  const consumer = config.functions["app/api/queues/course-import/route.ts"];

  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.equal(COURSE_IMPORT_QUEUE_DELIVERY_BUDGET_MS, 55_000);
  assert.equal(COURSE_IMPORT_QUEUE_VISIBILITY_TIMEOUT_SECONDS, 600);
  assert.equal(consumer.maxDuration, 60);
  assert.deepEqual(consumer.experimentalTriggers, [
    {
      type: "queue/v2beta",
      topic: COURSE_IMPORT_QUEUE_TOPIC,
      retryAfterSeconds: 30,
      initialDelaySeconds: 0,
    },
  ]);
});
