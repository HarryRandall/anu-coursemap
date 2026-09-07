import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadTableView() {
  const source = await readFile(
    new URL("../lib/coursemap/import-database-table.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const directory = await mkdtemp(join(tmpdir(), "coursemap-import-table-"));
  const path = join(directory, "import-database-table.js");
  await writeFile(path, compiled);
  return import(pathToFileURL(path).href);
}

const { normaliseImportDatabaseTable } = await loadTableView();

test("derives stable table columns from every database row", () => {
  const table = normaliseImportDatabaseTable([
    { id: 1, title: "First", metadata: { source: "ANU" } },
    { id: 2, published: false },
  ]);

  assert.deepEqual(table.columns, ["id", "title", "metadata", "published"]);
  assert.deepEqual(table.rows[0].metadata, { source: "ANU" });
  assert.equal(table.rows[1].published, false);
});

test("gives non-object and empty-object rows a readable value column", () => {
  assert.deepEqual(normaliseImportDatabaseTable(["raw", null]), {
    columns: ["value"],
    rows: [{ value: "raw" }, { value: null }],
  });
  assert.deepEqual(normaliseImportDatabaseTable([{}]), {
    columns: ["value"],
    rows: [{ value: {} }],
  });
});

test("formats quantities and local timestamps without changing identifiers or dates", async () => {
  const { formatImportDatabaseValue: format } =
    await import("../lib/coursemap/import-database-value.ts");
  assert.equal(format("amount", 12345.67, "Australia/Sydney"), "12,345.67");
  assert.equal(format("course_id", 12345, "Australia/Sydney"), "12345");
  assert.equal(format("academic_year", 2026, "Australia/Sydney"), "2026");
  assert.equal(
    format("starts_on", "2026-09-06", "Australia/Sydney"),
    "2026-09-06",
  );
  assert.equal(
    format("course_id", "<courses AATD1001>", "Australia/Sydney"),
    "<courses AATD1001>",
  );
  assert.match(
    format("created_at", "2026-09-06T23:00:00Z", "Australia/Sydney"),
    /7 Sept 2026.*9:00 am.*Australia\/Sydney/,
  );
  assert.equal(format("active", false, "UTC"), "No");
  assert.equal(format("value", null, "UTC"), "null");
});

test("finds tables by their readable label or original key without altering their rows", async () => {
  const {
    filterImportDatabaseTables,
    importDatabaseFieldLabel,
    importDatabaseTableLabel,
  } = await import("../lib/coursemap/import-database-labels.ts");
  const rows = [{ id: 7, learningOutcomePositions: [1, 2] }];
  const tables = [
    { name: "course_assessment_items", rows },
    { name: "course_learning_outcomes", rows: [] },
  ];
  assert.equal(
    importDatabaseTableLabel("course_assessment_items"),
    "Assessment",
  );
  assert.equal(
    importDatabaseFieldLabel("academic_year_id"),
    "Academic year ID",
  );
  assert.equal(
    importDatabaseFieldLabel("learningOutcomePositions"),
    "Learning Outcome Positions",
  );
  assert.deepEqual(filterImportDatabaseTables(tables, "", false), [tables[0]]);
  assert.deepEqual(filterImportDatabaseTables(tables, "learning", false), []);
  assert.deepEqual(
    filterImportDatabaseTables(tables, "learning outcomes", true),
    [tables[1]],
  );
  assert.deepEqual(
    filterImportDatabaseTables(tables, "course_assessment", false),
    [tables[0]],
  );
  assert.strictEqual(
    filterImportDatabaseTables(tables, "assessment", false)[0].rows,
    rows,
  );
});

test("groups artefact attempts while keeping database projections in their own tab", async () => {
  const { groupImportArtefacts } =
    await import("../components/admin/imports/import-artefact-data.ts");
  const artifact = (id, kind, attemptNumber) => ({
    id,
    kind,
    attemptNumber,
    mediaType: "application/json",
  });
  const first = artifact("first", "model_response", 1);
  const second = artifact("second", "model_response", 2);
  const html = artifact("html", "raw_html", 1);
  const input = [
    first,
    artifact("projection", "database_projection", 1),
    second,
    html,
  ];
  assert.deepEqual(groupImportArtefacts(input), [
    { kind: "raw_html", attempts: [html] },
    { kind: "model_response", attempts: [second, first] },
  ]);
  assert.deepEqual(
    input.map((entry) => entry.id),
    ["first", "projection", "second", "html"],
  );
});

test("shows extraction comparisons only when both original results were recorded", async () => {
  const { extractionConflict } =
    await import("../lib/coursemap/extraction-conflict.ts");
  const conflict = {
    deterministicValue: null,
    modelValue: false,
    retained: "deterministic",
  };
  assert.strictEqual(extractionConflict(conflict), conflict);
  assert.equal(
    extractionConflict({ deterministicValue: [], retained: "deterministic" }),
    null,
  );
  assert.equal(extractionConflict([{ value: "Critical Thinking" }]), null);
  assert.equal(extractionConflict(null), null);
  assert.equal(extractionConflict({ ...conflict, retained: "unknown" }), null);
});
