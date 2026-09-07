import assert from "node:assert/strict";

import { test } from "vitest";

const { adminUserStudyProgress, adminUserTermLoads, uniqueTrackedCourseCount } =
  await import("../lib/admin/user-study.ts");

function course(overrides) {
  return {
    id: crypto.randomUUID(),
    code: "COMP1100",
    title: "Programming as Problem Solving",
    units: 6,
    unitsEarned: 0,
    calendarYear: 2026,
    periodCode: "S1",
    periodName: "First Semester",
    periodShortName: "S1",
    status: "planned",
    mark: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("admin study progress uses the latest record for each course", () => {
  const study = {
    plan: null,
    structures: [
      { role: "programme", code: "BCOMP", name: "Computing", units: 144 },
    ],
    courses: [
      course({ id: "planned", status: "planned" }),
      course({
        id: "completed",
        status: "completed",
        unitsEarned: 6,
        calendarYear: 2026,
        periodCode: "S2",
      }),
      course({ id: "math", code: "MATH1005", status: "enrolled" }),
      course({ id: "failed", code: "COMP1600", status: "failed" }),
    ],
  };

  assert.deepEqual(adminUserStudyProgress(study), {
    completed: 6,
    planned: 6,
    mapped: 12,
    remaining: 132,
    total: 144,
    percent: 4,
  });
  assert.equal(uniqueTrackedCourseCount(study.courses), 3);
});

test("admin term loads exclude failed and unscheduled records", () => {
  const loads = adminUserTermLoads([
    course({ id: "complete", status: "completed", unitsEarned: 6 }),
    course({ id: "planned", code: "MATH1005", periodCode: "S2" }),
    course({ id: "failed", code: "COMP1600", status: "failed" }),
    course({
      id: "later",
      code: "COMP2100",
      calendarYear: null,
      periodCode: null,
    }),
  ]);

  assert.deepEqual(
    loads.map(({ id, completed, planned, units }) => ({
      id,
      completed,
      planned,
      units,
    })),
    [
      { id: "2026-s1", completed: 6, planned: 0, units: 6 },
      { id: "2026-s2", completed: 0, planned: 6, units: 6 },
    ],
  );
});
