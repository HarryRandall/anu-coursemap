import assert from "node:assert/strict";
import test from "node:test";

import { AnuCourseDirectoryHttpError } from "../lib/catalogue-import/anu-course-directory.ts";
import {
  courseDirectoryEntriesRefreshEnabled,
  courseDirectoryFailurePolicy,
  courseDirectoryResponsePolicy,
} from "../lib/catalogue-import/course-directory-policy.ts";

const fetchedAt = "2026-08-29T01:02:03.000Z";

function directory(overrides = {}) {
  return {
    catalogueYear: 2026,
    sourceUrl:
      "https://programsandcourses.anu.edu.au/data/CourseSearch/GetCourses",
    fetchedAt,
    totalCount: 1,
    receivedItemCount: 1,
    isComplete: true,
    courseCodes: ["COMP1100"],
    entries: [
      {
        code: "COMP1100",
        name: "Programming as Problem Solving",
        career: "Undergraduate",
        session: null,
        units: 6,
        modeOfDelivery: null,
      },
    ],
    diagnostics: [],
    ...overrides,
  };
}

test("enables native directory refresh only with its exact server-side flag", () => {
  assert.equal(courseDirectoryEntriesRefreshEnabled(undefined), false);
  assert.equal(courseDirectoryEntriesRefreshEnabled("1"), false);
  assert.equal(courseDirectoryEntriesRefreshEnabled("TRUE"), false);
  assert.equal(courseDirectoryEntriesRefreshEnabled("true"), true);
});

test("retires missing rows only after a complete diagnostic-free response", () => {
  assert.deepEqual(courseDirectoryResponsePolicy(directory()), {
    sourceAvailability: "available",
    checkedAt: fetchedAt,
    availabilityNote: null,
    markDirectoryRefreshed: true,
    retireMissingEntries: true,
  });

  const truncated = courseDirectoryResponsePolicy(
    directory({
      totalCount: 2,
      isComplete: false,
      diagnostics: [
        {
          code: "TRUNCATED_COURSE_DIRECTORY",
          severity: "error",
          message: "Only one of two rows was returned.",
        },
      ],
    }),
  );
  assert.equal(truncated.sourceAvailability, "available");
  assert.equal(truncated.markDirectoryRefreshed, false);
  assert.equal(truncated.retireMissingEntries, false);
  assert.match(truncated.availabilityNote, /Existing directory entries/u);

  const warning = courseDirectoryResponsePolicy(
    directory({
      diagnostics: [
        {
          code: "DUPLICATE_DIRECTORY_COURSE_CODE",
          severity: "warning",
          message: "A duplicate was ignored.",
        },
      ],
    }),
  );
  assert.equal(warning.retireMissingEntries, false);
});

test("classifies complete empty and permanent HTTP responses as unavailable", () => {
  const empty = courseDirectoryResponsePolicy(
    directory({
      totalCount: 0,
      receivedItemCount: 0,
      courseCodes: [],
      entries: [],
      diagnostics: [
        {
          code: "EMPTY_COURSE_DIRECTORY",
          severity: "error",
          message: "No courses were returned.",
        },
      ],
    }),
  );
  assert.equal(empty.sourceAvailability, "unavailable");
  assert.equal(empty.checkedAt, fetchedAt);
  assert.match(empty.availabilityNote, /complete course directory/u);
  assert.equal(empty.retireMissingEntries, false);

  for (const status of [404, 410]) {
    const unavailable = courseDirectoryFailurePolicy({
      catalogueYear: 2026,
      error: new AnuCourseDirectoryHttpError(status, "No data"),
      checkedAt: fetchedAt,
    });
    assert.equal(unavailable.sourceAvailability, "unavailable");
    assert.match(unavailable.availabilityNote, new RegExp(String(status), "u"));
    assert.equal(unavailable.retireMissingEntries, false);
  }
});

test("keeps transient and unexpected directory failures unknown", () => {
  const transient = courseDirectoryFailurePolicy({
    catalogueYear: 2026,
    error: new Error("HTTP 503 Service Unavailable"),
    checkedAt: fetchedAt,
  });
  assert.equal(transient.sourceAvailability, "unknown");
  assert.equal(transient.checkedAt, fetchedAt);
  assert.match(transient.availabilityNote, /HTTP 503/u);
  assert.equal(transient.markDirectoryRefreshed, false);
  assert.equal(transient.retireMissingEntries, false);
});

test("does not call a response available when none of its rows can be stored", () => {
  const unusable = courseDirectoryResponsePolicy(
    directory({
      entries: [
        {
          code: "COMP1100",
          name: null,
          career: "Undergraduate",
          session: null,
          units: 6,
          modeOfDelivery: null,
        },
      ],
      diagnostics: [
        {
          code: "MISSING_DIRECTORY_COURSE_TITLE",
          severity: "warning",
          message: "The only returned row had no title.",
        },
      ],
    }),
  );

  assert.equal(unusable.sourceAvailability, "unknown");
  assert.equal(unusable.markDirectoryRefreshed, false);
  assert.equal(unusable.retireMissingEntries, false);
  assert.match(unusable.availabilityNote, /could not be used/u);
});
