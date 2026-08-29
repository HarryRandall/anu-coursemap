import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CourseSourceError,
  createAnuCourseUrl,
  fetchAnuCoursePage,
  validateAnuCoursePage,
} from "../lib/course-import/source.ts";

const html = await readFile(
  new URL(
    "./fixtures/course-import/anu-2026-comp2400-rich.html",
    import.meta.url,
  ),
  "utf8",
);

test("builds only official import-year course URLs", () => {
  assert.equal(
    createAnuCourseUrl(2026, "comp2400"),
    "https://programsandcourses.anu.edu.au/2026/course/COMP2400",
  );
  assert.throws(
    () => createAnuCourseUrl(2019, "COMP2400"),
    /2020 through 2030/,
  );
  assert.throws(
    () => createAnuCourseUrl(2031, "COMP2400"),
    /2020 through 2030/,
  );
  assert.throws(
    () => createAnuCourseUrl(2026, "../../admin"),
    /Invalid ANU course code/,
  );
});

test("builds and validates ANU pages for single-letter course variants", () => {
  assert.equal(
    createAnuCourseUrl(2026, "comp8900f"),
    "https://programsandcourses.anu.edu.au/2026/course/COMP8900F",
  );

  const result = validateAnuCoursePage({
    html: html
      .replaceAll("COMP2400", "COMP8900F")
      .replaceAll("comp2400", "comp8900f"),
    expectedCourseCode: "COMP8900F",
    expectedYear: 2026,
  });
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.page.code, "COMP8900F");
});

test("rejects ANU's HTTP-200 page-not-found shell", () => {
  const result = validateAnuCoursePage({
    html: "<!doctype html><title>Page Not Found - ANU</title><body><h1>404</h1></body>",
    expectedCourseCode: "COMP2400",
    expectedYear: 2026,
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(({ code }) => code === "PAGE_NOT_FOUND_SHELL"));
  assert.ok(result.issues.some(({ code }) => code === "MISSING_COURSE_CODE"));
});

test("retries transient responses and records immutable source metadata", async () => {
  let attempts = 0;
  const result = await fetchAnuCoursePage(2026, "COMP2400", {
    retryAttempts: 3,
    retryDelayMs: 0,
    now: () => new Date("2026-08-29T01:02:03.000Z"),
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1)
        return new Response("temporarily unavailable", { status: 503 });
      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          etag: '"fixture-etag"',
          "last-modified": "Fri, 28 Aug 2026 03:04:05 GMT",
        },
      });
    },
  });

  assert.equal(attempts, 2);
  assert.equal(result.courseCode, "COMP2400");
  assert.equal(result.year, 2026);
  assert.equal(result.httpEtag, '"fixture-etag"');
  assert.equal(result.sourceLastModified, "2026-08-28T03:04:05.000Z");
  assert.equal(result.fetchedAt, "2026-08-29T01:02:03.000Z");
  assert.match(result.contentSha256, /^[0-9a-f]{64}$/);
});

test("uses one bounded source attempt by default", async () => {
  let attempts = 0;
  const result = await fetchAnuCoursePage(2026, "COMP2400", {
    fetchImpl: async () => {
      attempts += 1;
      return new Response("temporarily unavailable", { status: 503 });
    },
  });

  assert.equal(attempts, 1);
  assert.equal(result.sourceError?.code, "RETRYABLE_HTTP_STATUS");
});

test("returns a permanent page failure so its raw response can be stored", async () => {
  let attempts = 0;
  const result = await fetchAnuCoursePage(2026, "COMP2400", {
    retryAttempts: 3,
    retryDelayMs: 0,
    fetchImpl: async () => {
      attempts += 1;
      return new Response("missing", { status: 404 });
    },
  });
  assert.equal(attempts, 1);
  assert.equal(result.html, "missing");
  assert.equal(result.httpStatus, 404);
  assert.ok(result.sourceError instanceof CourseSourceError);
  assert.equal(result.sourceError.status, 404);
});
