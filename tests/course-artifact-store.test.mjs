import assert from "node:assert/strict";
import test from "node:test";

import {
  COURSE_IMPORT_ARTIFACT_BUCKET,
  MAX_COURSE_IMPORT_ARTIFACT_BYTES,
  readCourseImportArtifact,
  storeCourseImportArtifact,
} from "../lib/course-import/artifact-store.ts";

function fakeStorageClient({ error = null } = {}) {
  const uploads = [];
  return {
    uploads,
    client: {
      storage: {
        from(bucket) {
          assert.equal(bucket, COURSE_IMPORT_ARTIFACT_BUCKET);
          return {
            async upload(path, body, options) {
              uploads.push({ path, body, options });
              return { data: error ? null : { path }, error };
            },
          };
        },
      },
    },
  };
}

function fakeDownloadClient(body, error = null) {
  return {
    storage: {
      from(bucket) {
        assert.equal(bucket, COURSE_IMPORT_ARTIFACT_BUCKET);
        return {
          async download(path) {
            assert.equal(path, "2026/run/target/model-response.json");
            return {
              data: error
                ? null
                : new Blob([body], { type: "application/json" }),
              error,
            };
          },
        };
      },
    },
  };
}

test("stores content-addressed private artefacts without upsert", async () => {
  const storage = fakeStorageClient();
  const stored = await storeCourseImportArtifact({
    academicYear: 2026,
    runId: "11111111-1111-4111-8111-111111111111",
    targetId: "22222222-2222-4222-8222-222222222222",
    stage: "html_capture",
    kind: "raw_html",
    mediaType: "text/html",
    body: "<main>COMP1100</main>",
    client: storage.client,
  });

  assert.equal(stored.bucket, COURSE_IMPORT_ARTIFACT_BUCKET);
  assert.match(
    stored.path,
    /^2026\/11111111-1111-4111-8111-111111111111\/22222222-2222-4222-8222-222222222222\/html_capture\/raw_html-[0-9a-f]{64}\.html$/,
  );
  assert.equal(storage.uploads.length, 1);
  assert.equal(storage.uploads[0].options.upsert, false);
  assert.equal(storage.uploads[0].options.contentType, "text/html");
});

test("treats a same-hash duplicate upload as idempotent", async () => {
  const storage = fakeStorageClient({
    error: { statusCode: "409", message: "The resource already exists" },
  });
  const result = await storeCourseImportArtifact({
    academicYear: 2026,
    runId: "11111111-1111-4111-8111-111111111111",
    targetId: "22222222-2222-4222-8222-222222222222",
    stage: "schema_validate",
    kind: "validated_json",
    mediaType: "application/json",
    body: '{"code":"COMP1100"}',
    client: storage.client,
  });
  assert.match(result.path, /validated_json-[0-9a-f]{64}\.json$/);
});

test("rejects unsupported media types and oversized artefacts before upload", async () => {
  const storage = fakeStorageClient();
  await assert.rejects(
    storeCourseImportArtifact({
      academicYear: 2026,
      runId: "run",
      targetId: "target",
      stage: "html_capture",
      kind: "raw_html",
      mediaType: "text/javascript",
      body: "alert(1)",
      client: storage.client,
    }),
    /Unsupported course import artefact media type/,
  );
  await assert.rejects(
    storeCourseImportArtifact({
      academicYear: 2026,
      runId: "run",
      targetId: "target",
      stage: "html_capture",
      kind: "raw_html",
      mediaType: "text/html",
      body: new Uint8Array(MAX_COURSE_IMPORT_ARTIFACT_BYTES + 1),
      client: storage.client,
    }),
    /5 MiB limit/,
  );
  assert.equal(storage.uploads.length, 0);
});

test("reads and verifies a private artefact before retry reuse", async () => {
  const body = '{"id":"generation-1"}';
  const contentSha256 =
    "003bdb3b8babad08194b94bf2ec5970d3b1f3b311215b324a9f3758567ce4f17";
  const artifact = {
    bucket: COURSE_IMPORT_ARTIFACT_BUCKET,
    path: "2026/run/target/model-response.json",
    mediaType: "application/json",
    byteSize: Buffer.byteLength(body),
    contentSha256,
  };

  assert.equal(
    await readCourseImportArtifact({
      artifact,
      client: fakeDownloadClient(body),
    }),
    body,
  );
  await assert.rejects(
    readCourseImportArtifact({
      artifact: { ...artifact, contentSha256: "0".repeat(64) },
      client: fakeDownloadClient(body),
    }),
    /integrity check/,
  );
});
