import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionsPath = new URL(
  "../lib/coursemap/academic-structure-import-review-actions.ts",
  import.meta.url,
);
const publicationActionsPath = new URL(
  "../lib/coursemap/catalogue-publication-actions.ts",
  import.meta.url,
);
const targetPagePath = new URL(
  "../app/admin/imports/structures/runs/[runId]/targets/[targetId]/page.tsx",
  import.meta.url,
);
const targetReviewPath = new URL(
  "../components/admin/imports/academic-structure-import-target-review.tsx",
  import.meta.url,
);
const loaderPath = new URL(
  "../lib/coursemap/admin-academic-structure-imports.ts",
  import.meta.url,
);
const artifactRoutePath = new URL(
  "../app/api/admin/academic-structure-imports/artifacts/[artifactId]/route.ts",
  import.meta.url,
);

test("reviews through the target RPC and only accepts explicit decisions", async () => {
  const source = await readFile(actionsPath, "utf8");
  assert.match(source, /review_academic_structure_import_target/);
  assert.match(source, /decision: "accepted" \| "rejected"/);
  assert.match(source, /return decide\("accepted", input\)/);
  assert.match(source, /return decide\("rejected", input\)/);
  assert.doesNotMatch(source, /auto.?accept/iu);
});

test("publishes the exact current draft through a separate action", async () => {
  const source = await readFile(actionsPath, "utf8");
  assert.match(source, /publish_academic_structure_snapshot/);
  assert.match(source, /canWriteCatalogue\(\)/);
  assert.match(source, /p_structure_year_id: input\.structureYearId/);
  assert.match(source, /p_snapshot_id: input\.snapshotId/);
  assert.match(source, /It has not been published/);
});

test("all structure publication entry points use catalogue write permission", async () => {
  const [importAction, publicationAction, targetPage, targetReview] =
    await Promise.all([
      readFile(actionsPath, "utf8"),
      readFile(publicationActionsPath, "utf8"),
      readFile(targetPagePath, "utf8"),
      readFile(targetReviewPath, "utf8"),
    ]);

  assert.match(importAction, /canWriteCatalogue\(\)/u);
  assert.match(publicationAction, /canWriteCatalogue\(\)/u);
  assert.doesNotMatch(publicationAction, /canManageCatalogueImports/u);
  assert.match(targetPage, /canWriteCatalogue\(\)/u);
  assert.match(targetPage, /canPublish=\{canPublish\}/u);
  assert.match(targetReview, /canPublishCatalogue &&\s+accepted/u);
  assert.match(
    targetReview,
    /accepted && !alreadyPublished && canPublishCatalogue/u,
  );
});

test("loads the full candidate snapshot-native projection", async () => {
  const source = await readFile(loaderPath, "utf8");
  for (const table of [
    "academic_structure_snapshot_sections",
    "academic_structure_summary_fields",
    "academic_structure_learning_outcomes",
    "academic_structure_fees",
    "academic_structure_snapshot_relationships",
    "academic_structure_requirement_groups",
    "academic_structure_requirement_conditions",
    "academic_structure_requirement_options",
    "academic_structure_unmodelled_requirements",
    "academic_structure_snapshot_evidence",
    "academic_structure_review_items",
  ]) {
    assert.match(source, new RegExp(table));
  }
  assert.match(source, /runNumber: runMetadata\.run_number/);
});

test("serves verified private artefacts as inert text", async () => {
  const source = await readFile(artifactRoutePath, "utf8");
  assert.match(source, /academic_structure_import_artifacts/);
  assert.match(source, /readCourseImportArtifact/);
  assert.match(source, /COURSE_IMPORT_ARTIFACT_BUCKET/);
  assert.match(source, /default-src 'none'; sandbox/);
  assert.match(source, /text\/plain; charset=utf-8/);
  assert.match(source, /nosniff/);
});
