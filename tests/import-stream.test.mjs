import assert from "node:assert/strict";
import test from "node:test";

import { readImportStream } from "../components/admin/imports/import-stream.ts";

function streamResponse(frames, init = {}) {
  return new Response(frames.join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
    ...init,
  });
}

test("reads progress only when the import stream reaches a complete event", async () => {
  const events = [];
  await readImportStream(
    streamResponse([
      'data: {"type":"progress","message":"Fetching"}\n\n',
      'data: {"type":"complete","result":{"checked":1}}\n\n',
    ]),
    (event) => events.push(event),
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ["progress", "complete"],
  );
});

test("rejects a non-OK directory refresh before reading its body as success", async () => {
  await assert.rejects(
    readImportStream(
      Response.json(
        { error: "Directory refresh is disabled." },
        { status: 503 },
      ),
      () => {},
    ),
    /Directory refresh is disabled/u,
  );
});

test("rejects EOF when a directory refresh never emits complete", async () => {
  await assert.rejects(
    readImportStream(
      streamResponse(['data: {"type":"progress","message":"Writing"}\n\n']),
      () => {},
    ),
    /ended before completion/u,
  );
});
