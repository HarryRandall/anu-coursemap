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

test("keeps structure imports read-only with pipeline first", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  assert.match(source, /<Tabs defaultValue="pipeline"/);
  assert.match(source, /<ImportInspectionActions/);
  assert.match(source, /<AcademicStructureImportPreview/);
  assert.doesNotMatch(
    source,
    /acceptAcademicStructureImportTarget|publishAcademicStructureDraft|Reject candidate/,
  );
  assert.doesNotMatch(source, /<TabsTrigger value="review">/);
});

test("shows complete candidate relational areas and concrete database tables", async () => {
  const [previewSource, rowsSource, tableSource, requirementsSource] =
    await Promise.all([
      readFile(
        new URL(
          "../components/admin/imports/academic-structure-import-preview.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../lib/coursemap/academic-structure-import-database-view.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(databaseRowTablePath, "utf8"),
      readFile(
        new URL(
          "../components/admin/imports/academic-structure-import-requirements.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);
  for (const requiredArea of [
    "Requirements",
    "Fees",
    "Relationships",
    "Learning outcomes",
    "Evidence and confidence",
  ]) {
    assert.match(previewSource, new RegExp(requiredArea));
  }
  assert.match(requirementsSource, /conditionUnits/);
  assert.doesNotMatch(
    previewSource,
    /Boolean\(|No fee rows|No relationships recorded/,
  );
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
  assert.match(tableSource, /<TableCaption className="sr-only">/);
  assert.match(tableSource, /table\.columns\.map/);
  assert.match(tableSource, /formatImportDatabaseValue/);
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

test("uses the shared artefact viewer and planned database inspector", async () => {
  const [source, rowsSource] = await Promise.all([
    readFile(artifactViewerPath, "utf8"),
    readFile(databaseRowsPath, "utf8"),
  ]);
  assert.match(source, /<ImportArtefactViewer/);
  assert.match(
    source,
    /endpoint="\/api\/admin\/academic-structure-imports\/artifacts"/,
  );
  assert.match(rowsSource, /<ImportDatabaseRows/);
  assert.match(
    rowsSource,
    /project=\{projectedAcademicStructureDatabaseTables\}/,
  );
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
