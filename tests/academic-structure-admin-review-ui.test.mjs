import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const targetReviewPath = new URL(
  "../components/admin/imports/academic-structure-import-target-review.tsx",
  import.meta.url,
);
const databaseRowsPath = new URL(
  "../components/admin/imports/academic-structure-import-database-rows.tsx",
  import.meta.url,
);
const artifactViewerPath = new URL(
  "../components/admin/imports/academic-structure-import-artifact-viewer.tsx",
  import.meta.url,
);
const databaseRowTablePath = new URL(
  "../components/admin/imports/import-database-row-table.tsx",
  import.meta.url,
);
const importsListPath = new URL(
  "../components/admin/imports/imports-list.tsx",
  import.meta.url,
);
const programmeReviewPath = new URL(
  "../app/admin/programmes/[id]/programme-review.tsx",
  import.meta.url,
);
const requirementsViewPath = new URL(
  "../app/requirements/requirements.tsx",
  import.meta.url,
);

test("makes the pipeline the first and default structure review tab", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  assert.match(source, /<Tabs defaultValue="pipeline">/);
  const pipeline = source.indexOf(
    '<TabsTrigger value="pipeline">Pipeline</TabsTrigger>',
  );
  const candidate = source.indexOf(
    '<TabsTrigger value="candidate">Candidate</TabsTrigger>',
  );
  const review = source.indexOf(
    '<TabsTrigger value="review">Review</TabsTrigger>',
  );
  assert.ok(pipeline >= 0);
  assert.ok(candidate > pipeline);
  assert.ok(review > candidate);
  assert.doesNotMatch(source, /Student preview/);
});

test("keeps draft acceptance and publication as separate confirmations", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  assert.match(source, /confirmLabel="Accept as draft"/);
  assert.match(source, /confirmLabel="Publish draft"/);
  assert.match(source, /acceptAcademicStructureImportTarget/);
  assert.match(source, /publishAcademicStructureDraft/);
  assert.match(source, /detail\.target\.processingStatus === "succeeded"/);
  assert.match(source, /\["needs_review", "unchanged"\]/);
});

test("shows complete candidate relational areas and concrete database tables", async () => {
  const [targetSource, rowsSource, tableSource] = await Promise.all([
    readFile(targetReviewPath, "utf8"),
    readFile(databaseRowsPath, "utf8"),
    readFile(databaseRowTablePath, "utf8"),
  ]);
  for (const requiredArea of [
    "Requirements",
    "Fees",
    "Relationships",
    "Learning outcomes",
    "Evidence and confidence",
  ]) {
    assert.match(targetSource, new RegExp(requiredArea));
  }
  assert.match(targetSource, /conditionUnits/);
  assert.match(targetSource, /Whole import/);
  for (const table of [
    "academic_structures",
    "academic_structure_years",
    "academic_structure_snapshots",
    "academic_structure_fees",
    "academic_structure_snapshot_relationships",
    "academic_structure_requirement_groups",
    "academic_structure_requirement_conditions",
    "academic_structure_requirement_options",
    "academic_structure_review_items",
  ]) {
    assert.match(rowsSource, new RegExp(table));
  }
  assert.match(rowsSource, /fee_year: row\.feeYear/);
  assert.match(rowsSource, /requirement_group_id:/);
  assert.match(rowsSource, /<ImportDatabaseRowTable/);
  assert.match(tableSource, /<TableCaption>/);
  assert.match(tableSource, /table\.columns\.map/);
  assert.match(tableSource, /JSON\.stringify\(value\)/);
  assert.match(tableSource, /className="h-12"/);
  assert.match(tableSource, /max-w-\[28rem\]/);
  assert.match(tableSource, /overflow-x-auto overflow-y-hidden/);
  assert.match(tableSource, /whitespace-nowrap/);
});

test("lists structure imports without exposing the batching run", async () => {
  const [listSource, targetSource] = await Promise.all([
    readFile(importsListPath, "utf8"),
    readFile(targetReviewPath, "utf8"),
  ]);
  assert.match(listSource, /\$\{importsPath\}\/\$\{record\.id\}/);
  assert.doesNotMatch(listSource, /runNumber/);
  assert.doesNotMatch(listSource, />\{run\.id\}</);
  assert.match(targetSource, /Run #\{detail\.run\.runNumber\}/);
});

test("renders JSON artefacts and database projections with the light viewer", async () => {
  const source = await readFile(artifactViewerPath, "utf8");
  assert.match(source, /<JsonCode/);
  assert.match(source, /projectedAcademicStructureDatabaseTables\(parsed\)/);
  assert.match(source, /\/api\/admin\/academic-structure-imports\/artifacts\//);
  assert.match(source, /const grouped = useMemo/);
  assert.match(source, /<Select/);
  assert.match(source, /Attempt \$\{artifact\.attemptNumber\}/);
  assert.doesNotMatch(source, /` · attempt \$\{artifact\.attemptNumber\}`/);
  assert.doesNotMatch(source, /bg-black|bg-zinc-950/);
});

test("renders combined subject and level requirements without inflating levels", async () => {
  const [programmeSource, requirementsSource] = await Promise.all([
    readFile(programmeReviewPath, "utf8"),
    readFile(requirementsViewPath, "utf8"),
  ]);

  assert.match(requirementsSource, /function levelCourseDescription/u);
  assert.match(
    requirementsSource,
    /\$\{condition\.subjectCode\} \$\{levels\.toLowerCase\(\)\}/u,
  );
  assert.doesNotMatch(programmeSource, /minimumLevel\}00/u);
  assert.doesNotMatch(programmeSource, /maximumLevel\}00/u);
});
