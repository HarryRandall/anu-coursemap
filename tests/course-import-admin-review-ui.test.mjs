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
  assert.match(source, /coursePublicId.*data\.year\.year/u);
  assert.match(source, /href=.*\/courses\/.*record\.code/u);
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
    /ordered\.map[\s\S]*\{allowAll \? \([\s\S]*\{allLabel\}/u,
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
  assert.match(tableSource, /className="h-12"/);
  assert.match(tableSource, /max-w-\[28rem\]/);
  assert.match(tableSource, /overflow-x-auto overflow-y-hidden/);
  assert.match(artifactSource, /const grouped = useMemo/);
  assert.match(artifactSource, /<Select/);
  assert.match(artifactSource, /Attempt \$\{artifact\.attemptNumber\}/);
  assert.doesNotMatch(
    artifactSource,
    /` · attempt \$\{artifact\.attemptNumber\}`/,
  );
  assert.doesNotMatch(artifactSource, /bg-black|bg-zinc-950/);
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
  assert.match(reviewSource, /Edit rule tree/);
  assert.match(editorSource, />List</);
  assert.match(editorSource, />Diagram</);
  assert.match(editorSource, /<RequisiteRuleTree/);
  assert.match(editorSource, /<RequisiteRuleGraph/);
});
