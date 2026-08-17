import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadSummaryParser() {
  const directory = await mkdtemp(join(tmpdir(), "coursemap-requisites-"));
  const source = await readFile(
    new URL("../lib/coursemap/requisite-summary.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const path = join(directory, "requisite-summary.js");
  await writeFile(path, compiled);
  return import(pathToFileURL(path).href);
}

const { evaluateRequisiteExpression, parseRequisiteSummary } =
  await loadSummaryParser();

test("summarises COMP3600 subject-unit and alternative-course requisites", () => {
  assert.deepEqual(
    parseRequisiteSummary(`
      To enrol in this course you must have completed the following:
      24 units of COMP coded courses AND
      (6 units of MATH OR COMP1600)
    `),
    {
      kind: "group",
      operator: "all_of",
      conditions: [
        { kind: "subject_units", subject: "COMP", units: 24 },
        {
          kind: "group",
          operator: "any_of",
          conditions: [
            { kind: "subject_units", subject: "MATH", units: 6 },
            { kind: "course", code: "COMP1600" },
          ],
        },
      ],
    },
  );
});

test("does not infer logic from wording outside the supported grammar", () => {
  assert.equal(
    parseRequisiteSummary(
      "Successfully completed COMP1110 or COMP1140 AND 6 units of 1000 level MATH.",
    ),
    null,
  );
});

test("evaluates subject units and alternatives from completed courses only", () => {
  const expression = parseRequisiteSummary(
    "24 units of COMP coded courses AND (6 units of MATH OR COMP1600)",
  );
  assert.ok(expression);

  assert.deepEqual(
    evaluateRequisiteExpression(expression, [
      { code: "COMP1100", units: 6 },
      { code: "COMP1110", units: 6 },
      { code: "COMP2100", units: 6 },
      { code: "COMP2300", units: 6 },
      { code: "MATH1005", units: 6 },
    ]),
    {
      kind: "group",
      operator: "all_of",
      satisfied: true,
      conditions: [
        {
          kind: "subject_units",
          subject: "COMP",
          requiredUnits: 24,
          completedUnits: 24,
          satisfied: true,
        },
        {
          kind: "group",
          operator: "any_of",
          satisfied: true,
          conditions: [
            {
              kind: "subject_units",
              subject: "MATH",
              requiredUnits: 6,
              completedUnits: 6,
              satisfied: true,
            },
            { kind: "course", code: "COMP1600", satisfied: false },
          ],
        },
      ],
    },
  );
});
