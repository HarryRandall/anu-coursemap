import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ANU_2026_COURSE_CODES,
  ANU_COURSE_PARSER_VERSION,
  ANU_PROGRAMS_AND_COURSES_SOURCE,
  fetchAnuCourseManifest,
  parseAnuCourseDocument,
} from "../lib/catalogue-import/anu-programs-courses.ts";
import {
  parseCatalogueManifest,
  validateCatalogueManifest,
} from "../lib/catalogue-import/manifest.ts";

test("keeps the Coursemap scope and every 2026 BCOMP and SOFT-MAJ reference", () => {
  assert.deepEqual(ANU_2026_COURSE_CODES, [
    "ARTH2181",
    "ASIA3032",
    "COMP1100",
    "COMP1110",
    "COMP1130",
    "COMP1140",
    "COMP1600",
    "COMP2100",
    "COMP2120",
    "COMP2300",
    "COMP2310",
    "COMP2400",
    "COMP2610",
    "COMP2700",
    "COMP3430",
    "COMP3500",
    "COMP3600",
    "COMP3610",
    "COMP3620",
    "COMP3670",
    "COMP3703",
    "COMP3900",
    "COMP4130",
    "DESN2010",
    "ENGN1211",
    "ENGN2300",
    "ENVS2015",
    "INFS2024",
    "INFS3002",
    "INFS3024",
    "INFS3059",
    "MATH1005",
    "MATH1013",
    "MATH1115",
    "MATH2222",
    "MATH2301",
    "MATH2307",
    "MGMT2009",
    "MUSI3309",
    "SCOM3029",
    "SOCY2038",
    "SOCY2166",
    "STAT1003",
    "STAT1008",
  ]);
});

const fetchedAt = "2026-08-14T01:02:03.000Z";
const comp2100Url =
  "https://programsandcourses.anu.edu.au/2026/course/COMP2100";
const comp3900Url =
  "https://programsandcourses.anu.edu.au/2026/course/COMP3900";
