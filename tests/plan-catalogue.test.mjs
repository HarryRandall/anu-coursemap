import assert from "node:assert/strict";
import test from "node:test";

import { collectPlanCatalogueCourseIds } from "../lib/coursemap/plan-course-ids.ts";

test("includes courses that only appear in recorded attempts", () => {
  assert.deepEqual(
    collectPlanCatalogueCourseIds([{ course_id: 101 }], [{ course_id: 202 }]),
    [101, 202],
  );
});

test("deduplicates courses shared by the plan and recorded attempts", () => {
  assert.deepEqual(
    collectPlanCatalogueCourseIds(
      [{ course_id: 101 }, { course_id: 202 }],
      [{ course_id: 202 }, { course_id: 303 }, { course_id: 303 }],
    ),
    [101, 202, 303],
  );
});
