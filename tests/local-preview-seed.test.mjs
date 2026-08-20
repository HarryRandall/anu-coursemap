import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  resetLocalDatabase,
  resetLocalPreview,
} from "../scripts/local/reset-preview.mjs";
import { seedLocalPreview } from "../scripts/local/seed-preview.mjs";

test("keeps predictable preview credentials out of Supabase's default seed", async () => {
  const defaultSeed = await readFile(
    new URL("../supabase/seed.sql", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(defaultSeed, /test@test\.com/u);
  assert.doesNotMatch(defaultSeed, /encrypted_password/u);
  assert.doesNotMatch(defaultSeed, /local_mock/u);
});

test("runs the preview fixture through the verified local database client", async () => {
  const events = [];
  const sql = {
    async unsafe(seed) {
      events.push(["seed", seed]);
    },
    async end(options) {
      events.push(["end", options]);
    },
  };

  await seedLocalPreview({
    createClient: async () => sql,
    readSeed: async (path, encoding) => {
      assert.equal(
        path.pathname.endsWith("/scripts/fixtures/local-preview.sql"),
        true,
      );
      assert.equal(encoding, "utf8");
      return "select 'local preview';";
    },
  });

  assert.deepEqual(events, [
    ["seed", "select 'local preview';"],
    ["end", { timeout: 5 }],
  ]);
});

test("closes the local client when the preview fixture fails", async () => {
  let closed = false;
  const sql = {
    async unsafe() {
      throw new Error("seed failed");
    },
    async end() {
      closed = true;
    },
  };

  await assert.rejects(
    seedLocalPreview({
      createClient: async () => sql,
      readSeed: async () => "select broken;",
    }),
    /seed failed/u,
  );
  assert.equal(closed, true);
});

test("resets only the local database without applying the default seed", async () => {
  let command;
  const child = new EventEmitter();

  const result = resetLocalDatabase({
    spawnCommand(executable, args, options) {
      command = { executable, args, options };
      queueMicrotask(() => child.emit("exit", 0, null));
      return child;
    },
  });

  await result;
  assert.deepEqual(command, {
    executable: "supabase",
    args: ["db", "reset", "--local", "--no-seed"],
    options: { stdio: "inherit" },
  });
});

test("rejects forwarded reset arguments before touching Supabase", async () => {
  let resetCalled = false;

  await assert.rejects(
    resetLocalPreview({
      args: ["--linked"],
      resetDatabase: async () => {
        resetCalled = true;
      },
    }),
    /does not accept extra Supabase CLI arguments/u,
  );
  assert.equal(resetCalled, false);
});

test("applies the preview fixture only after the local reset succeeds", async () => {
  const events = [];

  await resetLocalPreview({
    resetDatabase: async () => events.push("reset"),
    seedPreview: async () => events.push("seed"),
  });

  assert.deepEqual(events, ["reset", "seed"]);
});
