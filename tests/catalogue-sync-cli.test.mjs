import assert from "node:assert/strict";
import test from "node:test";

import { discoverAnuCourseCodes } from "../lib/catalogue-import/anu-course-discovery.ts";
import { parseSyncArguments } from "../scripts/catalogue/sync-anu-catalogue.mjs";

test("catalogue sync arguments default to a cautious full-catalogue run", () => {
  assert.deepEqual(parseSyncArguments([]), {
    batchSize: 20,
    catalogueYear: 2026,
    courseCodes: [],
    help: false,
    maxBatches: undefined,
    requestsPerMinute: 60,
    startOffset: 0,
  });
});

test("catalogue sync arguments de-duplicate targeted course scopes", () => {
  assert.deepEqual(
    parseSyncArguments([
      "--year",
      "2025",
      "--course",
      "comp2100",
      "--course",
      "COMP2100",
      "--course",
      "COMP1110",
      "--max-batches",
      "2",
    ]),
    {
      batchSize: 20,
      catalogueYear: 2025,
      courseCodes: ["COMP1110", "COMP2100"],
      help: false,
      maxBatches: 2,
      requestsPerMinute: 60,
      startOffset: 0,
    },
  );
});

test("catalogue sync rejects an unsafe fetch rate", () => {
  assert.throws(
    () => parseSyncArguments(["--requests-per-minute", "121"]),
    /must not exceed 120/,
  );
});

test("ANU course discovery paginates and ignores invalid records", async () => {
  const requestedPages = [];
  const fetchImpl = async (input) => {
    const url = new URL(input);
    requestedPages.push(url.searchParams.get("PageIndex"));
    return new Response(
      JSON.stringify({
        Items:
          url.searchParams.get("PageIndex") === "0"
            ? [{ CourseCode: "COMP2100" }, { CourseCode: "not-a-course" }]
            : [{ CourseCode: "COMP1110" }],
      }),
      { status: 200 },
    );
  };

  const courseCodes = await discoverAnuCourseCodes({
    catalogueYear: 2026,
    fetchImpl,
    pageSize: 2,
  });

  assert.deepEqual(requestedPages, ["0", "1"]);
  assert.deepEqual(courseCodes, ["COMP1110", "COMP2100"]);
});
