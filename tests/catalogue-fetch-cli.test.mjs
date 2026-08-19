import assert from "node:assert/strict";
import test from "node:test";

import {
  manifestErrorDiagnostics,
  parseFetchArguments,
  resolveManifestOutputPath,
} from "../scripts/catalogue/fetch-anu-manifest.mjs";

test("requires one explicit manifest destination", () => {
  assert.deepEqual(parseFetchArguments(["--stdout", "--course", "COMP2100"]), {
    help: false,
    courses: ["COMP2100"],
    output: undefined,
    stdout: true,
    allCourses: false,
    year: 2026,
    concurrency: undefined,
  });
  assert.deepEqual(
    parseFetchArguments([
      "--course",
      "COMP2100",
      "--course",
      "COMP3900",
      "--output",
      ".catalogue-cache/review/anu-2026.json",
    ]),
    {
      help: false,
      courses: ["COMP2100", "COMP3900"],
      output: ".catalogue-cache/review/anu-2026.json",
      stdout: false,
      allCourses: false,
      year: 2026,
      concurrency: undefined,
    },
  );
  assert.throws(() => parseFetchArguments([]), /exactly one/);
  assert.throws(
    () => parseFetchArguments(["--stdout", "--output", "manifest.json"]),
    /exactly one/,
  );
  assert.throws(() => parseFetchArguments(["--unknown"]), /Unknown argument/);
});

test("parses catalogue year, full discovery and concurrency options", () => {
  assert.deepEqual(
    parseFetchArguments([
      "--year",
      "2024",
      "--all-courses",
      "--concurrency",
      "8",
      "--output",
      ".catalogue-cache/anu-2024.json",
    ]),
    {
      help: false,
      courses: [],
      output: ".catalogue-cache/anu-2024.json",
      stdout: false,
      allCourses: true,
      year: 2024,
      concurrency: 8,
    },
  );
  assert.throws(
    () => parseFetchArguments(["--year", "24", "--stdout"]),
    /four-digit year/,
  );
  assert.throws(
    () => parseFetchArguments(["--year", "twenty", "--stdout"]),
    /four-digit year/,
  );
  assert.throws(
    () => parseFetchArguments(["--concurrency", "0", "--stdout"]),
    /between 1 and 8/,
  );
  assert.throws(
    () => parseFetchArguments(["--concurrency", "9", "--stdout"]),
    /between 1 and 8/,
  );
  assert.throws(
    () =>
      parseFetchArguments([
        "--all-courses",
        "--course",
        "COMP1100",
        "--stdout",
      ]),
    /cannot be combined/,
  );
  assert.throws(
    () => parseFetchArguments(["--year", "2024", "--year", "2025", "--stdout"]),
    /only once/,
  );
});

test("confines file output to the ignored catalogue cache", () => {
  const cwd = "/workspace/coursemap";
  assert.equal(
    resolveManifestOutputPath(".catalogue-cache/anu-2026.json", cwd),
    "/workspace/coursemap/.catalogue-cache/anu-2026.json",
  );
  assert.throws(
    () => resolveManifestOutputPath("manifest.json", cwd),
    /inside .catalogue-cache/,
  );
  assert.throws(
    () => resolveManifestOutputPath(".catalogue-cache/../package.json", cwd),
    /inside .catalogue-cache/,
  );
  assert.throws(
    () => resolveManifestOutputPath(".catalogue-cache/manifest.txt", cwd),
    /end in .json/,
  );
});

test("counts top-level and document-level source errors", () => {
  const documentError = {
    code: "DOCUMENT_ERROR",
    severity: "error",
    message: "A document fact failed.",
  };
  const topLevelError = {
    code: "FETCH_ERROR",
    severity: "error",
    message: "A fetch failed.",
  };
  const warning = {
    code: "REVIEW_WARNING",
    severity: "warning",
    message: "Review this source.",
  };

  assert.deepEqual(
    manifestErrorDiagnostics({
      diagnostics: [topLevelError, warning],
      documents: [{ diagnostics: [documentError, warning] }],
    }),
    [topLevelError, documentError],
  );
});
