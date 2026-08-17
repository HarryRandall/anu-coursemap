import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

const libDir = new URL("../lib/", import.meta.url);

async function compileLib(name) {
  const dir = await mkdtemp(join(tmpdir(), `coursemap-${name}-`));
  const needed =
    name === "planner"
      ? ["catalogue.ts", "planner.ts"]
      : name === "study-calendar"
        ? ["catalogue.ts", "study-calendar.ts"]
        : name === "dashboard-series"
          ? ["catalogue.ts", "dashboard-series.ts"]
          : ["catalogue.ts"];
  for (const file of needed) {
    const source = await readFile(new URL(file, libDir), "utf8");
    const rewritten = source.replaceAll(/@\/lib\/([^"]+)/g, "./$1.js");
    const compiled = ts.transpileModule(rewritten, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    await writeFile(join(dir, file.replace(".ts", ".js")), compiled);
  }
  return import(pathToFileURL(join(dir, `${name}.js`)).href);
}

const planner = await compileLib("planner");
const catalogue = await compileLib("catalogue");
const {
  courseIsAvailable,
  degreeUnitProgress,
  proposePrerequisiteFix,
  recommendedCoursesForTerm,
  termHasCapacity,
  unitsByCalendarYear,
} = planner;
const { courses, terms } = catalogue;
const demoCatalogue = { courses, terms };
const s1 = terms.find((term) => term.id === "2026-s1");
const s2 = terms.find((term) => term.id === "2026-s2");
const major = [
  "COMP1100",
  "COMP1110",
  "COMP2100",
  "COMP2120",
  "COMP3703",
  "COMP3900",
];

function attempt(id, courseCode, termId, status = "planned") {
  return { id, courseCode, termId, status };
}

test("recommends first-year core courses for an empty Semester 1", () => {
  const recommended = recommendedCoursesForTerm(
    s1,
    [],
    major,
    demoCatalogue,
  ).map((course) => course.code);
  assert.deepEqual(recommended, ["COMP1100", "MATH1005"]);
});

test("does not recommend a course whose prerequisite is still missing", () => {
  const recommended = recommendedCoursesForTerm(
    s2,
    [],
    major,
    demoCatalogue,
  ).map((course) => course.code);
  assert.ok(recommended.includes("COMP1600"));
  assert.ok(recommended.includes("MATH1005"));
  assert.equal(recommended.includes("COMP1110"), false);
});

test("recommends COMP1110 once COMP1100 is sequenced earlier", () => {
  const recommended = recommendedCoursesForTerm(
    s2,
    [attempt("a1", "COMP1100", "2026-s1", "completed")],
    major,
    demoCatalogue,
  ).map((course) => course.code);
  assert.ok(recommended.includes("COMP1110"));
});

test("skips courses already in the plan", () => {
  const recommended = recommendedCoursesForTerm(
    s1,
    [attempt("a1", "COMP1100", "2026-s1")],
    major,
    demoCatalogue,
  ).map((course) => course.code);
  assert.equal(recommended.includes("COMP1100"), false);
  assert.ok(recommended.includes("MATH1005"));
});

test("adds a missing prerequisite to the latest earlier offering with space", () => {
  const blocked = attempt("blocked", "COMP2100", "2027-s1");
  const result = proposePrerequisiteFix(blocked, [blocked], demoCatalogue);
  assert.equal(result.ok, true);
  assert.ok(
    result.steps.some(
      (step) =>
        step.type === "add" &&
        step.courseCode === "COMP1110" &&
        step.termId === "2026-s2",
    ),
  );
  assert.ok(
    result.steps.some(
      (step) =>
        step.type === "add" &&
        step.courseCode === "COMP1100" &&
        step.termId === "2026-s1",
    ),
  );
});

test("moves a late prerequisite earlier when that offering is available", () => {
  const attempts = [
    attempt("done", "COMP1100", "2026-s1", "completed"),
    attempt("prereq", "COMP1110", "2027-s2"),
    attempt("blocked", "COMP2100", "2027-s1"),
  ];
  const result = proposePrerequisiteFix(attempts[2], attempts, demoCatalogue);
  assert.equal(result.ok, true);
  assert.deepEqual(result.steps, [
    {
      type: "move",
      attemptId: "prereq",
      courseCode: "COMP1110",
      fromTermId: "2027-s2",
      toTermId: "2026-s2",
    },
  ]);
});

test("does not invent a fix when no earlier offering has space", () => {
  const attempts = [
    attempt("a1", "COMP1600", "2026-s2"),
    attempt("a2", "MATH1005", "2026-s2"),
    attempt("a3", "COMP2120", "2026-s2"),
    attempt("a4", "COMP2310", "2026-s2"),
    attempt("blocked", "COMP2100", "2027-s1"),
  ];
  const result = proposePrerequisiteFix(attempts[4], attempts, demoCatalogue);
  assert.equal(result.ok, false);
  assert.match(result.message, /No earlier/i);
});

test("does not offer a sequencing fix for approval-only issues", () => {
  const attemptWithApproval = {
    ...attempt("capstone", "COMP3900", "2028-s2"),
    permissionApproved: false,
  };
  const attempts = [
    attempt("a1", "COMP2100", "2027-s1", "completed"),
    attemptWithApproval,
  ];
  const result = proposePrerequisiteFix(
    attemptWithApproval,
    attempts,
    demoCatalogue,
  );
  assert.equal(result.ok, false);
});

test("reports empty degree progress without inventing mapped units", () => {
  const progress = degreeUnitProgress([], 144);
  assert.deepEqual(progress, {
    completed: 0,
    planned: 0,
    remaining: 144,
    mapped: 0,
    total: 144,
    percent: 0,
  });
});

test("treats a full semester as over capacity", () => {
  const attempts = [
    attempt("a1", "COMP1100", "2026-s1"),
    attempt("a2", "MATH1005", "2026-s1"),
    attempt("a3", "COMP2400", "2026-s1"),
    attempt("a4", "COMP2300", "2026-s1"),
  ];
  assert.equal(
    termHasCapacity(attempts, "2026-s1", 6, 1, undefined, demoCatalogue),
    false,
  );
  assert.equal(
    termHasCapacity(attempts, "unscheduled", 6, 1, undefined, demoCatalogue),
    true,
  );
});

test("course availability follows the catalogue sessions", () => {
  const course = { sessions: ["Semester 2"] };
  assert.equal(courseIsAvailable(course, "Semester 1"), false);
  assert.equal(courseIsAvailable(course, "Semester 2"), true);
  assert.equal(courseIsAvailable(course, "Later"), true);
});

test("groups completed and planned units by calendar year", () => {
  const series = unitsByCalendarYear(
    [
      attempt("a1", "COMP1100", "2026-s1", "completed"),
      attempt("a2", "COMP1600", "2026-s2"),
      attempt("a3", "COMP2100", "2027-s2"),
    ],
    demoCatalogue,
  );
  const year2026 = series.find((item) => item.year === 2026);
  const year2027 = series.find((item) => item.year === 2027);
  assert.equal(year2026?.completed, 6);
  assert.equal(year2026?.planned, 6);
  assert.equal(year2027?.planned, 6);
});

const calendar = await compileLib("study-calendar");
const { eventsOnDay, focusMonthForPlan, monthCells, termContaining } = calendar;

test("places a Semester 2 course on its weekday inside the study period", () => {
  const attempts = [attempt("a1", "COMP1600", "2026-s2")];
  const days = Array.from(
    { length: 31 },
    (_, index) => new Date(2026, 7, index + 1),
  );
  const hits = days.filter((day) => eventsOnDay(day, attempts).length > 0);
  assert.ok(hits.length > 0);
  assert.ok(hits.every((day) => day.getDay() >= 1 && day.getDay() <= 5));
  assert.equal(new Set(hits.map((day) => day.getDay())).size, 1);
});

test("focuses the calendar on the current study period when it has courses", () => {
  const focus = focusMonthForPlan(
    [attempt("a1", "COMP1600", "2026-s2")],
    new Date(2026, 7, 15),
  );
  assert.deepEqual(focus, { year: 2026, month: 7 });
});

test("builds a Monday-first month grid", () => {
  const cells = monthCells({ year: 2026, month: 7 });
  const first = cells.find((cell) => cell);
  assert.equal(first?.getDate(), 1);
  assert.equal(termContaining(new Date(2026, 7, 15))?.id, "2026-s2");
  assert.equal(termContaining(new Date(2026, 0, 10)), null);
});

const series = await compileLib("dashboard-series");

test("builds cumulative earned and planned units after each study period", () => {
  const values = series.cumulativeUnitsByTerm([
    attempt("a1", "COMP1100", "2026-s1", "completed"),
    attempt("a2", "MATH1005", "2026-s1", "completed"),
    attempt("a3", "COMP1600", "2026-s2"),
  ]);
  assert.equal(values[0].label, "S1 26");
  assert.equal(values[0].completed, 12);
  assert.equal(values[0].planned, 0);
  assert.equal(values[1].completed, 12);
  assert.equal(values[1].planned, 6);
  assert.equal(values[1].units, 18);
});

test("reports study-period load without counting failed attempts", () => {
  const loads = series.unitsByTerm([
    attempt("a1", "COMP1100", "2026-s1", "completed"),
    attempt("a2", "COMP1110", "2026-s2", "failed"),
    attempt("a3", "COMP1600", "2026-s2"),
  ]);
  assert.equal(loads[0].units, 6);
  assert.equal(loads[0].completed, 6);
  assert.equal(loads[1].units, 6);
  assert.equal(loads[1].planned, 6);
});
