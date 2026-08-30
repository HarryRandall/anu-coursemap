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
