import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnuCourseSearchUrl,
  fetchAnuCourseDirectory,
  parseAnuCourseDirectory,
} from "../lib/catalogue-import/anu-course-directory.ts";
import { fetchSourceWithRetry } from "../lib/catalogue-import/source-http.ts";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

test("builds the official course search URL for a catalogue year", () => {
  const url = new URL(createAnuCourseSearchUrl(2024));
  assert.equal(url.origin, "https://programsandcourses.anu.edu.au");
  assert.equal(url.pathname, "/data/CourseSearch/GetCourses");
  assert.equal(url.searchParams.get("SelectedYear"), "2024");
  assert.equal(url.searchParams.get("PageSize"), "Infinity");
  assert.equal(url.searchParams.get("AppliedFilter"), "FilterByCourses");
  assert.throws(() => createAnuCourseSearchUrl(1999), /between 2000 and 2200/);
  assert.throws(
    () => createAnuCourseSearchUrl(2024.5),
    /between 2000 and 2200/,
  );
});

test("parses, sorts and deduplicates directory course codes", () => {
  const directory = parseAnuCourseDirectory(
    {
      TotalCount: 500,
      Items: [
        {
          CourseCode: "MATH1013",
          Name: "Mathematics",
          Career: "Undergraduate",
        },
        { CourseCode: "comp1100 ", Name: "FP", Career: "Undergraduate" },
        { CourseCode: "COMP1100", Name: "Duplicate", Career: "Undergraduate" },
        { CourseCode: "BAD", Name: "Broken" },
        { Name: "No code at all" },
      ],
    },
    2026,
  );

  assert.deepEqual(directory.courseCodes, ["COMP1100", "MATH1013"]);
  assert.deepEqual(
    directory.diagnostics.map((diagnostic) => diagnostic.code),
    [
      "DUPLICATE_DIRECTORY_COURSE_CODE",
      "INVALID_DIRECTORY_COURSE_CODE",
      "INVALID_DIRECTORY_COURSE_CODE",
    ],
  );
  assert.ok(
    directory.diagnostics.every(
      (diagnostic) => diagnostic.severity === "warning",
    ),
  );
});

test("reports an error when the directory has no usable courses", () => {
  const directory = parseAnuCourseDirectory({ Items: [] }, 2026);
  assert.deepEqual(directory.courseCodes, []);
  assert.deepEqual(
    directory.diagnostics.map((diagnostic) => diagnostic.code),
    ["EMPTY_COURSE_DIRECTORY"],
  );
  assert.equal(directory.diagnostics[0].severity, "error");
  assert.throws(
    () => parseAnuCourseDirectory({ unexpected: true }, 2026),
    /Items array/,
  );
});

test("fetches the directory with provenance metadata", async () => {
  const requests = [];
  const directory = await fetchAnuCourseDirectory(2025, {
    fetchImpl: async (url) => {
      requests.push(url);
      return jsonResponse({
        Items: [
          { CourseCode: "COMP1100", Name: "FP", Career: "Undergraduate" },
        ],
      });
    },
    now: () => new Date("2026-08-19T00:00:00.000Z"),
  });

  assert.equal(requests.length, 1);
  assert.match(String(requests[0]), /SelectedYear=2025/);
  assert.equal(directory.catalogueYear, 2025);
  assert.equal(directory.fetchedAt, "2026-08-19T00:00:00.000Z");
  assert.deepEqual(directory.courseCodes, ["COMP1100"]);
});

test("retries transient failures with backoff and stops on success", async () => {
  let attempts = 0;
  const response = await fetchSourceWithRetry("https://example.test/source", {
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("socket hang up");
      if (attempts === 2) return new Response("busy", { status: 503 });
      return new Response("ok", { status: 200 });
    },
    retryAttempts: 3,
    retryDelayMs: 1,
  });

  assert.equal(attempts, 3);
  assert.equal(response.status, 200);
});

test("does not retry non-transient failures", async () => {
  let attempts = 0;
  const response = await fetchSourceWithRetry("https://example.test/source", {
    fetchImpl: async () => {
      attempts += 1;
      return new Response("missing", { status: 404 });
    },
    retryAttempts: 3,
    retryDelayMs: 1,
  });

  assert.equal(attempts, 1);
  assert.equal(response.status, 404);
});

test("surfaces the final failure after exhausting retries", async () => {
  let attempts = 0;
  await assert.rejects(
    fetchSourceWithRetry("https://example.test/source", {
      fetchImpl: async () => {
        attempts += 1;
        return new Response("busy", { status: 503 });
      },
      retryAttempts: 2,
      retryDelayMs: 1,
    }),
    /HTTP 503/,
  );
  assert.equal(attempts, 2);
});
