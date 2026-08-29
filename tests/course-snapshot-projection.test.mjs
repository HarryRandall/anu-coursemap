import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractDeterministicCourse } from "../lib/course-import/deterministic.ts";
import { projectCourseSnapshot } from "../lib/course-import/project-snapshot.ts";
import { COURSE_SNAPSHOT_RELATIONAL_QUERY_SHAPE } from "../lib/coursemap/course-import-query-shape.ts";

const sourceUrl = "https://programsandcourses.anu.edu.au/2026/course/COMP2400";
const html = await readFile(
  new URL(
    "./fixtures/course-import/anu-2026-comp2400-rich.html",
    import.meta.url,
  ),
  "utf8",
);
const extraction = extractDeterministicCourse({
  html,
  courseCode: "COMP2400",
  year: 2026,
  sourceUrl,
});

test("projects every rich field into natural-key relational rows", () => {
  const projection = projectCourseSnapshot(extraction);

  assert.equal(projection.courseCode, "COMP2400");
  assert.equal(projection.academicYear, 2026);
  assert.equal(projection.snapshot.unitValueKind, "fixed");
  assert.equal(projection.snapshot.units, 6);
  assert.deepEqual(
    projection.fees.map(({ position, audience, amount }) => ({
      position,
      audience,
      amount,
    })),
    [
      { position: 1, audience: "commonwealth_supported", amount: null },
      { position: 2, audience: "domestic", amount: 5520 },
      { position: 3, audience: "international", amount: 7020 },
    ],
  );
  assert.deepEqual(projection.areasOfInterest, [
    { position: 1, name: "Information Technology" },
    { position: 2, name: "Software Engineering" },
  ]);
  assert.equal(projection.attributes[0].sourceText.length > 0, true);
  assert.deepEqual(
    projection.offeringSessions.map(
      ({
        position,
        calendarYear,
        classNumber,
        enrolClosesOn,
        censusOn,
        sourceText,
      }) => ({
        position,
        calendarYear,
        classNumber,
        enrolClosesOn,
        censusOn,
        hasSourceText: sourceText.length > 0,
      }),
    ),
    [
      {
        position: 1,
        calendarYear: 2026,
        classNumber: "1234",
        enrolClosesOn: "2026-03-02",
        censusOn: "2026-03-31",
        hasSourceText: true,
      },
    ],
  );
  assert.deepEqual(projection.learningOutcomes, [
    { position: 1, body: "Design a normalised relational schema." },
    { position: 2, body: "Write and evaluate relational queries." },
  ]);
  assert.deepEqual(projection.assessmentOutcomes, [
    { assessmentPosition: 1, learningOutcomePosition: 1 },
    { assessmentPosition: 2, learningOutcomePosition: 1 },
    { assessmentPosition: 2, learningOutcomePosition: 2 },
  ]);
  assert.match(projection.projectionSha256, /^[0-9a-f]{64}$/);
});

test("projection hash is stable and excludes extraction and source metadata", () => {
  const first = projectCourseSnapshot(extraction);
  const metadataOnly = structuredClone(extraction);
  metadataOnly.sourceUpdatedAt = "2026-08-29T00:00:00.000Z";
  metadataOnly.overallConfidence = 0.12;
  metadataOnly.evidence = [
    {
      fieldKey: "title",
      sourceLocator: "Heading",
      evidenceExcerpt: "Relational Databases",
      confidence: 0.12,
      method: "model",
    },
  ];
  metadataOnly.reviewItems = [
    {
      fieldKey: "title",
      kind: "ambiguous",
      severity: "warning",
      message: "An administrator should confirm the title.",
    },
  ];

  assert.equal(
    first.projectionSha256,
    projectCourseSnapshot(structuredClone(extraction)).projectionSha256,
  );
  assert.equal(
    first.projectionSha256,
    projectCourseSnapshot(metadataOnly).projectionSha256,
  );
});

test("projection hash changes for a semantic relational change", () => {
  const changed = structuredClone(extraction);
  changed.fees[1].amount += 1;
  assert.notEqual(
    projectCourseSnapshot(extraction).projectionSha256,
    projectCourseSnapshot(changed).projectionSha256,
  );
});

test("refuses an offering outside the selected extraction year", () => {
  const futureOffering = structuredClone(extraction);
  futureOffering.offerings[0].calendarYear = 2027;
  assert.throws(
    () => projectCourseSnapshot(futureOffering),
    /calendarYear.*match the extraction year/,
  );

  assert.equal(
    projectCourseSnapshot(extraction).offeringSessions.every(
      ({ calendarYear }) => calendarYear === extraction.year,
    ),
    true,
  );
});

