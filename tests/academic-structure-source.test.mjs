import assert from "node:assert/strict";
import test from "node:test";
import {
  createAnuAcademicStructureUrl,
  fetchAnuAcademicStructurePage,
  validateAnuAcademicStructurePage,
} from "../lib/structure-import/source.ts";

function structureHtml({
  route = "program",
  code = "BCOMP",
  year = 2026,
  title = "Bachelor of Computing",
} = {}) {
  return `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <meta name="${route}-code" content="${code}">
    <meta name="${route}-year" content="${year}">
    <meta name="${route}-name" content="${title}">
    <link rel="canonical" href="https://programsandcourses.anu.edu.au/${year}/${route}/${code.toLowerCase()}">
  </head>
  <body><main><h1>${title}</h1></main></body>
</html>`;
}

test("builds official year-specific URLs for every academic structure kind", () => {
  assert.equal(
    createAnuAcademicStructureUrl(2026, "programme", "bcomp"),
    "https://programsandcourses.anu.edu.au/2026/program/BCOMP",
  );
  assert.equal(
    createAnuAcademicStructureUrl(2026, "major", "soft-maj"),
    "https://programsandcourses.anu.edu.au/2026/major/SOFT-MAJ",
  );
  assert.equal(
    createAnuAcademicStructureUrl(2026, "minor", "comm-min"),
    "https://programsandcourses.anu.edu.au/2026/minor/COMM-MIN",
  );
  assert.equal(
    createAnuAcademicStructureUrl(2026, "specialisation", "syar-spec"),
    "https://programsandcourses.anu.edu.au/2026/specialisation/SYAR-SPEC",
  );
  assert.throws(
    () => createAnuAcademicStructureUrl(2019, "programme", "BCOMP"),
    /2020 through 2030/,
  );
  assert.throws(
    () => createAnuAcademicStructureUrl(2031, "programme", "BCOMP"),
    /2020 through 2030/,
  );
  assert.throws(
    () => createAnuAcademicStructureUrl(2026, "programme", "../admin"),
    /Invalid ANU academic structure code/,
  );
});

test("validates authoritative metadata for each supported ANU route", () => {
  for (const target of [
    {
      kind: "programme",
      route: "program",
      code: "BCOMP",
      title: "Bachelor of Computing",
    },
    {
      kind: "major",
      route: "major",
      code: "SOFT-MAJ",
      title: "Software Development",
    },
    {
      kind: "minor",
      route: "minor",
      code: "COMM-MIN",
      title: "Computing Minor",
    },
    {
      kind: "specialisation",
      route: "specialisation",
      code: "SYAR-SPEC",
      title: "Systems and Architecture",
    },
  ]) {
    const result = validateAnuAcademicStructurePage({
      html: structureHtml(target),
      expectedKind: target.kind,
      expectedCode: target.code,
      expectedYear: 2026,
    });
    assert.equal(result.valid, true, JSON.stringify(result.issues));
    assert.equal(result.page.kind, target.kind);
    assert.equal(result.page.code, target.code);
    assert.equal(result.page.title, target.title);
  }
});

test("rejects code, year and kind mismatches instead of importing the wrong page", () => {
  const codeMismatch = validateAnuAcademicStructurePage({
    html: structureHtml({ code: "BIT", title: "Bachelor of IT" }),
    expectedKind: "programme",
    expectedCode: "BCOMP",
    expectedYear: 2026,
  });
  assert.equal(codeMismatch.valid, false);
  assert.ok(
    codeMismatch.issues.some(({ code }) => code === "STRUCTURE_CODE_MISMATCH"),
  );

  const yearMismatch = validateAnuAcademicStructurePage({
    html: structureHtml({ year: 2025 }),
    expectedKind: "programme",
    expectedCode: "BCOMP",
    expectedYear: 2026,
  });
  assert.equal(yearMismatch.valid, false);
  assert.ok(
    yearMismatch.issues.some(({ code }) => code === "STRUCTURE_YEAR_MISMATCH"),
  );

  const kindMismatch = validateAnuAcademicStructurePage({
    html: structureHtml({
      route: "major",
      code: "SOFT-MAJ",
      title: "Software Development",
    }),
    expectedKind: "minor",
    expectedCode: "SOFT-MAJ",
    expectedYear: 2026,
  });
  assert.equal(kindMismatch.valid, false);
  assert.ok(
    kindMismatch.issues.some(({ code }) => code === "STRUCTURE_KIND_MISMATCH"),
  );
});

test("rejects ANU's HTTP-200 page-not-found shell", () => {
  const result = validateAnuAcademicStructurePage({
    html: "<!doctype html><title>Page Not Found - ANU</title><body><h1>404</h1></body>",
    expectedKind: "programme",
    expectedCode: "BCOMP",
    expectedYear: 2026,
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(({ code }) => code === "PAGE_NOT_FOUND_SHELL"));
  assert.ok(
    result.issues.some(({ code }) => code === "MISSING_STRUCTURE_KIND"),
  );
});

test("fetches one target with immutable source metadata and bounded retries", async () => {
  let attempts = 0;
  const result = await fetchAnuAcademicStructurePage(
    2026,
    "programme",
    "BCOMP",
    {
      retryAttempts: 2,
      retryDelayMs: 0,
      now: () => new Date("2026-08-30T01:02:03.000Z"),
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) {
          return new Response("temporarily unavailable", { status: 503 });
        }
        return new Response(structureHtml(), {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            etag: '"programme-fixture"',
            "last-modified": "Sat, 29 Aug 2026 03:04:05 GMT",
          },
        });
      },
    },
  );
  assert.equal(attempts, 2);
  assert.equal(result.kind, "programme");
  assert.equal(result.structureCode, "BCOMP");
  assert.equal(result.title, "Bachelor of Computing");
  assert.equal(result.httpEtag, '"programme-fixture"');
  assert.equal(result.fetchedAt, "2026-08-30T01:02:03.000Z");
  assert.match(result.contentSha256, /^[0-9a-f]{64}$/);

  const throttled = await fetchAnuAcademicStructurePage(
    2026,
    "programme",
    "BCOMP",
    {
      retryAttempts: 1,
      fetchImpl: async () => new Response("too many requests", { status: 429 }),
    },
  );
  assert.equal(throttled.sourceError?.code, "RETRYABLE_HTTP_STATUS");
  assert.equal(throttled.sourceError?.retryable, true);
});