const [comp2100Html, comp3900Html] = await Promise.all([
  readFile(
    new URL("./fixtures/catalogue/anu-2026-comp2100.html", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("./fixtures/catalogue/anu-2026-comp3900.html", import.meta.url),
    "utf8",
  ),
]);

function parseFixture(html, sourceUrl, expectedCourseCode) {
  return parseAnuCourseDocument({
    html,
    sourceUrl,
    expectedCourseCode,
    catalogueYear: 2026,
    fetchedAt,
    httpEtag: '"fixture-etag"',
    sourceLastModified: "Thu, 13 Aug 2026 02:15:00 GMT",
  });
}

function manifestFor(document) {
  return {
    schemaVersion: 1,
    parserVersion: ANU_COURSE_PARSER_VERSION,
    catalogueYear: 2026,
    source: { ...ANU_PROGRAMS_AND_COURSES_SOURCE },
    scope: { kind: "course_codes", courseCodes: [document.externalKey] },
    documents: [document],
    diagnostics: [],
  };
}

test("parses official course metadata, provenance and raw requisite facts", () => {
  const document = parseFixture(comp2100Html, comp2100Url, "COMP2100");

  assert.equal(document.entityKind, "course");
  assert.equal(document.externalKey, "COMP2100");
  assert.equal(
    document.canonicalUrl,
    "https://programsandcourses.anu.edu.au/2026/course/comp2100",
  );
  assert.equal(document.fetchedAt, fetchedAt);
  assert.equal(document.httpEtag, '"fixture-etag"');
  assert.equal(document.sourceLastModified, "2026-08-13T02:15:00.000Z");
  assert.equal(
    document.contentSha256,
    createHash("sha256").update(comp2100Html, "utf8").digest("hex"),
  );
  assert.deepEqual(
    {
      code: document.course.code,
      title: document.course.title,
      units: document.course.units,
      description: document.course.description,
      level: document.course.level,
      subject: document.course.subject,
      subjectName: document.course.subjectName,
      school: document.course.school,
      academicCareer: document.course.academicCareer,
      convener: document.course.convener,
      deliverySummary: document.course.deliverySummary,
    },
    {
      code: "COMP2100",
      title: "Software Construction",
      units: 6,
      description:
        "This course explores principles and practices for creating medium-scale software projects.",
      level: 2000,
      subject: "COMP",
      subjectName: "Computer Science",
      school: "School of Computing",
      academicCareer: "UGRD",
      convener: "Alex Potanin; Charles Gretton",
      deliverySummary: "In Person",
    },
  );
  assert.equal(
    document.course.requisites.rawRequisiteText,
    "Successfully completed COMP1110 or COMP1140 AND 6 units of 1000 level MATH.",
  );
  assert.equal(document.course.requisites.observed, true);
  assert.equal(
    document.course.requisites.rawIncompatibilityText,
    "Incompatible with COMP6442.",
  );
  assert.deepEqual(document.course.requisites.linkedCourseCodes, [
    "COMP1110",
    "COMP1140",
    "COMP6442",
  ]);
  assert.equal(document.offeringObserved, true);
  assert.ok(
    document.diagnostics.some(
      ({ code, severity }) =>
        code === "UNSTRUCTURED_REQUISITE_TEXT" && severity === "warning",
    ),
  );

  const result = validateCatalogueManifest(manifestFor(document));
  assert.deepEqual(result, { valid: true, issues: [] });
  assert.equal(
    parseCatalogueManifest(manifestFor(document)).documents[0],
    document,
  );
});

test("scopes offering tables to 2026 and never imports future-year rows", () => {
  const document = parseFixture(comp2100Html, comp2100Url, "COMP2100");

  assert.deepEqual(
    document.periods.map(({ calendarYear, code, startsOn, endsOn }) => ({
      calendarYear,
      code,
      startsOn,
      endsOn,
    })),
    [
      {
        calendarYear: 2026,
        code: "S1",
        startsOn: "2026-02-23",
        endsOn: "2026-05-29",
      },
      {
        calendarYear: 2026,
        code: "S2",
        startsOn: "2026-07-27",
        endsOn: "2026-10-30",
      },
    ],
  );
  assert.deepEqual(
    document.offering?.sessions.map(
      ({
        calendarYear,
        periodCode,
        classNumber,
        lastEnrolmentDate,
        censusDate,
      }) => ({
        calendarYear,
        periodCode,
        classNumber,
        lastEnrolmentDate,
        censusDate,
      }),
    ),
    [
      {
        calendarYear: 2026,
        periodCode: "S1",
        classNumber: "3699",
        lastEnrolmentDate: "2026-03-02",
        censusDate: "2026-03-31",
      },
      {
        calendarYear: 2026,
        periodCode: "S2",
        classNumber: "8676",
        lastEnrolmentDate: "2026-08-03",
        censusDate: "2026-08-31",
      },
    ],
  );
  assert.doesNotMatch(JSON.stringify(document), /2027|2028|5103|6681/);
});

test("keeps demonstrably current COMP3900 facts and reviewable rule ambiguity", () => {
  const document = parseFixture(comp3900Html, comp3900Url, "COMP3900");

  assert.equal(document.course.title, "Human-Computer Interaction");
  assert.equal(document.course.level, 3000);
  assert.equal(
    document.course.requisites.rawRequisiteText,
    "To enrol in this course you must have completed 12 units of 2000 level COMP courses.",
  );
  assert.equal(
    document.course.requisites.rawIncompatibilityText,
    "Incompatible with COMP6390.",
  );
  assert.deepEqual(document.course.requisites.linkedCourseCodes, ["COMP6390"]);
  assert.equal(document.offering?.sessions[0].classNumber, "8692");
  assert.ok(
    document.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "UNSTRUCTURED_REQUISITE_TEXT" &&
        diagnostic.sourceFragment?.includes("12 units of 2000 level COMP"),
    ),
  );
});

