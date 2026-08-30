import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

const emptyServerOnlyModule =
  "data:text/javascript,export default undefined;export const createClient=async()=>{throw new Error('not available in this test')};";
const configModule =
  "data:text/javascript,export function isDemoMode(){return false}";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: emptyServerOnlyModule };
    }
    if (specifier === "@/lib/supabase/config") {
      return { shortCircuit: true, url: configModule };
    }
    if (specifier === "@/lib/supabase/server") {
      return { shortCircuit: true, url: emptyServerOnlyModule };
    }
    return nextResolve(specifier, context);
  },
});

const { academicStructureDirectoryRecordStatus } =
  await import("../lib/coursemap/admin-academic-structures.ts");

function record(overrides = {}) {
  return {
    draftSnapshotId: null,
    publishedSnapshotId: null,
    latestImport: null,
    ...overrides,
  };
}

function latest(overrides = {}) {
  return {
    processingStatus: "succeeded",
    reviewStatus: "not_required",
    changeKind: null,
    ...overrides,
  };
}

test("derives one clear directory status from processing, review and publication state", () => {
  assert.equal(academicStructureDirectoryRecordStatus(record()), "directory");
  assert.equal(
    academicStructureDirectoryRecordStatus(
      record({ latestImport: latest({ processingStatus: "queued" }) }),
    ),
    "queued",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(
      record({ latestImport: latest({ processingStatus: "running" }) }),
    ),
    "processing",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(
      record({ latestImport: latest({ processingStatus: "cancelled" }) }),
    ),
    "failed",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(
      record({ latestImport: latest({ reviewStatus: "needs_review" }) }),
    ),
    "needs-review",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(record({ publishedSnapshotId: 12 })),
    "published",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(
      record({ draftSnapshotId: 12, publishedSnapshotId: 12 }),
    ),
    "published",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(
      record({ draftSnapshotId: 13, publishedSnapshotId: 12 }),
    ),
    "draft-changes",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(record({ draftSnapshotId: 13 })),
    "draft",
  );
  assert.equal(
    academicStructureDirectoryRecordStatus(
      record({ latestImport: latest({ changeKind: "unchanged" }) }),
    ),
    "unchanged",
  );
});

test("loader reads only the new structure directory and snapshot-native tables", async () => {
  const source = await readFile(
    new URL("../lib/coursemap/admin-academic-structures.ts", import.meta.url),
    "utf8",
  );

  for (const table of [
    "academic_years",
    "academic_structure_directory_statuses",
    "academic_structure_directory_entries",
    "academic_structure_import_targets",
    "academic_structure_import_runs",
    "academic_structures",
    "academic_structure_years",
  ]) {
    assert.match(source, new RegExp(`from\\(\"${table}\"\\)`, "u"));
  }
  assert.doesNotMatch(source, /from\("catalogue_/u);
  assert.doesNotMatch(source, /from\("academic_structure_versions"\)/u);
  assert.match(source, /runNumber: latestRun\.run_number/u);
  assert.match(source, /ACADEMIC_STRUCTURE_IMPORT_YEARS/u);
});

test("launcher keeps kind and year in the URL and submits the exact import contract", async () => {
  const [page, component] = await Promise.all([
    readFile(
      new URL("../app/admin/programmes/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/admin/academic-structures/structure-directory-list.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(page, /kind\?: string \| string\[\]/u);
  assert.match(page, /year\?: string \| string\[\]/u);
  for (const kind of ["programme", "major", "minor", "specialisation"]) {
    assert.match(component, new RegExp(`${kind}:`, "u"));
  }
  assert.match(
    component,
    /\/admin\/programmes\?kind=\$\{kind\}&year=\$\{year\}/u,
  );
  assert.match(component, /\/api\/admin\/academic-structure-directory/u);
  assert.match(component, /\/api\/admin\/academic-structure-imports/u);
  assert.match(component, /structureKind: data\.kind/u);
  assert.match(component, /structureCodes: selected/u);
  assert.match(component, /requestedModel: model/u);
  assert.match(component, /current\.length >= 10/u);
  assert.match(
    component,
    /\/admin\/imports\/structures\/runs\/\$\{payload\.runId\}/u,
  );
  assert.match(component, /Run \{record\.latestImport\.runNumber\}/u);
  assert.match(component, /<FilterBar/u);
  assert.match(
    component,
    /\{ label: "Draft changes", value: "draft-changes" \}/u,
  );
  assert.match(component, /\? "Newer draft"/u);
});
