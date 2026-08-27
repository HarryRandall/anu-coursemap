import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnuCourseSearchUrl,
  fetchAnuCourseDirectory,
  parseAnuCourseDirectory,
} from "../lib/catalogue-import/anu-course-directory.ts";
import {
  createAnuProgrammeSearchUrls,
  fetchAnuProgrammeDirectory,
  mergeAnuProgrammeDirectory,
} from "../lib/catalogue-import/anu-programme-directory.ts";
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

test("builds programme search URLs for each career endpoint", () => {
  const urls = createAnuProgrammeSearchUrls(2026);
  assert.equal(urls.length, 4);
  assert.deepEqual(
    urls.map((entry) => entry.kind),
    ["undergraduate", "postgraduate", "research", "non_award"],
  );
  for (const entry of urls) {
    const url = new URL(entry.sourceUrl);
    assert.equal(url.origin, "https://programsandcourses.anu.edu.au");
    assert.equal(url.searchParams.get("SelectedYear"), "2026");
    assert.equal(url.searchParams.get("PageSize"), "Infinity");
    assert.equal(url.searchParams.get("ShowAll"), "true");
  }
  assert.throws(
    () => createAnuProgrammeSearchUrls(1999),
    /between 2000 and 2200/,
  );
});

test("merges programme directory payloads and deduplicates codes", () => {
  const directory = mergeAnuProgrammeDirectory(
    [
      {
        kind: "undergraduate",
        payload: {
          Items: [
            {
              AcademicPlanCode: "BCOMP",
              ProgramName: "Bachelor of Computing",
              AcademicCareer: "Undergraduate",
              Duration: 3,
            },
            {
              AcademicPlanCode: "bad",
              ProgramName: "Too short",
            },
          ],
        },
      },
      {
        kind: "postgraduate",
        payload: {
          Items: [
            {
              AcademicPlanCode: "BCOMP",
              ProgramName: "Duplicate postgraduate copy",
            },
            {
              AcademicPlanCode: "MCOMP",
              ProgramName: "Master of Computing",
              Duration: 2,
            },
          ],
        },
      },
    ],
    2026,
  );

  assert.deepEqual(directory.programmeCodes, ["BCOMP", "MCOMP"]);
  assert.equal(directory.entries[0].title, "Bachelor of Computing");
  assert.equal(directory.entries[0].kind, "undergraduate");
  assert.equal(directory.entries[1].kind, "postgraduate");
  assert.deepEqual(
    directory.diagnostics.map((diagnostic) => diagnostic.code),
    ["INVALID_DIRECTORY_PROGRAMME", "DUPLICATE_DIRECTORY_PROGRAMME_CODE"],
  );
});

test("reports an error when programme directory has no usable rows", () => {
  const directory = mergeAnuProgrammeDirectory(
    [{ kind: "undergraduate", payload: { Items: [] } }],
    2026,
  );
  assert.deepEqual(directory.programmeCodes, []);
  assert.equal(directory.diagnostics.at(-1)?.code, "EMPTY_PROGRAMME_DIRECTORY");
  assert.equal(directory.diagnostics.at(-1)?.severity, "error");
});

test("parses the captured programme directory fixture", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "fixtures/anu-programme-directory-sample.json",
  );
  const items = JSON.parse(await readFile(fixturePath, "utf8"));
  const directory = mergeAnuProgrammeDirectory(
    [{ kind: "undergraduate", payload: { Items: items } }],
    2026,
  );
  assert.deepEqual(directory.programmeCodes, ["BCOMP", "MCOMP"]);
  assert.equal(
    directory.diagnostics.some(
      (diagnostic) => diagnostic.code === "INVALID_DIRECTORY_PROGRAMME",
    ),
    true,
  );
});

test("fetches programme directory across career endpoints", async () => {
  const requests = [];
  const directory = await fetchAnuProgrammeDirectory(2025, {
    fetchImpl: async (url) => {
      requests.push(String(url));
      return jsonResponse({
        Items: [
          {
            AcademicPlanCode: "BCOMP",
            ProgramName: "Bachelor of Computing",
          },
        ],
      });
    },
    now: () => new Date("2026-08-19T00:00:00.000Z"),
  });

  assert.equal(requests.length, 4);
  assert.ok(requests.every((url) => url.includes("SelectedYear=2025")));
  assert.equal(directory.catalogueYear, 2025);
  assert.equal(directory.fetchedAt, "2026-08-19T00:00:00.000Z");
  // Same code across four endpoints collapses to one entry.
  assert.deepEqual(directory.programmeCodes, ["BCOMP"]);
  assert.equal(
    directory.diagnostics.filter(
      (diagnostic) => diagnostic.code === "DUPLICATE_DIRECTORY_PROGRAMME_CODE",
    ).length,
    3,
  );
});
