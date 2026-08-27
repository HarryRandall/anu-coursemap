import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadModule() {
  const directory = await mkdtemp(
    join(tmpdir(), "coursemap-published-requisite-rule-"),
  );
  const source = await readFile(
    new URL("../lib/coursemap/published-requisite-rule.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const path = join(directory, "published-requisite-rule.js");
  await writeFile(path, compiled);
  return import(pathToFileURL(path).href);
}

const { readPublishedRequisiteRule } = await loadModule();

function payload({ conditions, groups }) {
  return {
    confidence: 1,
    review_state: "verified",
    source_text: "Complete COMP1100 and 6 units of MATH-coded courses.",
    groups,
    conditions,
  };
}

const root = {
  id: 1,
  operator: "all_of",
  parent_group_id: null,
  position: 0,
};

const course = {
  condition_kind: "course",
  course_code: "COMP1100",
  group_id: 1,
  minimum_mark: null,
  position: 0,
};

test("reads a complete supported requisite tree", () => {
  const rule = readPublishedRequisiteRule(
    payload({
      groups: [root],
      conditions: [
        course,
        {
          condition_kind: "subject_units",
          group_id: 1,
          minimum_units: 6,
          position: 1,
          subject_code: "MATH",
        },
      ],
    }),
  );

  assert.deepEqual(rule?.expression, {
    kind: "group",
    operator: "all_of",
    conditions: [
      { kind: "course", code: "COMP1100" },
      { kind: "subject_units", subject: "MATH", units: 6 },
    ],
  });
});

test("does not evaluate only the supported subset of a reviewed rule", () => {
  const rule = readPublishedRequisiteRule(
    payload({
      groups: [root],
      conditions: [
        course,
        {
          condition_kind: "gpa",
          group_id: 1,
          minimum_gpa: 5,
          position: 1,
        },
      ],
    }),
  );

  assert.equal(rule?.expression, null);
  assert.equal(
    rule?.sourceText,
    "Complete COMP1100 and 6 units of MATH-coded courses.",
  );
});

test("falls back to source wording for marks and at-least groups", () => {
  const markedCourse = readPublishedRequisiteRule(
    payload({
      groups: [root],
      conditions: [{ ...course, minimum_mark: 65 }],
    }),
  );
  const atLeast = readPublishedRequisiteRule(
    payload({
      groups: [{ ...root, minimum_count: 1, operator: "at_least" }],
      conditions: [course],
    }),
  );

  assert.equal(markedCourse?.expression, null);
  assert.equal(atLeast?.expression, null);
});
