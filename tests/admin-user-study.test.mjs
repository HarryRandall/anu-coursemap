import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadAdminUserStudy() {
  const source = await readFile(
    new URL("../lib/admin/user-study.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const directory = await mkdtemp(
    join(tmpdir(), "coursemap-admin-user-study-"),
  );
  const target = join(directory, "admin-user-study.js");
  await writeFile(target, compiled);
  return import(pathToFileURL(target).href);
}

const { adminUserStudyProgress, adminUserTermLoads, uniqueTrackedCourseCount } =
  await loadAdminUserStudy();

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
