import assert from "node:assert/strict";
import { readFile as readTextFile } from "node:fs/promises";
import test from "node:test";

import {
  ANU_COURSE_DIRECTORY_RETRY_ATTEMPTS,
  ANU_COURSE_DIRECTORY_REQUEST_TIMEOUT_MS,
  createAnuCourseSearchUrl,
  fetchAnuCourseDirectory,
  parseAnuCourseDirectory,
} from "../lib/catalogue-import/anu-course-directory.ts";
import { fetchSourceWithRetry } from "../lib/catalogue-import/source-http.ts";
import {
  assertSupportedCourseImportYear,
  isSupportedCourseImportYear,
} from "../lib/catalogue-import/course-import-years.ts";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

test("supports the fixed 2020 through 2030 course import window", () => {
  assert.equal(isSupportedCourseImportYear(2020), true);
  assert.equal(isSupportedCourseImportYear(2030), true);
  assert.equal(isSupportedCourseImportYear(2019), false);
  assert.equal(isSupportedCourseImportYear(2031), false);
  assert.throws(
    () => assertSupportedCourseImportYear(2031),
    /between 2020 and 2030/,
  );
});

test("builds the official course search URL for an academic year", () => {
  const url = new URL(createAnuCourseSearchUrl(2024));
  assert.equal(url.origin, "https://programsandcourses.anu.edu.au");
  assert.equal(url.pathname, "/data/CourseSearch/GetCourses");
  assert.equal(url.searchParams.get("SelectedYear"), "2024");
  assert.equal(url.searchParams.get("PageSize"), "Infinity");
  assert.equal(url.searchParams.get("MaxPageSize"), "10");
  assert.equal(url.searchParams.get("ShowAll"), "True");
  assert.equal(url.searchParams.get("CollegeName"), "");
  assert.equal(url.searchParams.get("ModeOfDelivery"), "All Modes");
  assert.equal(url.searchParams.get("AppliedFilter"), "FilterByCourses");
  assert.equal(
    url.searchParams.get("InitailSearchRequestedFromExternalPage"),
    "false",
  );
  for (const name of [
    "Source",
    "SortColumn",
    "SortDirection",
    "SearchText",
    "FilterByMajors",
    "FilterByMinors",
    "FilterBySpecialisations",
  ]) {
    assert.equal(url.searchParams.get(name), "");
  }
  for (const [name, count] of [
    ["Careers", 4],
    ["Sessions", 6],
    ["DegreeIdentifiers", 3],
  ]) {
    for (let index = 0; index < count; index += 1) {
      assert.equal(url.searchParams.get(`${name}[${index}]`), "");
    }
  }
  assert.throws(() => createAnuCourseSearchUrl(1999), /between 2000 and 2200/);
  assert.throws(
    () => createAnuCourseSearchUrl(2024.5),
    /between 2000 and 2200/,
  );
});

test("parses, sorts and deduplicates directory course codes", () => {
  const directory = parseAnuCourseDirectory(
    {
      TotalCount: 6,
      Items: [
        {
          CourseCode: "MATH1013",
          Name: "Mathematics",
          Career: "Undergraduate",
        },
        { CourseCode: "comp1100 ", Name: "FP", Career: "Undergraduate" },
        {
          CourseCode: "comp8900f ",
          Name: "Computing Research Project",
          Career: "Postgraduate",
        },
        { CourseCode: "COMP1100", Name: "Duplicate", Career: "Undergraduate" },
        { CourseCode: "BAD", Name: "Broken" },
        { Name: "No code at all" },
      ],
    },
    2026,
  );

  assert.deepEqual(directory.courseCodes, [
    "COMP1100",
    "COMP8900F",
    "MATH1013",
  ]);
  assert.equal(directory.totalCount, 6);
  assert.equal(directory.receivedItemCount, 6);
  assert.equal(directory.isComplete, true);
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
  const directory = parseAnuCourseDirectory({ TotalCount: 0, Items: [] }, 2026);
  assert.deepEqual(directory.courseCodes, []);
  assert.equal(directory.isComplete, true);
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

test("reports incomplete and uncounted course directory responses", () => {
  const truncated = parseAnuCourseDirectory(
    {
      TotalCount: 2,
      Items: [{ CourseCode: "COMP1100", Name: "FP" }],
    },
    2026,
  );
  assert.equal(truncated.isComplete, false);
  assert.equal(truncated.totalCount, 2);
  assert.equal(truncated.receivedItemCount, 1);
  assert.ok(
    truncated.diagnostics.some(
      ({ code, severity }) =>
        code === "TRUNCATED_COURSE_DIRECTORY" && severity === "error",
    ),
  );

  const missingCount = parseAnuCourseDirectory(
    { Items: [{ CourseCode: "COMP1100", Name: "FP" }] },
    2026,
  );
  assert.equal(missingCount.isComplete, false);
  assert.ok(
    missingCount.diagnostics.some(
      ({ code }) => code === "INVALID_DIRECTORY_TOTAL_COUNT",
    ),
  );
});

test("fetches the directory with provenance metadata", async () => {
  const requests = [];
  const directory = await fetchAnuCourseDirectory(2025, {
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return jsonResponse({
        TotalCount: 1,
        Items: [
          { CourseCode: "COMP1100", Name: "FP", Career: "Undergraduate" },
        ],
      });
    },
    now: () => new Date("2026-08-19T00:00:00.000Z"),
  });

  assert.equal(requests.length, 1);
  assert.match(String(requests[0].url), /SelectedYear=2025/);
  const headers = new Headers(requests[0].init.headers);
  assert.equal(headers.get("x-requested-with"), "XMLHttpRequest");
  assert.equal(
    headers.get("referer"),
    "https://programsandcourses.anu.edu.au/catalogue",
  );
  assert.equal(directory.academicYear, 2025);
  assert.equal(directory.fetchedAt, "2026-08-19T00:00:00.000Z");
  assert.deepEqual(directory.courseCodes, ["COMP1100"]);
});

test("bounds the heavy Infinity directory request to one default attempt", async () => {
  let attempts = 0;
  await assert.rejects(
    fetchAnuCourseDirectory(2026, {
      fetchImpl: async () => {
        attempts += 1;
        return new Response("busy", { status: 503 });
      },
    }),
    /HTTP 503/u,
  );
  assert.equal(attempts, 1);
  assert.equal(ANU_COURSE_DIRECTORY_REQUEST_TIMEOUT_MS, 45_000);
  assert.equal(ANU_COURSE_DIRECTORY_RETRY_ATTEMPTS, 1);
});

test("keeps the directory refresh route within the Hobby function limit", async () => {
  const route = await readTextFile(
    new URL("../app/api/admin/course-directory/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /export const maxDuration = 60;/u);
  assert.ok(ANU_COURSE_DIRECTORY_REQUEST_TIMEOUT_MS < 60_000);
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
