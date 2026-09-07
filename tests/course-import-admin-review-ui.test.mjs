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
const importsListPath = new URL(
  "../components/admin/imports/imports-list.tsx",
  import.meta.url,
);
const adminCoursePagePath = new URL(
  "../app/admin/courses/[id]/page.tsx",
  import.meta.url,
);
const adminCoursePreviewPath = new URL(
  "../lib/coursemap/admin-course-preview.ts",
  import.meta.url,
);
const adminCourseListPath = new URL(
  "../app/admin/courses/course-list.tsx",
  import.meta.url,
);
const directorySelectionBarPath = new URL(
  "../components/admin/directory-selection-bar.tsx",
  import.meta.url,
);
const yearPickerPath = new URL(
  "../components/ui/year-picker.tsx",
  import.meta.url,
);
const filterBarPath = new URL(
  "../components/ui/filter-bar.tsx",
  import.meta.url,
);
const sortMenuPath = new URL("../components/ui/sort-menu.tsx", import.meta.url);

test("uses the shared directory management pattern on the course list", async () => {
  const source = await readFile(adminCourseListPath, "utf8");
  assert.match(source, /<ConfirmDialog/u);
  assert.match(
    source,
    /Nothing is imported and no drafts or published content change/u,
  );
  assert.match(source, /<SortMenu/u);
  assert.match(source, /<WorkflowStatus/u);
  assert.match(source, /<DirectorySelectionBar/u);
  assert.match(source, /onImport=\{\(model\) => void startImport\(model\)\}/u);
  assert.match(source, /requestedModel,/u);
  assert.match(source, /coursePublicId.*record\.year/u);
  assert.match(source, /href:.*\/courses\/.*record\.code/u);
  assert.doesNotMatch(source, /<TableHead>Directory<\/TableHead>/u);
  assert.doesNotMatch(source, /Import selected<\/Button>/u);
});

test("waits for a saved import model before queueing with that model", async () => {
  const source = await readFile(directorySelectionBarPath, "utf8");
  assert.match(
    source,
    /disabled=\{disabledReason !== null \|\| savingModel \|\| submitting\}/u,
  );
  assert.match(source, /onClick=\{\(\) => onImport\(model\)\}/u);
});

test("keeps the compact year picker inline and puts All last", async () => {
  const [courseSource, pickerSource] = await Promise.all([
    readFile(adminCourseListPath, "utf8"),
    readFile(yearPickerPath, "utf8"),
  ]);
  assert.match(
    courseSource,
    /className="flex items-center justify-between gap-3"/u,
  );
  assert.match(pickerSource, /allLabel = "All"/u);
  assert.match(
    pickerSource,
    /ordered\.map[\s\S]*allowAll \? \[\{ value: "all", label: allLabel \}\]/u,
  );
});

test("gives Radix popovers a concrete trigger inside tooltips", async () => {
  const sources = await Promise.all([
    readFile(filterBarPath, "utf8"),
    readFile(sortMenuPath, "utf8"),
    readFile(directorySelectionBarPath, "utf8"),
  ]);
  for (const source of sources) {
    assert.match(source, /<Tooltip[\s\S]*<PopoverTrigger asChild>/u);
    assert.doesNotMatch(source, /<PopoverTrigger asChild>\s*<Tooltip/u);
  }
});

test("keeps imports read-only with pipeline and inspection tabs", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  assert.match(source, /<Tabs defaultValue="pipeline"/);
  const labels = [
    "Pipeline",
    "Source and artefacts",
    "Database rows",
    "Course preview",
  ];
  let previous = -1;
  for (const label of labels) {
    const position = source.indexOf(`>${label}</TabsTrigger>`);
    assert.ok(position > previous, `${label} appears in order`);
    previous = position;
  }
  assert.match(source, /<ImportInspectionActions/);
  assert.doesNotMatch(
    source,
    /acceptCourseImportTarget|rejectCourseImportTarget|Saved value/,
  );
  assert.doesNotMatch(source, /<TabsTrigger value="changes">/);
});

test("provides a full candidate preview without redundant explanations", async () => {
  const source = await readFile(targetReviewPath, "utf8");
  assert.match(source, /<CourseDetailTabsList \/>/);
  assert.match(source, /<CourseDetailView/);
  assert.doesNotMatch(
    source,
    /full student-facing course view|These are the exact candidate/,
  );
  assert.match(source, /artifacts=\{detail.artifacts\}/);
});

test("keeps saved and planned rows together while retaining artefact attempts", async () => {
  const [
    artifactSource,
    databaseRowsSource,
    tableSource,
    sharedViewer,
    databaseViewer,
    dataSource,
  ] = await Promise.all([
    readFile(artifactViewerPath, "utf8"),
    readFile(databaseRowsPath, "utf8"),
    readFile(databaseRowTablePath, "utf8"),
    readFile(
      new URL(
        "../components/admin/imports/import-artefact-viewer.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/admin/imports/import-database-rows.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/admin/imports/import-artefact-data.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.match(artifactSource, /<ImportArtefactViewer/);
  assert.match(databaseRowsSource, /project=\{projectedCourseDatabaseTables\}/);
  assert.match(
    databaseViewer,
    /<TabsTrigger value="saved">Saved<\/TabsTrigger>/,
  );
  assert.match(
    databaseViewer,
    /<TabsTrigger value="planned">Planned<\/TabsTrigger>/,
  );
  assert.match(databaseViewer, /Original projection JSON/);
  assert.match(dataSource, /entry\.kind !== "database_projection"/);
  assert.match(tableSource, /normaliseImportDatabaseTable\(rows\)/);
  assert.match(tableSource, /importDatabaseFieldLabel\(column\)/);
  assert.match(
    sharedViewer,
    /useImportArtefact\(\s*artifact,\s*endpoint,?\s*\)/,
  );
  assert.match(sharedViewer, /Choose \$\{label\} attempt/);
  assert.doesNotMatch(sharedViewer, /bg-black|bg-zinc-950/);
});

test("addresses imports by target id and keeps the run out of the URL", async () => {
  const [listSource, targetSource] = await Promise.all([
    readFile(importsListPath, "utf8"),
    readFile(targetReviewPath, "utf8"),
  ]);
  assert.match(listSource, /\$\{importsPath\}\/\$\{record\.id\}/);
  assert.doesNotMatch(listSource, /\/runs\//);
  assert.doesNotMatch(listSource, /runNumber/);
  // The run still names itself on the review page, it just never routes.
  assert.match(targetSource, /Run #\{detail\.run\.runNumber\}/);
});

test("keeps the requisite editor and complete student-preview chain", async () => {
  const [pageSource, previewSource, reviewSource, editorSource] =
    await Promise.all([
      readFile(adminCoursePagePath, "utf8"),
      readFile(adminCoursePreviewPath, "utf8"),
      readFile(
        new URL("../app/admin/courses/[id]/course-review.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../components/admin/course-snapshot-rule-editor.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(pageSource, /publishedPrerequisites/);
  assert.match(previewSource, /prerequisiteEdgesWithSnapshotFallback/);
  assert.match(previewSource, /course\.prerequisiteEdges/);
  assert.match(reviewSource, /value="requisites"/);
  assert.match(reviewSource, /CourseRequisites|Edit requisite|Edit rule tree/);
  assert.match(editorSource, />Rule builder</);
  assert.match(editorSource, />Diagram</);
  assert.match(editorSource, /<RequisiteRuleTree/);
  assert.match(editorSource, /<RequisiteRuleGraph/);
});
