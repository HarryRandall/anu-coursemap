import assert from "node:assert/strict";
import test from "node:test";
import {
  importSortOrder,
  importStatusFilter,
  isImportActive,
  IMPORT_LIST_STATUSES,
} from "../lib/coursemap/import-list-query.ts";

/**
 * The two import tables disagree on their status literals. These are the
 * values their CHECK constraints allow, so a mapping that drifts from them
 * returns an empty table rather than an error.
 */
const COURSE_PROCESSING = [
  "queued",
  "processing",
  "ready_for_review",
  "unchanged",
  "failed",
  "cancelled",
];
const COURSE_REVIEW = [
  "not_ready",
  "pending",
  "accepted",
  "rejected",
  "not_required",
];
const STRUCTURE_PROCESSING = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
];
const STRUCTURE_REVIEW = [
  "pending",
  "needs_review",
  "unchanged",
  "accepted",
  "rejected",
  "not_required",
];

const ALLOWED = {
  course: {
    processing_status: COURSE_PROCESSING,
    review_status: COURSE_REVIEW,
  },
  structure: {
    processing_status: STRUCTURE_PROCESSING,
    review_status: STRUCTURE_REVIEW,
  },
};

test("every status filter uses words its own table can store", () => {
  for (const system of ["course", "structure"]) {
    for (const status of IMPORT_LIST_STATUSES) {
      const filter = importStatusFilter(system, status);
      if (!filter) continue;
      for (const value of filter.values) {
        assert.ok(
          ALLOWED[system][filter.column].includes(value),
          `${system} "${status}" filters ${filter.column} on "${value}", which that table cannot hold`,
        );
      }
    }
  }
});

test("the two systems really do disagree, so one shared mapping cannot work", () => {
  // Guards the specific bug: courses were filtered with the structure words.
  assert.deepEqual(importStatusFilter("course", "processing"), {
    column: "processing_status",
    values: ["processing"],
  });
  assert.deepEqual(importStatusFilter("structure", "processing"), {
    column: "processing_status",
    values: ["running"],
  });
  assert.deepEqual(importStatusFilter("course", "needs-review"), {
    column: "review_status",
    values: ["pending"],
  });
  assert.deepEqual(importStatusFilter("structure", "needs-review"), {
    column: "review_status",
    values: ["needs_review"],
  });
});

test("all is unfiltered and unknown statuses do not invent a filter", () => {
  assert.equal(importStatusFilter("course", "all"), null);
  assert.equal(importStatusFilter("structure", "all"), null);
});

test("in-flight detection follows each system's own words", () => {
  assert.ok(isImportActive("course", "processing"));
  assert.ok(!isImportActive("course", "running"));
  assert.ok(isImportActive("structure", "running"));
  assert.ok(!isImportActive("structure", "processing"));
  for (const system of ["course", "structure"]) {
    assert.ok(isImportActive(system, "queued"));
    assert.ok(!isImportActive(system, "failed"));
  }
});

test("sorting maps to a real column and direction", () => {
  assert.deepEqual(importSortOrder("newest", "course_code"), {
    column: "created_at",
    ascending: false,
  });
  assert.deepEqual(importSortOrder("oldest", "course_code"), {
    column: "created_at",
    ascending: true,
  });
  assert.deepEqual(importSortOrder("code-asc", "structure_code"), {
    column: "structure_code",
    ascending: true,
  });
  assert.deepEqual(importSortOrder("code-desc", "structure_code"), {
    column: "structure_code",
    ascending: false,
  });
});