test("retains malformed document provenance without inventing required fields", () => {
  const malformedHtml = comp2100Html
    .replace(/<meta\s+name="course-description"[\s\S]*?\/>/, "")
    .replace("6 units", "units unavailable")
    .replace(
      '<span class="degree-summary__code-text">School of Computing</span>',
      '<span class="degree-summary__code-text"></span>',
    );
  const document = parseFixture(malformedHtml, comp2100Url, "COMP2100");

  assert.equal(document.course.description, null);
  assert.equal(document.course.units, null);
  assert.equal(document.course.school, null);
  assert.match(document.contentSha256, /^[0-9a-f]{64}$/);
  for (const field of ["course.description", "course.units", "course.school"]) {
    assert.ok(
      document.diagnostics.some(
        (diagnostic) =>
          diagnostic.severity === "error" && diagnostic.field === field,
      ),
      `expected an error diagnostic for ${field}`,
    );
  }
  assert.deepEqual(validateCatalogueManifest(manifestFor(document)), {
    valid: true,
    issues: [],
  });
});

test("distinguishes an explicit no-rule section from an unobserved selector", () => {
  const explicitNoneHtml = comp2100Html.replace(
    /<div class="requisite">[\s\S]*?<\/div>/,
    '<div class="requisite">None</div>',
  );
  const explicitNone = parseFixture(explicitNoneHtml, comp2100Url, "COMP2100");
  assert.deepEqual(explicitNone.course.requisites, {
    observed: true,
    rawText: null,
    rawRequisiteText: null,
    rawIncompatibilityText: null,
    linkedCourseCodes: [],
  });

  const missingSectionHtml = comp2100Html.replace(
    /<div class="requisite">[\s\S]*?<\/div>/,
    "",
  );
  const missingSection = parseFixture(
    missingSectionHtml,
    comp2100Url,
    "COMP2100",
  );
  assert.equal(missingSection.course.requisites.observed, false);
  assert.ok(
    missingSection.diagnostics.some(
      ({ code }) => code === "REQUISITE_SECTION_NOT_OBSERVED",
    ),
  );

  const blankSection = parseFixture(
    comp2100Html.replace(
      /<div class="requisite">[\s\S]*?<\/div>/,
      '<div class="requisite">   </div>',
    ),
    comp2100Url,
    "COMP2100",
  );
  assert.equal(blankSection.course.requisites.observed, false);
  assert.ok(
    blankSection.diagnostics.some(
      ({ code }) => code === "REQUISITE_SECTION_NOT_OBSERVED",
    ),
  );
});

test("distinguishes observed offering absence from selector drift", () => {
  const renamedTables = parseFixture(
    comp2100Html.replaceAll(
      'class="table-terms"',
      'class="table-terms-missing"',
    ),
    comp2100Url,
    "COMP2100",
  );
  assert.equal(renamedTables.offeringObserved, false);
  assert.equal(renamedTables.offering, undefined);
  assert.ok(
    renamedTables.diagnostics.some(
      ({ code }) => code === "OFFERING_TABLES_NOT_OBSERVED",
    ),
  );

  const observedAbsence = parseFixture(
    comp2100Html.replace(/<tbody>[\s\S]*?<\/tbody>/g, "<tbody></tbody>"),
    comp2100Url,
    "COMP2100",
  );
  assert.equal(observedAbsence.offeringObserved, true);
  assert.equal(observedAbsence.offering, undefined);
  assert.ok(
    observedAbsence.diagnostics.some(
      ({ code }) => code === "NO_CURRENT_YEAR_OFFERINGS",
    ),
  );

  const unobserved = parseFixture(
    comp2100Html.replace('href="#course-tab-1">2026', 'href="#missing">2026'),
    comp2100Url,
    "COMP2100",
  );
  assert.equal(unobserved.offeringObserved, false);
  assert.equal(unobserved.offering, undefined);
  assert.ok(
    unobserved.diagnostics.some(
      ({ code }) => code === "MISSING_CATALOGUE_YEAR_OFFERINGS",
    ),
  );
});

