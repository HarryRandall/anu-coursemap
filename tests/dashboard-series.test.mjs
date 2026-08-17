import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadDashboardSeries() {
  const sourcePath = new URL(
    "../lib/coursemap/dashboard-series.ts",
    import.meta.url,
  );
  const source = await readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const directory = await mkdtemp(
    join(tmpdir(), "coursemap-dashboard-series-"),
  );
  const target = join(directory, "dashboard-series.js");
  await writeFile(target, compiled);
  return import(pathToFileURL(target).href);
}

const {
  cumulativeDashboardUnits,
  currentDashboardTermId,
  dashboardCalendarEvents,
  dashboardTermLoads,
} = await loadDashboardSeries();

const terms = [
  {
    id: "2026-s1",
    year: 2026,
    name: "First Semester",
    shortName: "Semester 1",
    dates: "23 Feb to 29 May",
    startsOn: "2026-02-23",
    endsOn: "2026-05-29",
  },
  {
    id: "2026-s2",
    year: 2026,
    name: "Second Semester",
    shortName: "Semester 2",
    dates: "27 July to 30 Oct",
    startsOn: "2026-07-27",
    endsOn: "2026-10-30",
  },
  {
    id: "unscheduled",
    year: 9999,
    name: "Later",
    shortName: "Later",
    dates: "Choose when ready",
  },
];

const courses = [
  { code: "COMP1100", units: 6, accent: "violet" },
  { code: "MATH1005", units: 6, accent: "blue" },
];

test("dashboard charts use the saved active plan, not duplicate planned records", () => {
  const attempts = [
    {
      id: "planned-comp",
      courseCode: "COMP1100",
      termId: "2026-s1",
      status: "planned",
    },
    {
      id: "planned-math",
      courseCode: "MATH1005",
      termId: "2026-s2",
      status: "planned",
    },
    {
      id: "completed-comp",
      courseCode: "COMP1100",
      termId: "2026-s2",
      status: "completed",
    },
    {
      id: "failed-course",
      courseCode: "MATH1005",
      termId: "2026-s1",
      status: "failed",
    },
  ];
  const loads = dashboardTermLoads({ attempts, courses, terms });

  assert.deepEqual(
    loads.map(({ id, completed, planned, units }) => ({
      id,
      completed,
      planned,
      units,
    })),
    [
      { id: "2026-s1", completed: 0, planned: 0, units: 0 },
      { id: "2026-s2", completed: 6, planned: 6, units: 12 },
    ],
  );
  assert.equal(cumulativeDashboardUnits(loads)[1].units, 12);
});

test("dashboard calendar events retain imported study-period dates", () => {
  const attempts = [
    {
      id: "math",
      courseCode: "MATH1005",
      termId: "2026-s2",
      status: "planned",
    },
  ];
  const events = dashboardCalendarEvents({ attempts, courses, terms });

  assert.deepEqual(events, [
    {
      courseCode: "MATH1005",
      accent: "blue",
      termId: "2026-s2",
      termName: "Second Semester 2026",
      startsOn: "2026-07-27",
      endsOn: "2026-10-30",
    },
  ]);
  assert.equal(
    currentDashboardTermId(terms, new Date("2026-08-17T12:00:00")),
    "2026-s2",
  );
});
