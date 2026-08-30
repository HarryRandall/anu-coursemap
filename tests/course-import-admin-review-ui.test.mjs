import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const targetReviewPath = new URL(
  "../components/admin/imports/course-import-target-review.tsx",
  import.meta.url,
);
const artifactViewerPath = new URL(
  "../components/admin/imports/course-import-artifact-viewer.tsx",
  import.meta.url,
);
const databaseRowsPath = new URL(
  "../components/admin/imports/course-import-database-rows.tsx",
  import.meta.url,
);
const databaseRowTablePath = new URL(
  "../components/admin/imports/import-database-row-table.tsx",
  import.meta.url,
);
const runListPath = new URL(
  "../components/admin/imports/course-import-runs.tsx",
  import.meta.url,
);
const runDetailPath = new URL(
  "../components/admin/imports/course-import-run-detail.tsx",
  import.meta.url,
);

test("makes the pipeline the first and default course import review tab", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  assert.match(source, /<Tabs defaultValue="pipeline">/);
  const pipeline = source.indexOf(
    '<TabsTrigger value="pipeline">Pipeline<\/TabsTrigger>',
  );
  const review = source.indexOf(
    '<TabsTrigger value="changes">Review<\/TabsTrigger>',
  );
  const artefacts = source.indexOf(
    '<TabsTrigger value="source">Source and artefacts<\/TabsTrigger>',
  );
  const database = source.indexOf(
    '<TabsTrigger value="database">Database rows<\/TabsTrigger>',
  );
  const preview = source.indexOf(
    '<TabsTrigger value="preview">Course preview<\/TabsTrigger>',
  );
  assert.ok(pipeline >= 0);
  assert.ok(review > pipeline);
  assert.ok(artefacts > review);
  assert.ok(database > artefacts);
  assert.ok(preview > database);
  assert.doesNotMatch(source, />Changes<\/TabsTrigger>/);
});

test("explains review checks and shows readable before and after values", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  assert.match(source, /Checks requiring confirmation/);
  assert.match(source, /extraction warnings or safety checks/);
  assert.match(source, /Course differences/);
  assert.match(source, /Imported values compared with/);
  assert.match(source, /Imported candidate/);
  assert.match(source, /Saved value/);
});

test("keeps draft decisions compact and provides a full candidate course preview", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  const appShell = source.indexOf("<AppShell");
  const accept = source.indexOf('confirmLabel="Accept as draft"');
  const tabs = source.indexOf('<Tabs defaultValue="pipeline">');
  assert.ok(appShell >= 0);
  assert.ok(accept > appShell && accept < tabs);
  assert.match(source, /<CourseDetailTabsList \/>/);
  assert.match(source, /<CourseDetailView/);
  assert.match(source, /full student-facing course view/);
});

test("uses light JSON artefacts and table-shaped database projections", async () => {
  const [artifactSource, databaseRowsSource, tableSource] = await Promise.all([
    readFile(artifactViewerPath, "utf8"),
    readFile(databaseRowsPath, "utf8"),
    readFile(databaseRowTablePath, "utf8"),
  ]);
  assert.match(artifactSource, /<JsonCode/);
  assert.match(artifactSource, /projectedCourseDatabaseTables\(parsed\)/);
  assert.match(artifactSource, /<CourseImportDatabaseRows/);
  assert.match(databaseRowsSource, /<ImportDatabaseRowTable/);
  assert.match(tableSource, /<TableHeader>/);
  assert.match(tableSource, /<TableHead/);
  assert.match(tableSource, /<TableRow/);
  assert.match(tableSource, /<TableCell/);
  assert.match(tableSource, /normaliseImportDatabaseTable\(rows\)/);
  assert.doesNotMatch(artifactSource, /bg-black|bg-zinc-950/);
});

test("uses numeric run labels while keeping UUIDs in internal routes", async () => {
  const [listSource, detailSource, targetSource] = await Promise.all([
    readFile(runListPath, "utf8"),
    readFile(runDetailPath, "utf8"),
    readFile(targetReviewPath, "utf8"),
  ]);
  assert.match(listSource, /#\{run\.runNumber\}/);
  assert.match(listSource, /run \$\{run\.runNumber\}/);
  assert.match(detailSource, /Run #\$\{run\.runNumber\}/);
  assert.match(targetSource, /Run #\$\{detail\.run\.runNumber\}/);
  assert.match(listSource, /runs\/\$\{run\.id\}/);
  assert.match(detailSource, /runs\/\$\{run\.id\}\/targets\/\$\{target\.id\}/);
});
