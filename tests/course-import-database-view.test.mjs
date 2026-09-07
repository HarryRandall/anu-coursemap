import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function loadDatabaseView() {
  const sourcePath = new URL(
    "../lib/coursemap/course-import-database-view.ts",
    import.meta.url,
  );
  const source = await readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const directory = await mkdtemp(join(tmpdir(), "coursemap-database-view-"));
  const target = join(directory, "course-import-database-view.js");
  await writeFile(target, compiled);
  return import(pathToFileURL(target).href);
}

const { persistedCourseDatabaseTables, projectedCourseDatabaseTables } =
  await loadDatabaseView();

test("projection view names destination tables and shapes their rows", () => {
  const tables = projectedCourseDatabaseTables({
    academicYear: 2026,
    courseCode: "COMP3600",
    projectionSha256: "abc123",
    snapshot: {
      offeringStatus: "offered",
      subjectCode: "COMP",
      title: "Artificial Intelligence",
    },
    unitOptions: [],
    fees: [{ amount: 1000, feeYear: 2026, position: 0 }],
    areasOfInterest: [],
    attributes: [],
    relatedCourses: [],
    courseOffering: { deliveryMode: "In person", location: "Acton" },
    offeringSessions: [],
    learningOutcomes: [],
    assessmentItems: [],
    assessmentOutcomes: [],
    rules: [
      {
        key: "prerequisite",
        ruleKind: "prerequisite",
        hardness: "hard",
        sourceText: "Complete COMP1600.",
      },
    ],
    ruleGroups: [],
    ruleConditions: [],
    ruleConditionCourses: [],
    ruleCourseReferences: [],
  });

  assert.deepEqual(tables[0], {
    name: "courses",
    rows: [{ code: "COMP3600" }],
  });
  const snapshotRow = tables.find(({ name }) => name === "course_snapshots")
    .rows[0];
  assert.equal(snapshotRow.academic_year_id, "<academic_years 2026>");
  assert.equal(snapshotRow.course_year_id, "<course_years COMP3600 2026>");
  assert.equal(snapshotRow.origin, "import");
  assert.equal(snapshotRow.offering_status, "offered");
  assert.equal(snapshotRow.projection_sha256, "abc123");
  assert.equal(snapshotRow.source_page_id, "<source page id>");
  assert.equal(snapshotRow.subject_code, "COMP");
  assert.equal(snapshotRow.title, "Artificial Intelligence");
  assert.equal(
    tables.find(({ name }) => name === "course_fees").rows[0].fee_year,
    2026,
  );
  assert.equal(
    tables.find(({ name }) => name === "course_rules").rows[0].rule_kind,
    "prerequisite",
  );
});

test("persisted view exposes exact saved table rows including empty tables", () => {
  const tables = persistedCourseDatabaseTables({
    snapshot: { id: 42, title: "Artificial Intelligence" },
    relationalData: {
      fees: [{ id: 7, amount: 1000 }],
      ruleConditions: [],
      unknownFutureKey: [{ id: 9 }],
    },
  });

  assert.deepEqual(tables, [
    {
      name: "course_snapshots",
      rows: [{ id: 42, title: "Artificial Intelligence" }],
    },
    { name: "course_fees", rows: [{ id: 7, amount: 1000 }] },
    { name: "course_rule_conditions", rows: [] },
  ]);
});

const proposalSource = await readFile(
  new URL("../lib/coursemap/catalogue-proposal-comparison.ts", import.meta.url),
  "utf8",
);
const proposalModule = ts.transpileModule(proposalSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { compareCatalogueProposal } = await import(
  `data:text/javascript;base64,${Buffer.from(proposalModule).toString("base64")}`
);

test("proposal review preserves source wording that is the requirement itself", () => {
  const old = {
    unmodelledRequirements: [
      { sourceText: "Permission required", sourceLocator: "#rules" },
    ],
  };
  const next = {
    unmodelledRequirements: [
      { sourceText: "Complete 12 units", sourceLocator: "#rules-v2" },
    ],
  };
  assert.deepEqual(compareCatalogueProposal(old, next), [
    {
      key: "unmodelledRequirements",
      before: [{ sourceText: "Permission required" }],
      after: [{ sourceText: "Complete 12 units" }],
    },
  ]);
  assert.equal(
    compareCatalogueProposal(null, next)[0].after[0].sourceText,
    "Complete 12 units",
  );
});

test("proposal comparison ignores hashes but retains removals and field changes", () => {
  const before = {
    projectionSha256: "old",
    snapshot: { title: "Old", description: "Removed" },
    attributes: [],
  };
  const after = {
    projectionSha256: "new",
    snapshot: { title: "New" },
    attributes: [],
  };
  assert.deepEqual(compareCatalogueProposal(before, after), [
    { key: "title", before: "Old", after: "New" },
    { key: "description", before: "Removed", after: null },
  ]);
});
