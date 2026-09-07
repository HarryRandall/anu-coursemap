import assert from "node:assert/strict";

import { test } from "vitest";

const {
  catalogueHistorySeries,
  countsByYear,
  cumulativeGrowthSeries,
  startOfUtcWeek,
  weeklyCountSeries,
} = await import("../lib/coursemap/admin-catalogue-history.ts");

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

test("cumulativeGrowthSeries follows the real timestamp span", () => {
  const series = cumulativeGrowthSeries(
    [
      "2026-01-01T00:00:00Z",
      "2026-01-02T00:00:00Z",
      "2026-01-03T00:00:00Z",
      "2026-01-04T00:00:00Z",
    ],
    { points: 4 },
  );
  assert.deepEqual(series, [1, 2, 3, 4]);
});

test("cumulativeGrowthSeries ends on a single batch import", () => {
  const series = cumulativeGrowthSeries(
    ["2026-08-27T12:00:00Z", "2026-08-27T12:00:00Z", "2026-08-27T12:00:00Z"],
    { points: 5 },
  );
  assert.deepEqual(series, [0, 0, 0, 0, 3]);
});
