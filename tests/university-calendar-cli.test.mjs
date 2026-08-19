import assert from "node:assert/strict";
import test from "node:test";

import { parseCalendarFetchArguments } from "../scripts/catalogue/fetch-anu-calendar.mjs";
import { importResultExitCode } from "../scripts/catalogue/import-calendar.mjs";

test("parses calendar fetch arguments", () => {
  assert.deepEqual(
    parseCalendarFetchArguments(
      ["--year", "2026", "--output", ".catalogue-cache/anu-calendar-2026.json"],
      2025,
    ),
    {
      help: false,
      year: 2026,
      output: ".catalogue-cache/anu-calendar-2026.json",
      stdout: false,
    },
  );

  assert.deepEqual(parseCalendarFetchArguments(["--stdout"], 2026), {
    help: false,
    year: 2026,
    output: undefined,
    stdout: true,
  });

  assert.equal(parseCalendarFetchArguments(["--help"], 2026).help, true);
});

test("rejects invalid calendar fetch arguments", () => {
  assert.throws(
    () => parseCalendarFetchArguments([], 2026),
    /exactly one of --output or --stdout/,
  );
  assert.throws(
    () => parseCalendarFetchArguments(["--stdout", "--output", "x.json"], 2026),
    /exactly one of --output or --stdout/,
  );
  assert.throws(
    () => parseCalendarFetchArguments(["--year", "26", "--stdout"], 2026),
    /--year must be a four digit year/,
  );
  assert.throws(
    () => parseCalendarFetchArguments(["--year"], 2026),
    /--year requires a value/,
  );
  assert.throws(
    () => parseCalendarFetchArguments(["--unknown"], 2026),
    /Unknown argument/,
  );
});

test("maps calendar import results to exit codes", () => {
  assert.equal(importResultExitCode({ status: "succeeded" }), 0);
  assert.equal(importResultExitCode({ status: "failed" }), 2);
  assert.equal(importResultExitCode(undefined), 2);
});
