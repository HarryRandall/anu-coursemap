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

test("strips enrolment preambles before parsing the rule content", () => {
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course you must have completed CHEM1201.",
    ),
    { kind: "course", code: "CHEM1201" },
  );
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course students must have completed 24 units of ARAB coded courses.",
    ),
    { kind: "subject_units", subject: "ARAB", units: 24 },
  );
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in AATD2001, students must have completed at least 24 units of tertiary study.",
    ),
    { kind: "units_total", units: 24 },
  );
});

test("parses level-gated unit rules with and without a subject", () => {
  assert.deepEqual(
    parseRequisiteSummary("12 units of 6000-level COMP courses"),
    {
      kind: "level_units",
      units: 12,
      level: 6000,
      subject: "COMP",
    },
  );
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course you must have completed 12 units of 1000 level courses",
    ),
    { kind: "level_units", units: 12, level: 1000 },
  );
});

test("treats clause separators as the loosest binding operator", () => {
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course you must have completed EMSC2021, as well as MATH1003 or MATH1013 or MATH1115.",
    ),
    {
      kind: "group",
      operator: "all_of",
      conditions: [
        { kind: "course", code: "EMSC2021" },
        {
          kind: "group",
          operator: "any_of",
          conditions: [
            { kind: "course", code: "MATH1003" },
            { kind: "course", code: "MATH1013" },
            { kind: "course", code: "MATH1115" },
          ],
        },
      ],
    },
  );
});

test("resolves list commas from their terminating conjunction only", () => {
  assert.deepEqual(parseRequisiteSummary("COMP1100, COMP1110 and COMP2100"), {
    kind: "group",
    operator: "all_of",
    conditions: [
      { kind: "course", code: "COMP1100" },
      { kind: "course", code: "COMP1110" },
      { kind: "course", code: "COMP2100" },
    ],
  });
  assert.deepEqual(parseRequisiteSummary("COMP1100, COMP1110, or COMP1730"), {
    kind: "group",
    operator: "any_of",
    conditions: [
      { kind: "course", code: "COMP1100" },
      { kind: "course", code: "COMP1110" },
      { kind: "course", code: "COMP1730" },
    ],
  });
  assert.equal(parseRequisiteSummary("COMP1100, COMP1110"), null);
});

test("refuses clauses that mix bare and/or without parentheses", () => {
  assert.equal(
    parseRequisiteSummary(
      "To enrol in this course you must have successfully completed: COMP1110 or COMP1140 AND 6 units of 1000 level MATH.",
    ),
    null,
  );
  assert.ok(
    parseRequisiteSummary(
      "(COMP1110 or COMP1140) AND 6 units of 1000 level MATH",
    ),
  );
});

test("evaluates level and total unit progress from completed courses", () => {
  const levelExpression = parseRequisiteSummary(
    "12 units of 2000 level COMP courses",
  );
  assert.ok(levelExpression);
  assert.deepEqual(
    evaluateRequisiteExpression(levelExpression, [
      { code: "COMP2100", units: 6 },
      { code: "COMP2300", units: 6 },
      { code: "COMP1100", units: 6 },
      { code: "MATH2222", units: 6 },
    ]),
    {
      kind: "level_units",
      level: 2000,
      subject: "COMP",
      requiredUnits: 12,
      completedUnits: 12,
      satisfied: true,
    },
  );

  const totalExpression = parseRequisiteSummary(
    "at least 24 units of tertiary study",
  );
  assert.ok(totalExpression);
  assert.deepEqual(
    evaluateRequisiteExpression(totalExpression, [
      { code: "COMP1100", units: 6 },
      { code: "MATH1005", units: 6 },
    ]),
    {
      kind: "units_total",
      requiredUnits: 24,
      completedUnits: 12,
      satisfied: false,
    },
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

test("groups 'either A or B' so a surrounding AND stays unambiguous", () => {
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course you must have completed FINM1001, and either STAT1008 or STAT1003.",
    ),
    {
      kind: "group",
      operator: "all_of",
      conditions: [
        { kind: "course", code: "FINM1001" },
        {
          kind: "group",
          operator: "any_of",
          conditions: [
            { kind: "course", code: "STAT1008" },
            { kind: "course", code: "STAT1003" },
          ],
        },
      ],
    },
  );
});

test("groups a leading 'either' and its comma-separated alternatives", () => {
  assert.deepEqual(parseRequisiteSummary("Either COMP1100 or COMP1110"), {
    kind: "group",
    operator: "any_of",
    conditions: [
      { kind: "course", code: "COMP1100" },
      { kind: "course", code: "COMP1110" },
    ],
  });
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course you must have completed either MATH1013, MATH1115 or MATH1116, as well as COMP1600.",
    ),
    {
      kind: "group",
      operator: "all_of",
      conditions: [
        {
          kind: "group",
          operator: "any_of",
          conditions: [
            { kind: "course", code: "MATH1013" },
            { kind: "course", code: "MATH1115" },
            { kind: "course", code: "MATH1116" },
          ],
        },
        { kind: "course", code: "COMP1600" },
      ],
    },
  );
});

