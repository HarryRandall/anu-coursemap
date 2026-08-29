import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  stableFingerprint,
  stableStringify,
} from "../lib/course-import/canonical.ts";
import {
  COURSE_CODE_PATTERN,
  COURSE_EXTRACTION_JSON_SCHEMA,
  validateCourseExtraction,
} from "../lib/course-import/contract.ts";
import { extractDeterministicCourse } from "../lib/course-import/deterministic.ts";
import {
  buildCourseModelInput,
  convertCourseHtmlToMarkdown,
} from "../lib/course-import/markdown.ts";
import {
  checkCourseExtractionEvidence,
  mergeCourseExtractions,
} from "../lib/course-import/merge.ts";

const sourceUrl = "https://programsandcourses.anu.edu.au/2026/course/COMP2400";
const html = await readFile(
  new URL(
    "./fixtures/course-import/anu-2026-comp2400-rich.html",
    import.meta.url,
  ),
  "utf8",
);

const markdown = convertCourseHtmlToMarkdown({
  html,
  courseCode: "COMP2400",
  year: 2026,
  sourceUrl,
});
const selected = buildCourseModelInput(markdown.markdown, 2026);
const deterministic = extractDeterministicCourse({
  html,
  courseCode: "COMP2400",
  year: 2026,
  sourceUrl,
});

