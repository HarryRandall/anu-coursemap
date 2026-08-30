import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

const serverStub = `data:text/javascript,${[
  "export function isDemoMode(){return false}",
  "export function createPublicClient(){throw new Error('not available in this test')}",
  "export async function courseFromSnapshotProjection(){return null}",
  "export async function loadPublishedCoursesBySelections(){return []}",
  "export async function getAuthViewer(){return null}",
  "export async function createClient(){throw new Error('not available in this test')}",
  "export function collectPlanCatalogueCourseIds(){return []}",
].join(";")}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === "server-only" ||
      specifier === "@/lib/supabase/config" ||
      specifier === "@/lib/supabase/public-server" ||
      specifier === "@/lib/coursemap/published-courses" ||
      specifier === "@/lib/auth/viewer" ||
      specifier === "@/lib/supabase/server" ||
      specifier === "@/lib/coursemap/plan-course-ids"
    ) {
      return { shortCircuit: true, url: serverStub };
    }
    return nextResolve(specifier, context);
  },
});

const { buildAcademicStructureRequirementTree } =
  await import("../lib/coursemap/plan-catalogue.ts");

function group(overrides) {
  return {
    description: null,
    group_key: "requirements:root",
    id: 1,
    maximum_units: null,
    minimum_count: null,
    minimum_units: null,
    operator: "all_of",
    parent_group_id: null,
    position: 1,
    snapshot_id: 70,
    source_locator: "#program-requirements",
    source_text: "Complete all of the following requirements.",
    title: null,
    ...overrides,
  };
}

function condition(overrides) {
  return {
    condition_kind: "unit_total",
    free_text: null,
    id: 10,
    maximum_level: null,
    maximum_units: null,
    minimum_courses: null,
    minimum_level: null,
    minimum_units: 144,
    position: 1,
    projection_key: "requirements:units",
    requirement_group_id: 1,
    snapshot_id: 70,
    source_locator: "#program-requirements",
    source_text: "144 units",
    structure_kind: null,
    subject_code: null,
    tag: null,
    ...overrides,
  };
}

test("rebuilds nested requirement groups with ordered alternatives and options", () => {
  const tree = buildAcademicStructureRequirementTree({
    groups: [
      group({}),
      group({
        group_key: "requirements:choice",
        id: 2,
        operator: "any_of",
        parent_group_id: 1,
        position: 2,
        source_text: "Complete one of COMP1100 or COMP1130.",
      }),
    ],
    conditions: [
      condition({}),
      condition({
        condition_kind: "course_list",
        id: 11,
        minimum_courses: 1,
        minimum_units: null,
        position: 1,
        projection_key: "requirements:comp1100",
        requirement_group_id: 2,
        source_text: "COMP1100",
      }),
      condition({
        condition_kind: "course_list",
        id: 12,
        minimum_courses: 1,
        minimum_units: null,
        position: 2,
        projection_key: "requirements:comp1130",
        requirement_group_id: 2,
        source_text: "COMP1130",
      }),
    ],
    options: [
      {
        id: 20,
        option_code: "COMP1100",
        option_kind: "course",
        position: 1,
        requirement_condition_id: 11,
        snapshot_id: 70,
        structure_kind: null,
      },
      {
        id: 21,
        option_code: "COMP1130",
        option_kind: "course",
        position: 1,
        requirement_condition_id: 12,
        snapshot_id: 70,
        structure_kind: null,
      },
    ],
  });

  assert.equal(tree?.operator, "all_of");
  assert.equal(tree?.children[0]?.type, "condition");
  assert.equal(tree?.children[1]?.type, "group");
  const choice = tree?.children[1];
  assert.equal(choice?.type, "group");
  if (choice?.type !== "group") return;
  assert.equal(choice.operator, "any_of");
  assert.deepEqual(
    choice.children.map((child) =>
      child.type === "condition"
        ? {
            key: child.projectionKey,
            optionCodes: child.options.map((option) => option.code),
          }
        : null,
    ),
    [
      { key: "requirements:comp1100", optionCodes: ["COMP1100"] },
      { key: "requirements:comp1130", optionCodes: ["COMP1130"] },
    ],
  );
});

test("returns no tree when a published snapshot has no relational root", () => {
  assert.equal(
    buildAcademicStructureRequirementTree({
      groups: [],
      conditions: [],
      options: [],
    }),
    null,
  );
});

test("selects the latest year through published programme pointers and loads relational rules", async () => {
  const source = await readFile(
    new URL("../lib/coursemap/plan-catalogue.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /\.eq\("kind", "programme"\)/u);
  assert.match(source, /\.not\("published_snapshot_id", "is", null\)/u);
  assert.match(source, /\.order\("year", \{ ascending: false \}\)/u);
  assert.match(source, /from\("plan_structures"\)/u);
  assert.match(source, /selectedStructureYears\.has\(structureYear\.id\)/u);
  for (const table of [
    "academic_structure_requirement_groups",
    "academic_structure_requirement_conditions",
    "academic_structure_requirement_options",
    "academic_structure_unmodelled_requirements",
  ]) {
    assert.match(source, new RegExp(`from\\("${table}"\\)`, "u"));
  }
  assert.doesNotMatch(source, /from\("requirement_groups"\)/u);
  assert.match(source, /structureRequirements/u);
  assert.doesNotMatch(source, /snapshot\.units === null \? 0/u);
  assert.match(
    source,
    /snapshot\.duration_years === null\s+\? null\s+: Number/u,
  );
});

test("requirements view distinguishes source wording, interpretation and nested alternatives", async () => {
  const source = await readFile(
    new URL("../app/requirements/requirements.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ANU source wording/u);
  assert.match(source, /Structured interpretation/u);
  assert.match(source, /group\.operator === "any_of"/u);
  assert.match(source, />\s*or\s*</u);
  assert.match(source, /state\.profile\.majorCode/u);
  assert.match(source, /Source rules requiring a manual check/u);
  assert.match(
    source,
    /Always confirm enrolment and graduation\s+requirements/u,
  );
});