test("builds a deterministic scoped manifest and reports fetch exceptions", async () => {
  const fetchedUrls = [];
  const fetchImpl = async (input) => {
    const url = String(input);
    fetchedUrls.push(url);
    if (url === comp2100Url || url === comp3900Url) {
      return new Response(url === comp2100Url ? comp2100Html : comp3900Html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response("Unavailable", {
      status: 503,
      statusText: "Unavailable",
    });
  };

  const manifest = await fetchAnuCourseManifest({
    courseCodes: [
      "comp2100",
      "COMP2100",
      "not-a-course",
      "COMP3900",
      "COMP1110",
    ],
    concurrency: 2,
    fetchImpl,
    now: () => new Date(fetchedAt),
  });

  assert.deepEqual(manifest.scope.courseCodes, [
    "COMP2100",
    "COMP3900",
    "COMP1110",
  ]);
  assert.deepEqual(
    manifest.documents.map(({ externalKey }) => externalKey),
    ["COMP2100", "COMP3900"],
  );
  assert.deepEqual(fetchedUrls.sort(), [
    "https://programsandcourses.anu.edu.au/2026/course/COMP1110",
    comp2100Url,
    comp3900Url,
  ]);
  assert.deepEqual(
    new Set(manifest.diagnostics.map(({ code }) => code)),
    new Set([
      "DUPLICATE_SCOPE_COURSE_CODE",
      "INVALID_SCOPE_COURSE_CODE",
      "SOURCE_FETCH_FAILED",
    ]),
  );
  assert.deepEqual(validateCatalogueManifest(manifest), {
    valid: true,
    issues: [],
  });
});

test("rejects manifest documents that drift outside their declared scope", () => {
  const manifest = structuredClone(
    manifestFor(parseFixture(comp2100Html, comp2100Url, "COMP2100")),
  );
  manifest.documents[0].externalKey = "COMP9999";

  const result = validateCatalogueManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some((issue) => issue.includes("outside the declared scope")),
  );
  assert.throws(
    () => parseCatalogueManifest(manifest),
    /Invalid catalogue manifest/,
  );
});

test("rejects unexplained missing courses and future-year offering data", () => {
  const document = parseFixture(comp2100Html, comp2100Url, "COMP2100");
  const missing = manifestFor(document);
  missing.scope.courseCodes.push("COMP3900");

  const missingResult = validateCatalogueManifest(missing);
  assert.equal(missingResult.valid, false);
  assert.ok(
    missingResult.issues.some((issue) =>
      issue.includes("top-level error diagnostic for documents.COMP3900"),
    ),
  );

  const future = manifestFor(structuredClone(document));
  future.documents[0].periods[0].calendarYear = 2027;
  future.documents[0].offering.sessions[0].calendarYear = 2027;
  const futureResult = validateCatalogueManifest(future);
  assert.equal(futureResult.valid, false);
  assert.ok(
    futureResult.issues.filter((issue) =>
      issue.includes("manifest catalogueYear"),
    ).length >= 2,
  );
});

test("rejects units that cannot round-trip through numeric(5, 2)", () => {
  const document = parseFixture(comp2100Html, comp2100Url, "COMP2100");

  for (const units of [6.001, 1000, Number.POSITIVE_INFINITY]) {
    const manifest = manifestFor(structuredClone(document));
    manifest.documents[0].course.units = units;
    const result = validateCatalogueManifest(manifest);
    assert.equal(result.valid, false);
    assert.ok(
      result.issues.some((issue) =>
        issue.includes("no more than two decimal places"),
      ),
    );
  }
});
