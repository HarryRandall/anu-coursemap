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
  ACADEMIC_STRUCTURE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES,
  ACADEMIC_STRUCTURE_IMPORT_QUEUE_RETENTION_SECONDS,
  ACADEMIC_STRUCTURE_IMPORT_QUEUE_TOPIC,
  AcademicStructureImportQueueDispatchError,
  AcademicStructureImportQueueMessageError,
  AcademicStructureImportRequestError,
  academicStructureImportQueueInternals,
  academicStructureImportQueuesEnabled,
  createAcademicStructureImportQueueIdempotencyKey,
  createAcademicStructureImportQueueMessage,
  enqueueAcademicStructureImportTargets,
  parseAcademicStructureImportQueueMessage,
  parseAcademicStructureImportRequest,
} = await import("../lib/structure-import/queue.ts");

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const FIRST_TARGET_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_TARGET_ID = "33333333-3333-4333-8333-333333333333";

const [storeSource, persistenceSource, routeSource, migrationSource] =
  await Promise.all([
    readFile(
      new URL("../lib/structure-import/import-store.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../lib/structure-import/persist-snapshot.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/api/admin/academic-structure-imports/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../supabase/migrations/20260830020724_academic_structure_import_pipeline.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

test("normalises one homogeneous structure import request", () => {
  assert.deepEqual(
    parseAcademicStructureImportRequest(
      {
        academicYear: 2026,
        structureKind: "major",
        structureCodes: [" soft-maj ", "COMP-MAJ"],
      },
      {},
    ),
    {
      academicYear: 2026,
      structureKind: "major",
      structureCodes: ["SOFT-MAJ", "COMP-MAJ"],
      requestedModel: "google/gemini-3.1-flash-lite",
    },
  );
});

test("requires a supported structure kind and importable year", () => {
  assert.throws(
    () =>
      parseAcademicStructureImportRequest({
        academicYear: 2026,
        structureKind: "course",
        structureCodes: ["COMP1100"],
      }),
    AcademicStructureImportRequestError,
  );
  assert.throws(
    () =>
      parseAcademicStructureImportRequest({
        academicYear: 2031,
        structureKind: "programme",
        structureCodes: ["BCOMP"],
      }),
    /academic year from 2020 to 2030/,
  );
});

test("rejects invalid, duplicate and oversized selections", () => {
  assert.throws(
    () =>
      parseAcademicStructureImportRequest({
        academicYear: 2026,
        structureKind: "programme",
        structureCodes: ["BCOMP", " bcomp "],
      }),
    /only once/,
  );
  assert.throws(
    () =>
      parseAcademicStructureImportRequest({
        academicYear: 2026,
        structureKind: "minor",
        structureCodes: ["invalid code"],
      }),
    /ANU format/,
  );
  assert.throws(
    () =>
      parseAcademicStructureImportRequest({
        academicYear: 2026,
        structureKind: "specialisation",
        structureCodes: Array.from(
          { length: 11 },
          (_, index) => `SPEC-${index}`,
        ),
      }),
    /no more than 10/,
  );
});

test("uses only configured OpenRouter models", () => {
  const env = {
    COURSEMAP_OPENROUTER_MODELS:
      "anthropic/claude-haiku-4.5,google/gemini-3.1-flash-lite",
  };
  assert.equal(
    parseAcademicStructureImportRequest(
      {
        academicYear: 2026,
        structureKind: "programme",
        structureCodes: ["BCOMP"],
      },
      env,
    ).requestedModel,
    "anthropic/claude-haiku-4.5",
  );
  assert.throws(
    () =>
      parseAcademicStructureImportRequest(
        {
          academicYear: 2026,
          structureKind: "programme",
          structureCodes: ["BCOMP"],
          requestedModel: "unconfigured/model",
        },
        env,
      ),
    /configured OpenRouter model/,
  );
});

test("pins queue messages to the strict version 1 UUID contract", () => {
  const message = createAcademicStructureImportQueueMessage({
    runId: RUN_ID,
    targetId: FIRST_TARGET_ID,
  });
  assert.deepEqual(message, {
    version: 1,
    runId: RUN_ID,
    targetId: FIRST_TARGET_ID,
  });
  assert.equal(
    createAcademicStructureImportQueueIdempotencyKey(message),
    `academic-structure-import:v1:${RUN_ID}:${FIRST_TARGET_ID}`,
  );
  assert.throws(
    () => parseAcademicStructureImportQueueMessage({ ...message, version: 2 }),
    AcademicStructureImportQueueMessageError,
  );
  assert.throws(
    () =>
      parseAcademicStructureImportQueueMessage({
        ...message,
        structureKind: "programme",
      }),
    /fields do not match/,
  );
});

test("publishes one durable message per target", async () => {
  const calls = [];
  const sent = await enqueueAcademicStructureImportTargets(
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
  assert.equal(ACADEMIC_STRUCTURE_IMPORT_QUEUE_RETENTION_SECONDS, 86_400);
  assert.ok(
    calls.every(({ topic }) => topic === ACADEMIC_STRUCTURE_IMPORT_QUEUE_TOPIC),
  );
  assert.deepEqual(
    calls.map(({ options }) => options.idempotencyKey),
    [
      `academic-structure-import:v1:${RUN_ID}:${FIRST_TARGET_ID}`,
      `academic-structure-import:v1:${RUN_ID}:${SECOND_TARGET_ID}`,
    ],
  );
});

test("reports partial dispatch while preserving successful deliveries", async () => {
  await assert.rejects(
    enqueueAcademicStructureImportTargets(
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
      assert.ok(error instanceof AcademicStructureImportQueueDispatchError);
      assert.deepEqual(error.succeededTargetIds, [FIRST_TARGET_ID]);
      assert.deepEqual(error.dispatched, [
        { targetId: FIRST_TARGET_ID, messageId: "message-1" },
      ]);
      assert.deepEqual(error.failedTargetIds, [SECOND_TARGET_ID]);
      return true;
    },
  );
});

test("uses the existing explicit import queue feature flag", () => {
  assert.equal(academicStructureImportQueuesEnabled(undefined), false);
  assert.equal(academicStructureImportQueuesEnabled("TRUE"), false);
  assert.equal(academicStructureImportQueuesEnabled("true"), true);
});

test("acknowledges invalid messages and bounds infrastructure retries", () => {
  assert.deepEqual(
    academicStructureImportQueueInternals.retryAcademicStructureImportQueueMessage(
      new Error("db"),
      { deliveryCount: 5 },
    ),
    { afterSeconds: 80 },
  );
  assert.deepEqual(
    academicStructureImportQueueInternals.retryAcademicStructureImportQueueMessage(
      new Error("db"),
      {
        deliveryCount: ACADEMIC_STRUCTURE_IMPORT_QUEUE_MAX_CALLBACK_DELIVERIES,
      },
    ),
    { acknowledge: true },
  );
  assert.deepEqual(
    academicStructureImportQueueInternals.retryAcademicStructureImportQueueMessage(
      new AcademicStructureImportQueueMessageError("invalid"),
      { deliveryCount: 1 },
    ),
    { acknowledge: true },
  );
});

test("fences every durable worker mutation to the current live lease", () => {
  assert.ok(
    storeSource.match(/targets\.queue_message_id = \$\{messageId\}/g).length >=
      6,
  );
  assert.ok(
    storeSource.match(/targets\.lease_expires_at > statement_timestamp\(\)/g)
      .length >= 6,
  );
  assert.match(storeSource, /with active_lease as materialized/);
  assert.match(storeSource, /for update of runs/);
  assert.match(
    persistenceSource,
    /targets\.lock_version = \$\{expectedLockVersion\}[\s\S]*for update/,
  );
  assert.match(
    persistenceSource,
    /and lease_expires_at > statement_timestamp\(\)/,
  );
});

test("exposes bounded administrator reconciliation for stranded dispatches", () => {
  assert.match(routeSource, /export async function PATCH/);
  assert.match(routeSource, /reconcile_academic_structure_import_dispatch/);
  assert.match(
    migrationSource,
    /created_at <= statement_timestamp\(\) - interval '5 minutes'/,
  );
  assert.match(migrationSource, /QUEUE_DISPATCH_STALE/);
});

test("keeps programme planning to explicit major options with usable duration data", () => {
  assert.match(
    migrationSource,
    /relationships\.relationship_kind in \('required', 'option'\)/,
  );
  assert.match(
    migrationSource,
    /conditions\.condition_kind = 'structure_list'/,
  );
  assert.match(
    migrationSource,
    /The selected major is not an explicit option for that programme\./,
  );
  assert.match(
    migrationSource,
    /The selected programme does not include duration or unit information for planning\./,
  );
});