test("flattens nested rules without losing typed requisite semantics", () => {
  const nested = structuredClone(extraction);
  nested.requisites = {
    prerequisiteText:
      "Complete COMP1100 and one of COMP1130 or 12 COMP units, plus other requirements.",
    corequisiteText: null,
    incompatibilityText: "Incompatible with COMP6240.",
    prerequisiteRule: {
      op: "all_of",
      rules: [
        { op: "completed", courseCode: "COMP1100" },
        {
          op: "one_of",
          rules: [
            { op: "completed_or_concurrent", courseCode: "COMP1130" },
            {
              op: "min_units_from_subject",
              minimumUnits: 12,
              subjectCode: "COMP",
            },
          ],
        },
        {
          op: "min_units_from_courses",
          minimumUnits: 6,
          courseCodes: ["COMP1730", "COMP1710"],
        },
        { op: "year_standing", minimumYear: 2 },
        { op: "minimum_gpa", value: 5, scale: "anu7" },
        { op: "minimum_gpa", value: 70, scale: "wam100" },
        { op: "enrolled_in", programmeCode: "B-COMP" },
      ],
    },
    corequisiteRule: null,
    incompatibilityCourseCodes: ["COMP6240"],
    softIncompatibilityCourseCodes: ["COMP6250"],
    unmodelledText: ["An interview may also be required."],
  };

  const projection = projectCourseSnapshot(nested);
  const prerequisiteRoot = projection.ruleGroups.find(
    ({ key }) => key === "prerequisite:group:root",
  );
  const nestedChoice = projection.ruleGroups.find(
    ({ key }) => key === "prerequisite:group:1",
  );
  assert.deepEqual(prerequisiteRoot, {
    key: "prerequisite:group:root",
    ruleKey: "prerequisite",
    parentGroupKey: null,
    operator: "all_of",
    minimumCount: null,
    position: 0,
  });
  assert.equal(nestedChoice.parentGroupKey, prerequisiteRoot.key);
  assert.equal(nestedChoice.operator, "any_of");
  assert.equal(nestedChoice.position, 1);

  const completed = projection.ruleConditions.find(
    ({ requiredCourseCode }) => requiredCourseCode === "COMP1100",
  );
  const concurrent = projection.ruleConditions.find(
    ({ requiredCourseCode }) => requiredCourseCode === "COMP1130",
  );
  assert.equal(completed.courseRequirementMode, "completed");
  assert.equal(concurrent.courseRequirementMode, "completed_or_concurrent");
  assert.equal(concurrent.groupKey, nestedChoice.key);

  const courseSet = projection.ruleConditions.find(
    ({ conditionKind }) => conditionKind === "course_set_units",
  );
  assert.equal(courseSet.minimumUnits, 6);
  assert.deepEqual(
    projection.ruleConditionCourses.filter(
      ({ conditionKey }) => conditionKey === courseSet.key,
    ),
    [
      {
        conditionKey: courseSet.key,
        position: 1,
        sourceCourseCode: "COMP1710",
        sourceText: "At least 6 units from COMP1710, COMP1730",
      },
      {
        conditionKey: courseSet.key,
        position: 2,
        sourceCourseCode: "COMP1730",
        sourceText: "At least 6 units from COMP1710, COMP1730",
      },
    ],
  );
  assert.equal(
    projection.ruleConditions.find(
      ({ conditionKind }) => conditionKind === "year_standing",
    ).minimumYear,
    2,
  );
  assert.equal(
    projection.ruleConditions.find(
      ({ conditionKind }) => conditionKind === "gpa",
    ).minimumGpa,
    5,
  );
  assert.equal(
    projection.ruleConditions.find(
      ({ conditionKind }) => conditionKind === "wam",
    ).minimumWam,
    70,
  );
  assert.match(
    projection.ruleConditions.find(
      ({ conditionKind }) => conditionKind === "admission",
    ).freeText,
    /B-COMP/,
  );
  assert.equal(
    projection.ruleConditions.find(
      ({ requiredCourseCode }) => requiredCourseCode === "COMP6250",
    ).hardness,
    "advisory",
  );
  assert.equal(
    projection.ruleConditions.some(
      ({ conditionKind, sourceText }) =>
        conditionKind === "other" && sourceText.includes("interview"),
    ),
    true,
  );
  assert.deepEqual(
    projection.ruleCourseReferences
      .filter(({ ruleKey }) => ruleKey === "prerequisite")
      .map(({ referencedCourseCode }) => referencedCourseCode),
    ["COMP1100", "COMP1130", "COMP1710", "COMP1730"],
  );
});

test("normalises variable unit options into explicit relational rows", () => {
  const variable = structuredClone(extraction);
  variable.unitValue = { kind: "variable", unitsOptions: [12, 6] };
  const projection = projectCourseSnapshot(variable);
  assert.deepEqual(projection.unitOptions, [
    { position: 1, units: 6, label: "6 units", sourceText: "6 units" },
    { position: 2, units: 12, label: "12 units", sourceText: "12 units" },
  ]);
  assert.equal(projection.snapshot.minimumUnits, 6);
  assert.equal(projection.snapshot.maximumUnits, 12);
});

test("uses the deployed snapshot relation columns in admin review queries", () => {
  assert.deepEqual(COURSE_SNAPSHOT_RELATIONAL_QUERY_SHAPE, {
    offeringOrder: "id",
    fieldEvidenceOrder: "field_key",
    conditionCoursesForeignKey: "condition_id",
  });
});
