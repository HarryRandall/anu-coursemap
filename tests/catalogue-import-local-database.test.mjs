import assert from "node:assert/strict";
import test from "node:test";

import {
  assertHostedSupabaseDatabaseUrl,
  assertLoopbackDatabaseUrl,
  discoverLocalDatabaseUrl,
} from "../scripts/catalogue/lib/local-database.mjs";
import * as importer from "../scripts/catalogue/lib/importer.mjs";

const validManifest = {
  schemaVersion: 1,
  parserVersion: "local-guard-test-v1",
  catalogueYear: 2026,
  source: {
    name: "Guard test source",
    kind: "guard_test",
    baseUrl: "https://catalogue.example.test",
  },
  scope: { kind: "course_codes", courseCodes: ["COMP2100"] },
  documents: [
    {
      entityKind: "course",
      externalKey: "COMP2100",
      canonicalUrl: "https://catalogue.example.test/2026/course/COMP2100",
      fetchedAt: "2026-08-14T00:00:00.000Z",
      contentSha256: "a".repeat(64),
      course: {
        code: "COMP2100",
        title: "Software Construction",
        units: 6,
        description: "A complete local guard test course.",
        level: 2000,
        subject: "COMP",
        school: "School of Computing",
        requisites: {
          observed: true,
          rawText: null,
          rawRequisiteText: null,
          rawIncompatibilityText: null,
          linkedCourseCodes: [],
        },
      },
      offeringObserved: true,
      periods: [],
      diagnostics: [],
    },
  ],
  diagnostics: [],
};

test("accepts literal IPv4 and IPv6 loopback database URLs", async () => {
  const ipv4 = await assertLoopbackDatabaseUrl(
    "postgresql://postgres:secret@127.42.0.9:54322/postgres",
  );
  const ipv6 = await assertLoopbackDatabaseUrl(
    "postgresql://postgres:secret@[::1]:54322/postgres",
  );

  assert.equal(ipv4.hostname, "127.42.0.9");
  assert.equal(ipv6.hostname, "[::1]");
});

test("pins exact localhost to a literal loopback address", async () => {
  const databaseUrl = await assertLoopbackDatabaseUrl(
    "postgresql://postgres:secret@localhost:54322/postgres",
  );

  assert.equal(databaseUrl.hostname, "127.0.0.1");
});

test("refuses non-loopback IPs and all other hostnames", async () => {
  for (const connectionString of [
    "postgresql://postgres:secret@192.168.1.2:5432/postgres",
    "postgresql://postgres:secret@database.example.test:5432/postgres",
    "postgresql://postgres:secret@localhost.example.test:5432/postgres",
  ]) {
    await assert.rejects(
      assertLoopbackDatabaseUrl(connectionString),
      /refuses non-loopback database connections/u,
    );
  }
});

test("database URL errors never expose credentials", async () => {
  const password = "do-not-print-this-password";
  const username = "private-user-name";
  const result = await assertLoopbackDatabaseUrl(
    `postgresql://${username}:${password}@db.example.test:5432/coursemap`,
  ).catch((error) => error);

  assert.ok(result instanceof Error);
  assert.doesNotMatch(result.message, new RegExp(username, "u"));
  assert.doesNotMatch(result.message, new RegExp(password, "u"));
});

test("accepts only hosted Supabase database URLs for web imports", () => {
  const databaseUrl = assertHostedSupabaseDatabaseUrl(
    "postgresql://postgres:secret@db.example.supabase.co:5432/postgres",
  );
  assert.equal(databaseUrl.hostname, "db.example.supabase.co");

  for (const connectionString of [
    "postgresql://postgres:secret@database.example.test:5432/postgres",
    "postgresql://postgres:secret@127.0.0.1:5432/postgres",
  ]) {
    assert.throws(
      () => assertHostedSupabaseDatabaseUrl(connectionString),
      /only accepts a Supabase database connection URL/u,
    );
  }
});

test("COURSEMAP_DATABASE_URL takes precedence and localhost is pinned", async () => {
  const connectionString = await discoverLocalDatabaseUrl({
    env: {
      COURSEMAP_DATABASE_URL:
        "postgresql://postgres:postgres@localhost:54322/postgres",
      DATABASE_URL:
        "postgresql://postgres:hosted@database.example.test:5432/postgres",
    },
    readConfig: async () => {
      throw new Error("config should not be read");
    },
  });

  const databaseUrl = new URL(connectionString);
  assert.equal(databaseUrl.hostname, "127.0.0.1");
  assert.equal(databaseUrl.port, "54322");
});

test("refuses a non-loopback DATABASE_URL override", async () => {
  await assert.rejects(
    discoverLocalDatabaseUrl({
      env: {
        DATABASE_URL:
          "postgresql://postgres:hosted@database.example.test:5432/postgres",
      },
    }),
    /refuses non-loopback database connections/u,
  );
});

test("discovers the local database port from Supabase config", async () => {
  const connectionString = await discoverLocalDatabaseUrl({
    configPath: "/unused/supabase/config.toml",
    env: {},
    readConfig: async () => `
      project_id = "coursemap"

      [api]
      port = 54321

      [db]
      port = 55432 # local database
      shadow_port = 55420
    `,
  });

  const databaseUrl = new URL(connectionString);
  assert.equal(databaseUrl.hostname, "127.0.0.1");
  assert.equal(databaseUrl.port, "55432");
  assert.equal(databaseUrl.pathname, "/postgres");
  assert.equal(databaseUrl.username, "postgres");
  assert.equal(databaseUrl.password, "postgres");
});

test("rejects malformed URLs and invalid Supabase database ports", async () => {
  await assert.rejects(
    assertLoopbackDatabaseUrl("this is not a URL"),
    /database URL is invalid/u,
  );
  await assert.rejects(
    discoverLocalDatabaseUrl({
      env: {},
      readConfig: async () => "[db]\nport = 70000",
    }),
    /does not contain a valid \[db\] port/u,
  );
});

test("exposes no raw transaction bypass and rejects unverified clients", async () => {
  let beganTransaction = false;
  const unverifiedSql = Object.assign(() => undefined, {
    begin: () => {
      beganTransaction = true;
    },
  });

  assert.equal(importer.importCatalogueManifestInTransaction, undefined);
  await assert.rejects(
    importer.importCatalogueManifest(unverifiedSql, validManifest),
    /client created by createLocalDatabaseClient/u,
  );
  await assert.rejects(
    importer.withLocalCatalogueImportTransaction(unverifiedSql, () => {}),
    /client created by createLocalDatabaseClient/u,
  );
  assert.equal(beganTransaction, false);
});