test("groups 'both A and B' inside a wider alternation", () => {
  assert.deepEqual(
    parseRequisiteSummary("COMP1100 or both MATH1013 and MATH1014"),
    {
      kind: "group",
      operator: "any_of",
      conditions: [
        { kind: "course", code: "COMP1100" },
        {
          kind: "group",
          operator: "all_of",
          conditions: [
            { kind: "course", code: "MATH1013" },
            { kind: "course", code: "MATH1014" },
          ],
        },
      ],
    },
  );
});

test("refuses an alternation marker that introduces no alternatives", () => {
  assert.equal(parseRequisiteSummary("either COMP1100"), null);
  assert.equal(parseRequisiteSummary("either COMP1100 and COMP1110"), null);
});

test("groups 'either' around unit conditions as well as course codes", () => {
  assert.deepEqual(
    parseRequisiteSummary(
      "COMP1600 AND either 6 units of MATH or 12 units of 1000 level courses",
    ),
    {
      kind: "group",
      operator: "all_of",
      conditions: [
        { kind: "course", code: "COMP1600" },
        {
          kind: "group",
          operator: "any_of",
          conditions: [
            { kind: "subject_units", subject: "MATH", units: 6 },
            { kind: "level_units", units: 12, level: 1000 },
          ],
        },
      ],
    },
  );
});

test("maps a programme enrolment requirement alongside a completed course", () => {
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course, you must have completed ACST4031 and be enrolled in Bachelor of Actuarial Studies (Honours) (HACTS) or Bachelor of Social Sciences (Honours in Actuarial Studies and Economics) (ASSAE).",
    ),
    {
      kind: "group",
      operator: "all_of",
      conditions: [
        { kind: "course", code: "ACST4031" },
        {
          kind: "group",
          operator: "any_of",
          conditions: [
            {
              kind: "programme_enrolment",
              code: "HACTS",
              name: "Bachelor of Actuarial Studies (Honours)",
            },
            {
              kind: "programme_enrolment",
              code: "ASSAE",
              name: "Bachelor of Social Sciences (Honours in Actuarial Studies and Economics)",
            },
          ],
        },
      ],
    },
  );
});

test("maps a single programme enrolment requirement", () => {
  assert.deepEqual(
    parseRequisiteSummary(
      "To enrol in this course you must be enrolled in the Master of Computing (MCOMP).",
    ),
    {
      kind: "programme_enrolment",
      code: "MCOMP",
      name: "Master of Computing",
    },
  );
});

test("refuses programme wording that carries no programme code", () => {
  assert.equal(
    parseRequisiteSummary(
      "To enrol in this course you must be enrolled in a graduate programme.",
    ),
    null,
  );
});

test("evaluates programme enrolment against the student's programmes", () => {
  const expression = parseRequisiteSummary(
    "To enrol in this course, you must have completed ACST4031 and be enrolled in Bachelor of Actuarial Studies (Honours) (HACTS) or Bachelor of Social Sciences (Honours in Actuarial Studies and Economics) (ASSAE).",
  );
  assert.ok(expression);

  const enrolled = evaluateRequisiteExpression(
    expression,
    [{ code: "ACST4031", units: 6 }],
    ["HACTS"],
  );
  assert.equal(enrolled.satisfied, true);

  const notEnrolled = evaluateRequisiteExpression(
    expression,
    [{ code: "ACST4031", units: 6 }],
    [],
  );
  assert.equal(notEnrolled.satisfied, false);
  assert.deepEqual(notEnrolled.conditions[1].conditions[0], {
    kind: "programme_enrolment",
    code: "HACTS",
    name: "Bachelor of Actuarial Studies (Honours)",
    satisfied: false,
  });
});
