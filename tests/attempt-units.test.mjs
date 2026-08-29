import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadAttemptUnits() {
  const source = await readFile(
    new URL("../lib/coursemap/attempt-units.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const directory = await mkdtemp(join(tmpdir(), "coursemap-attempt-units-"));
  const target = join(directory, "attempt-units.js");
  await writeFile(target, compiled);
  return import(pathToFileURL(target).href);
}

const { attemptedUnitsError, attemptedUnitsFromInput, attemptUnitRequirement } =
  await loadAttemptUnits();

test("fixed courses do not require a separate unit choice", () => {
  const requirement = attemptUnitRequirement({
    units: 6,
    unitValue: { kind: "fixed", units: 6 },
  });
  assert.deepEqual(requirement, { kind: "fixed", units: 6 });
  assert.equal(attemptedUnitsFromInput(requirement, ""), 6);
});

test("range courses accept only explicit values inside the published range", () => {
  const requirement = attemptUnitRequirement({
    units: 6,
    unitValue: { kind: "range", minimumUnits: 6, maximumUnits: 18 },
  });
  assert.equal(attemptedUnitsFromInput(requirement, ""), null);
  assert.equal(attemptedUnitsFromInput(requirement, "12"), 12);
  assert.equal(attemptedUnitsFromInput(requirement, "24"), null);
  assert.match(attemptedUnitsError(requirement, "24"), /6 to 18/);
});

test("variable courses expose distinct published options", () => {
  const requirement = attemptUnitRequirement({
    units: 6,
    unitValue: {
      kind: "variable",
      options: [
        { label: "Short project", units: 6 },
        { label: "Duplicate", units: 6 },
        { label: "Long project", units: 12 },
      ],
    },
  });
  assert.deepEqual(
    requirement.options.map((option) => option.units),
    [6, 12],
  );
  assert.equal(attemptedUnitsFromInput(requirement, "12"), 12);
  assert.equal(attemptedUnitsFromInput(requirement, "9"), null);
});

test("unknown units cannot be recorded as an invented value", () => {
  const requirement = attemptUnitRequirement({
    units: 0,
    unitValue: { kind: "unknown", options: [] },
  });
  assert.deepEqual(requirement, { kind: "unavailable" });
  assert.equal(attemptedUnitsFromInput(requirement, "4.25"), null);
});
