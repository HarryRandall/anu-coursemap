import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadHistory() {
  const sourcePath = new URL(
    "../lib/coursemap/admin-catalogue-history.ts",
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
    join(tmpdir(), "coursemap-admin-catalogue-history-"),
  );
  const target = join(directory, "admin-catalogue-history.js");
  await writeFile(target, compiled);
  return import(pathToFileURL(target).href);
}

const {
  catalogueHistorySeries,
  countsByYear,
  startOfUtcWeek,
  weeklyCountSeries,
} = await loadHistory();

test("startOfUtcWeek snaps Sunday back and keeps Monday", () => {
  const sunday = startOfUtcWeek(new Date("2026-08-23T12:00:00Z"));
  const monday = startOfUtcWeek(new Date("2026-08-24T08:00:00Z"));
  assert.equal(sunday.toISOString(), "2026-08-17T00:00:00.000Z");
  assert.equal(monday.toISOString(), "2026-08-24T00:00:00.000Z");
});

test("catalogueHistorySeries accumulates records across the window", () => {
  const series = catalogueHistorySeries(
    [
      "2026-06-01T00:00:00Z",
      "2026-08-04T00:00:00Z",
      "2026-08-18T00:00:00Z",
      "2026-08-18T12:00:00Z",
    ],
    { now: "2026-08-27T00:00:00Z", weeks: 4 },
  );
  assert.deepEqual(series, [2, 2, 4, 4]);
});

test("catalogueHistorySeries ignores unparseable timestamps", () => {
  const series = catalogueHistorySeries(["not-a-date"], {
    now: "2026-08-27T00:00:00Z",
    weeks: 3,
  });
  assert.deepEqual(series, [0, 0, 0]);
});

test("weeklyCountSeries counts new records only inside the window", () => {
  const series = weeklyCountSeries(
    [
      "2026-06-01T00:00:00Z",
      "2026-08-04T00:00:00Z",
      "2026-08-18T00:00:00Z",
      "2026-08-18T12:00:00Z",
    ],
    { now: "2026-08-27T00:00:00Z", weeks: 4 },
  );
  assert.deepEqual(series, [1, 0, 2, 0]);
});

test("countsByYear keeps empty years", () => {
  assert.deepEqual(
    countsByYear(
      [2025, 2026, 2027],
      [{ year: 2026 }, { year: 2026 }, { year: 2027 }],
    ),
    [0, 2, 1],
  );
});