test("preserves rich and unknown sections in deterministic Markdown", () => {
  assert.match(markdown.markdown, /## Fees/);
  assert.match(markdown.markdown, /## Learning Outcomes/);
  assert.match(markdown.markdown, /## Indicative Assessment/);
  assert.match(markdown.markdown, /## Workload/);
  assert.match(markdown.markdown, /## Research-led teaching/);
  assert.match(
    markdown.markdown,
    /This previously unknown section must remain inspectable/,
  );
  assert.match(markdown.markdown, /### 2026/);
  assert.match(markdown.markdown, /### 2027/);
  assert.doesNotMatch(markdown.markdown, /Repeated site navigation/);
  assert.ok(
    markdown.statistics.outputCharacters < markdown.statistics.inputCharacters,
  );
});

test("builds a shorter model input containing only selected-year offerings", () => {
  assert.match(selected.modelInput, /### 2026/);
  assert.match(selected.modelInput, /23 Feb 2026/);
  assert.doesNotMatch(selected.modelInput, /### 2027/);
  assert.doesNotMatch(selected.modelInput, /22 Feb 2027/);
  assert.ok(selected.modelInput.length < markdown.markdown.length);
  assert.ok(selected.includedSections.includes("Research-led teaching"));
  assert.equal(
    selected.modelInput.match(/^## Offerings, Dates and Class Summary Links$/gm)
      ?.length,
    1,
  );
});

test("does not duplicate nested secondary headings as top-level sections", () => {
  const nestedHeadingHtml = html
    .replace("<body>", '<body><div class="body__inner">')
    .replace("</body>", "</div></body>")
    .replace(
      '<div id="indicative-fees__domestic">',
      '<div><h2>Course fees</h2><p>Domestic and international</p></div><div id="indicative-fees__domestic">',
    );
  const converted = convertCourseHtmlToMarkdown({
    html: nestedHeadingHtml,
    courseCode: "COMP2400",
    year: 2026,
    sourceUrl,
  });
  const input = buildCourseModelInput(converted.markdown, 2026);
  assert.equal(input.modelInput.match(/^## Course fees$/gm)?.length, 1);
});

test("deterministically extracts every rich course section and excludes future classes", () => {
  assert.equal(deterministic.code, "COMP2400");
  assert.equal(deterministic.title, "Relational Databases");
  assert.deepEqual(deterministic.unitValue, { kind: "fixed", units: 6 });
  assert.equal(deterministic.school, "School of Computing");
  assert.equal(deterministic.college, "ANU College of Systems and Society");
  assert.deepEqual(deterministic.areasOfInterest, [
    "Information Technology",
    "Software Engineering",
  ]);
  assert.equal(deterministic.workloadHours, 130);
  assert.equal(deterministic.fees.length, 3);
  assert.deepEqual(
    deterministic.fees.map(({ audience, amount, studentContributionBand }) => ({
      audience,
      amount,
      studentContributionBand,
    })),
    [
      {
        audience: "commonwealth_supported",
        amount: null,
        studentContributionBand: 2,
      },
      { audience: "domestic", amount: 5520, studentContributionBand: null },
      {
        audience: "international",
        amount: 7020,
        studentContributionBand: null,
      },
    ],
  );
  assert.deepEqual(
    deterministic.learningOutcomes.map(({ text }) => text),
    [
      "Design a normalised relational schema.",
      "Write and evaluate relational queries.",
    ],
  );
  assert.deepEqual(
    deterministic.assessmentItems.map(({ weight }) => weight),
    [40, 60],
  );
  assert.deepEqual(
    deterministic.offerings.map(({ calendarYear, classNumber }) => ({
      calendarYear,
      classNumber,
    })),
    [{ calendarYear: 2026, classNumber: "1234" }],
  );
  assert.equal(
    deterministic.requisites.prerequisiteText.includes("COMP1100"),
    true,
  );
  assert.deepEqual(deterministic.requisites.incompatibilityCourseCodes, [
    "COMP6240",
  ]);
  assert.deepEqual(
    deterministic.attributes.map(({ attributeKind, value }) => ({
      attributeKind,
      value,
    })),
    [
      { attributeKind: "graduate_attribute", value: "Transdisciplinary" },
      { attributeKind: "graduate_attribute", value: "Critical Thinking" },
      { attributeKind: "stem", value: "STEM Course" },
    ],
  );
  assert.equal(
    validateCourseExtraction(deterministic, {
      expectedCode: "COMP2400",
      expectedYear: 2026,
      evidenceMethod: "deterministic",
    }).success,
    true,
  );
});

test("accepts ANU's single-letter course variants throughout the extraction contract", () => {
  for (const code of [
    "COMP8900F",
    "COMP8900P",
    "EXTN1001A",
    "ACST4600T",
    "TOKP2001X",
  ]) {
    assert.equal(COURSE_CODE_PATTERN.test(code), true, code);
  }
  assert.equal(COURSE_CODE_PATTERN.test("COMP8900FF"), false);
  assert.equal(
    COURSE_EXTRACTION_JSON_SCHEMA.properties.code.pattern,
    "^[A-Z]{4}[0-9]{4}[A-Z]?$",
  );

  const extraction = structuredClone(deterministic);
  extraction.code = "COMP8900F";
  extraction.requisites.prerequisiteRule = {
    op: "all_of",
    rules: [
      { op: "completed", courseCode: "COMP8900P" },
      {
        op: "min_units_from_courses",
        minimumUnits: 6,
        courseCodes: ["EXTN1001A", "ACST4600T"],
      },
    ],
  };
  extraction.requisites.incompatibilityCourseCodes = ["TOKP2001X"];
  extraction.relatedCourses = [
    {
      position: 1,
      relationKind: "equivalent",
      courseCode: "COMP8900P",
      courseTitle: "Research Project",
      sourceText: "Equivalent to COMP8900P.",
    },
  ];

  const result = validateCourseExtraction(extraction, {
    expectedCode: "COMP8900F",
    expectedYear: 2026,
    evidenceMethod: "deterministic",
  });
  assert.equal(result.success, true, JSON.stringify(result.issues));
});

test("deterministic requisite extraction preserves single-letter variants", () => {
  const extraction = extractDeterministicCourse({
    html: html
      .replaceAll("COMP1100", "COMP8900F")
      .replaceAll("COMP1130", "COMP8900P")
      .replaceAll("COMP6240", "EXTN1001A"),
    courseCode: "COMP2400",
    year: 2026,
    sourceUrl,
  });

  assert.match(extraction.requisites.prerequisiteText, /COMP8900F/);
  assert.match(extraction.requisites.prerequisiteText, /COMP8900P/);
  assert.deepEqual(extraction.requisites.incompatibilityCourseCodes, [
    "EXTN1001A",
  ]);
});

test("keeps unpunctuated ANU prerequisite codes out of incompatibilities", () => {
  const unpunctuatedHtml = html.replace(
    "COMP1130. You are not able",
    "COMP1130\n\nYou are not able",
  );
  const extraction = extractDeterministicCourse({
    html: unpunctuatedHtml,
    courseCode: "COMP2400",
    year: 2026,
    sourceUrl,
  });

  assert.match(extraction.requisites.prerequisiteText, /COMP1100/);
  assert.match(extraction.requisites.prerequisiteText, /COMP1130/);
  assert.doesNotMatch(
    extraction.requisites.incompatibilityText,
    /COMP1100|COMP1130/,
  );
  assert.deepEqual(extraction.requisites.incompatibilityCourseCodes, [
    "COMP6240",
  ]);
});

test("does not read the Lo in Log books as a learning-outcome marker", () => {
  const logBookHtml = html.replace(
    "Database design assignment (40%) [LO 1]",
    "Log books indicating activities conducted over the internship. (0) [LO 1, 2]",
  );
  const extraction = extractDeterministicCourse({
    html: logBookHtml,
    courseCode: "COMP2400",
    year: 2026,
    sourceUrl,
  });
  assert.deepEqual(
    extraction.assessmentItems[0].learningOutcomePositions,
    [1, 2],
  );
  assert.equal(
    validateCourseExtraction(extraction, {
      expectedCode: "COMP2400",
      expectedYear: 2026,
      evidenceMethod: "deterministic",
    }).success,
    true,
  );
});

test("drops malformed outcome links for review instead of aborting projection", () => {
  const malformedHtml = html.replace("[LO 1]", "[LO 0, 1, 99]");
  const extraction = extractDeterministicCourse({
    html: malformedHtml,
    courseCode: "COMP2400",
    year: 2026,
    sourceUrl,
  });
  assert.deepEqual(extraction.assessmentItems[0].learningOutcomePositions, [1]);
  assert.ok(
    extraction.reviewItems.some(
      ({ fieldKey, kind }) =>
        fieldKey === "assessmentItems.0.learningOutcomePositions" &&
        kind === "invalid",
    ),
  );
});

test("runtime contract rejects unknown keys and future-year offering rows", () => {
  const withUnknown = structuredClone(deterministic);
  withUnknown.hallucinated = true;
  const unknownResult = validateCourseExtraction(withUnknown);
  assert.equal(unknownResult.success, false);
  assert.ok(unknownResult.issues.some(({ path }) => path === "$.hallucinated"));

  const withFutureOffering = structuredClone(deterministic);
  withFutureOffering.offerings[0].calendarYear = 2027;
  const futureResult = validateCourseExtraction(withFutureOffering);
  assert.equal(futureResult.success, false);
  assert.ok(
    futureResult.issues.some(
      ({ path, message }) =>
        path === "$.offerings[0].calendarYear" && message.includes("match"),
    ),
  );
});

test("evidence checking requires source text and support for scalar claims", () => {
  const model = structuredClone(deterministic);
  model.evidence = [
    {
      fieldKey: "college",
      sourceLocator: "Key facts",
      evidenceExcerpt: "ANU College: ANU College of Systems and Society",
      confidence: 0.9,
      method: "model",
    },
    {
      fieldKey: "sourceUpdatedAt",
      sourceLocator: "Key facts",
      evidenceExcerpt: "Relational Databases",
      confidence: 0.5,
      method: "model",
    },
  ];
  model.sourceUpdatedAt = "2026-08-29T00:00:00.000Z";
  const checked = checkCourseExtractionEvidence(model, selected.modelInput);
  assert.deepEqual(checked.matchedFieldKeys, ["college"]);
  assert.ok(
    checked.issues.some(
      ({ fieldKey, message }) =>
        fieldKey === "sourceUpdatedAt" && message.includes("claimed scalar"),
    ),
  );
});

test("merge keeps deterministic conflicts and accepts only evidenced model fills", () => {
  const base = structuredClone(deterministic);
  base.college = null;
  base.evidence = base.evidence.filter(
    ({ fieldKey }) => fieldKey !== "college",
  );

  const model = structuredClone(base);
  model.title = "Relational Databases (model rewrite)";
  model.college = "ANU College of Systems and Society";
  model.sourceUpdatedAt = "2026-08-29T00:00:00.000Z";
  model.evidence = [
    {
      fieldKey: "title",
      sourceLocator: "front matter",
      evidenceExcerpt: "Relational Databases",
      confidence: 0.8,
      method: "model",
    },
    {
      fieldKey: "college",
      sourceLocator: "Key facts",
      evidenceExcerpt: "ANU College: ANU College of Systems and Society",
      confidence: 0.9,
      method: "model",
    },
  ];

  const merged = mergeCourseExtractions({
    deterministic: base,
    model,
    modelInput: selected.modelInput,
  });
  assert.equal(merged.extraction.title, "Relational Databases");
  assert.equal(merged.extraction.college, "ANU College of Systems and Society");
  assert.equal(merged.extraction.sourceUpdatedAt, null);
  assert.ok(merged.conflicts.some(({ fieldKey }) => fieldKey === "title"));
  assert.ok(merged.modelAcceptedFields.includes("college"));
  assert.ok(merged.modelRejectedFields.includes("sourceUpdatedAt"));
  assert.ok(
    merged.extraction.reviewItems.some(
      ({ fieldKey, kind }) =>
        fieldKey === "sourceUpdatedAt" && kind === "evidence_missing",
    ),
  );
});

test("stable serialisation and fingerprints ignore object key insertion order", () => {
  const left = { b: 2, a: { d: 4, c: 3 }, list: [2, 1] };
  const right = { list: [2, 1], a: { c: 3, d: 4 }, b: 2 };
  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(stableFingerprint(left), stableFingerprint(right));
  assert.notEqual(
    stableFingerprint(left),
    stableFingerprint({ ...right, list: [1, 2] }),
  );
});
