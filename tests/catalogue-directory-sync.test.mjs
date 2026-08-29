import assert from "node:assert/strict";
import test from "node:test";

import { runDirectorySyncLocal } from "../lib/catalogue-import/run-directory-sync.ts";

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const coursePayload = {
  TotalCount: 2,
  Items: [
    {
      CourseCode: "COMP1100",
      Name: "Programming as Problem Solving",
      Career: "Undergraduate",
      Units: 6,
    },
    {
      CourseCode: "COMP1110",
      Name: "Structured Programming",
      Career: "Undergraduate",
      Units: 6,
    },
  ],
};

test("directory course sync is idempotent on a second run", async () => {
  const fetchImpl = async () => jsonResponse(coursePayload);

  const first = await runDirectorySyncLocal({
    catalogueYear: 2026,
    target: "courses",
    fetchImpl,
  });
  assert.equal(first.status, "succeeded");
  assert.equal(first.counts.checked, 2);
  assert.ok(
    first.counts.added + first.counts.unchanged + first.counts.changed === 2,
  );

  const second = await runDirectorySyncLocal({
    catalogueYear: 2026,
    target: "courses",
    fetchImpl,
  });
  assert.equal(second.status, "succeeded");
  assert.equal(second.counts.checked, 2);
  assert.equal(second.counts.added, 0);
  assert.equal(second.counts.changed, 0);
  assert.equal(second.counts.unchanged, 2);
});
