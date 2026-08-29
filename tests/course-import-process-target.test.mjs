import assert from "node:assert/strict";
import test from "node:test";

import { courseImportTargetInternals } from "../lib/course-import/process-target.ts";
import {
  OpenRouterConfigurationError,
  OpenRouterRequestError,
} from "../lib/course-import/openrouter.ts";
import { CourseSourceError } from "../lib/course-import/source.ts";

test("redacts credentials and connection URLs from durable failure summaries", () => {
  const summary = courseImportTargetInternals.safeErrorSummary(
    new Error(
      "postgresql://admin:secret@example.supabase.co/postgres Bearer token-value sk-or-v1-secretvalue",
    ),
  );

  assert.doesNotMatch(summary, /admin:secret|token-value|secretvalue/);
  assert.match(summary, /database URL redacted/);
  assert.match(summary, /Bearer \[redacted\]/);
  assert.match(summary, /OpenRouter key redacted/);
});

test("retries only transient source and model failures", () => {
  assert.equal(
    courseImportTargetInternals.isRetryableCourseImportError(
      new CourseSourceError("ANU_BUSY", "Try again.", { retryable: true }),
    ),
    true,
  );
  assert.equal(
    courseImportTargetInternals.isRetryableCourseImportError(
      new CourseSourceError("NO_DATA", "No data available."),
    ),
    false,
  );
  assert.equal(
    courseImportTargetInternals.isRetryableCourseImportError(
      new OpenRouterRequestError("Rate limited.", 429),
    ),
    true,
  );
  assert.equal(
    courseImportTargetInternals.isRetryableCourseImportError(
      new OpenRouterRequestError("Invalid request.", 400),
    ),
    false,
  );
  assert.equal(
    courseImportTargetInternals.isRetryableCourseImportError(
      new OpenRouterConfigurationError(),
    ),
    false,
  );
  assert.equal(
    courseImportTargetInternals.isRetryableCourseImportError(
      new TypeError("Invalid extraction."),
    ),
    false,
  );
});

test("uses stable, non-secret error codes for review", () => {
  assert.equal(
    courseImportTargetInternals.errorCode(
      new CourseSourceError("INVALID_COURSE_PAGE", "No data."),
    ),
    "INVALID_COURSE_PAGE",
  );
  assert.equal(
    courseImportTargetInternals.errorCode(
      new OpenRouterRequestError("Rate limited.", 429),
    ),
    "OPENROUTER_HTTP_429",
  );
  assert.equal(
    courseImportTargetInternals.errorCode(new TypeError("Bad projection.")),
    "INVALID_PIPELINE_DATA",
  );
});

test("reserves deliveries after the paid-attempt limit for recovery only", () => {
  assert.equal(courseImportTargetInternals.isRecoveryOnlyDelivery(5, 5), false);
  assert.equal(courseImportTargetInternals.isRecoveryOnlyDelivery(6, 5), true);
  assert.equal(courseImportTargetInternals.isRecoveryOnlyDelivery(12, 5), true);
});

test("never retries when a paid OpenRouter outcome is uncertain", () => {
  const error =
    new courseImportTargetInternals.CourseImportPaidOutcomeUncertainError(
      new Error("connection ended after request dispatch"),
    );

  assert.equal(
    courseImportTargetInternals.isRetryableCourseImportError(error),
    false,
  );
  assert.equal(
    courseImportTargetInternals.errorCode(error),
    "OPENROUTER_OUTCOME_UNCERTAIN",
  );
  assert.match(error.message, /will not issue an automatic second paid call/);
});
