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
const {
  adminAcademicStructureCollectionPath,
  adminAcademicStructureDetailPath,
  legacyAdminAcademicStructureCollectionRedirect,
} = await import("../lib/coursemap/academic-structure-routes.ts");

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

test("builds distinct admin collection and detail routes for every structure kind", () => {
  const expected = {
    programme: "/admin/programmes",
    major: "/admin/majors",
    minor: "/admin/minors",
    specialisation: "/admin/specialisations",
  };

  for (const [kind, path] of Object.entries(expected)) {
    assert.equal(adminAcademicStructureCollectionPath(kind), path);
    assert.equal(
      adminAcademicStructureDetailPath({
        kind,
        publicId: "00000000-0000-4000-8000-000000000001",
        year: 2026,
      }),
      `${path}/00000000-0000-4000-8000-000000000001?year=2026`,
    );
  }
});

test("redirects old kind query URLs to the matching collection route", () => {
  assert.equal(
    legacyAdminAcademicStructureCollectionRedirect({
      availability: "available",
      kind: "major",
      page: "2",
      q: "data science",
      status: "published",
      year: "2026",
    }),
    "/admin/majors?availability=available&page=2&q=data+science&status=published&year=2026",
  );
  assert.equal(
    legacyAdminAcademicStructureCollectionRedirect({ kind: "minor" }),
    "/admin/minors",
  );
  assert.equal(
    legacyAdminAcademicStructureCollectionRedirect({ kind: "specialisation" }),
    "/admin/specialisations",
  );
  assert.equal(
    legacyAdminAcademicStructureCollectionRedirect({ kind: "" }),
    "/admin/programmes",
  );
  assert.equal(
    legacyAdminAcademicStructureCollectionRedirect({ kind: "unknown" }),
    "/admin/programmes",
  );
  assert.equal(
    legacyAdminAcademicStructureCollectionRedirect({ year: "2026" }),
    null,
  );
});

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

test("each structure kind has separate collection and detail routes", async () => {
  const [
    pages,
    detailPages,
    sharedPage,
    component,
    routes,
    sidebar,
    breadcrumbs,
    legacyPage,
  ] = await Promise.all([
    Promise.all(
      ["programmes", "majors", "minors", "specialisations"].map((route) =>
        readFile(
          new URL(`../app/admin/${route}/page.tsx`, import.meta.url),
          "utf8",
        ),
      ),
    ),
    Promise.all(
      ["programmes", "majors", "minors", "specialisations"].map((route) =>
        readFile(
          new URL(`../app/admin/${route}/[id]/page.tsx`, import.meta.url),
          "utf8",
        ),
      ),
    ),
    readFile(
      new URL(
        "../components/admin/academic-structures/structure-directory-page.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/admin/academic-structures/structure-directory-list.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../lib/coursemap/academic-structure-routes.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/shell/sidebar.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/shell/breadcrumbs.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/admin/programmes/page.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  for (const [index, kind] of [
    "programme",
    "major",
    "minor",
    "specialisation",
  ].entries()) {
    assert.match(pages[index], new RegExp(`kind="${kind}"`, "u"));
    assert.match(detailPages[index], new RegExp(`expectedKind="${kind}"`, "u"));
  }
  for (const route of ["programmes", "majors", "minors", "specialisations"]) {
    assert.match(routes, new RegExp(`/admin/${route}`, "u"));
    assert.match(sidebar, new RegExp(`/admin/${route}`, "u"));
    assert.match(breadcrumbs, new RegExp(`${route}:`, "u"));
  }
  assert.match(sharedPage, /year\?: string \| string\[\]/u);
  assert.doesNotMatch(
    component,
    /DirectoryTabs|Academic structure type|\/admin\/programmes\?kind=/u,
  );
  assert.match(
    legacyPage,
    /legacyAdminAcademicStructureCollectionRedirect\(params\)/u,
  );
  assert.match(
    component,
    /adminAcademicStructureCollectionPath\(data\.kind\)/u,
  );
  assert.match(component, /adminAcademicStructureDetailPath/u);
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
