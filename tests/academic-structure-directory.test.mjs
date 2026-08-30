import assert from "node:assert/strict";
import { readFile as readTextFile } from "node:fs/promises";
import test from "node:test";

import {
  ANU_ACADEMIC_STRUCTURE_DIRECTORY_REQUEST_TIMEOUT_MS,
  ANU_ACADEMIC_STRUCTURE_DIRECTORY_RETRY_ATTEMPTS,
  assertSupportedAcademicStructureImportYear,
  createAnuAcademicStructureSearchUrls,
  fetchAnuAcademicStructureDirectory,
  isAcademicStructureDirectoryKind,
  parseAnuAcademicStructureDirectory,
} from "../lib/catalogue-import/anu-academic-structure-directory.ts";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

const programmePayloads = [
  {
    externalKey: "programme:undergraduate",
    sourceUrl: "https://example.test/undergraduate",
    payload: {
      TotalCount: 1,
      Items: [
        {
          AcademicPlanCode: "BCOMP",
          ProgramName: " Bachelor   of Advanced Computing ",
          ShortProgramName: "Advanced Computing",
          AcademicCareer: "Undergraduate",
          ProgramAcademicYear: "2026",
          Duration: 4,
          ModeOfDelivery: "In Person",
          SelectionRank: 80,
        },
      ],
    },
  },
  {
    externalKey: "programme:postgraduate",
    sourceUrl: "https://example.test/postgraduate",
    payload: { TotalCount: 0, Items: [] },
  },
  {
    externalKey: "programme:research",
    sourceUrl: "https://example.test/research",
    payload: { TotalCount: 0, Items: [] },
  },
  {
    externalKey: "programme:non-award",
    sourceUrl: "https://example.test/non-award",
    payload: { TotalCount: 0, Items: [] },
  },
];

test("supports academic structure directories from 2020 through 2030", () => {
  assert.doesNotThrow(() => assertSupportedAcademicStructureImportYear(2020));
  assert.doesNotThrow(() => assertSupportedAcademicStructureImportYear(2030));
  assert.throws(
    () => assertSupportedAcademicStructureImportYear(2019),
    /between 2020 and 2030/u,
  );
  assert.equal(isAcademicStructureDirectoryKind("programme"), true);
  assert.equal(isAcademicStructureDirectoryKind("specialisation"), true);
  assert.equal(isAcademicStructureDirectoryKind("course"), false);
});

test("builds every official directory URL with the required year controls", () => {
  const programmes = createAnuAcademicStructureSearchUrls("programme", 2026);
  assert.deepEqual(
    programmes.map(({ externalKey }) => externalKey),
    [
      "programme:undergraduate",
      "programme:postgraduate",
      "programme:research",
      "programme:non-award",
    ],
  );
  assert.deepEqual(
    programmes.map(({ url }) => new URL(url).pathname),
    [
      "/data/ProgramSearch/GetProgramsUnderGraduate",
      "/data/ProgramSearch/GetProgramsPostGraduate",
      "/data/ProgramSearch/GetProgramsResearch",
      "/data/ProgramSearch/GetProgramsNonAward",
    ],
  );

  const paths = {
    major: "/data/MajorSearch/GetMajors",
    minor: "/data/MinorSearch/GetMinors",
    specialisation: "/data/SpecialisationSearch/GetSpecialisations",
  };
  for (const [kind, path] of Object.entries(paths)) {
    const [{ url }] = createAnuAcademicStructureSearchUrls(kind, 2026);
    const parsed = new URL(url);
    assert.equal(parsed.pathname, path);
    assert.equal(parsed.searchParams.get("SelectedYear"), "2026");
    assert.equal(parsed.searchParams.get("ShowAll"), "True");
    assert.equal(parsed.searchParams.get("PageSize"), "Infinity");
  }
});

test("combines all programme careers and preserves lightweight metadata", () => {
  const directory = parseAnuAcademicStructureDirectory(
    "programme",
    2026,
    programmePayloads,
  );

  assert.equal(directory.isComplete, true);
  assert.equal(directory.totalCount, 1);
  assert.equal(directory.receivedItemCount, 1);
  assert.equal(directory.uniqueItemCount, 1);
  assert.deepEqual(directory.diagnostics, []);
  assert.deepEqual(directory.entries[0], {
    kind: "programme",
    code: "BCOMP",
    title: "Bachelor of Advanced Computing",
    shortTitle: "Advanced Computing",
    academicCareer: "Undergraduate",
    durationYears: 4,
    units: null,
    modeOfDelivery: "In Person",
    selectionRank: 80,
    sourceUrl: "https://programsandcourses.anu.edu.au/2026/program/BCOMP",
    sourcePageExternalKey: "programme:undergraduate",
  });
});

test("does not use overstated subplan TotalCount as a truncation signal", () => {
  const directory = parseAnuAcademicStructureDirectory("major", 2026, [
    {
      externalKey: "major",
      sourceUrl: "https://example.test/major",
      payload: {
        TotalCount: 132,
        Items: [
          {
            SubPlanCode: "COMP-MAJ",
            Name: "Computing",
            Career: "Undergraduate",
            Units: 48,
            Year: 2026,
          },
        ],
      },
    },
  ]);

  assert.equal(directory.receivedItemCount, 1);
  assert.equal(directory.totalCount, 132);
  assert.equal(directory.isComplete, true);
  assert.deepEqual(directory.diagnostics, []);
  assert.equal(directory.entries[0].code, "COMP-MAJ");
});

test("deduplicates specialisations and records a reviewable diagnostic", () => {
  const directory = parseAnuAcademicStructureDirectory("specialisation", 2026, [
    {
      externalKey: "specialisation",
      sourceUrl: "https://example.test/specialisation",
      payload: {
        TotalCount: 153,
        Items: [
          {
            SubPlanCode: "ANTH-HSPC",
            Name: "Anthropology  Honours",
            Career: "Undergraduate",
            Units: 48,
            Year: 2026,
          },
          {
            SubPlanCode: "ANTH-HSPC",
            Name: "Anthropology Honours",
            Career: "Undergraduate",
            Units: 48,
            Year: 2026,
          },
        ],
      },
    },
  ]);

  assert.equal(directory.isComplete, true);
  assert.equal(directory.receivedItemCount, 2);
  assert.equal(directory.uniqueItemCount, 1);
  assert.equal(directory.entries[0].title, "Anthropology Honours");
  assert.deepEqual(
    directory.diagnostics.map(({ code, severity }) => ({ code, severity })),
    [
      {
        code: "DUPLICATE_ACADEMIC_STRUCTURE_DIRECTORY_CODE",
        severity: "warning",
      },
    ],
  );
});

test("marks missing programme endpoints incomplete while retaining usable rows", () => {
  const directory = parseAnuAcademicStructureDirectory(
    "programme",
    2026,
    programmePayloads.slice(0, 1),
  );

  assert.equal(directory.isComplete, false);
  assert.equal(directory.entries.length, 1);
  assert.equal(
    directory.diagnostics.filter(
      ({ code }) => code === "MISSING_ACADEMIC_STRUCTURE_DIRECTORY_ENDPOINT",
    ).length,
    3,
  );
});

test("fetches programme endpoints concurrently with provenance metadata", async () => {
  const requests = [];
  const directory = await fetchAnuAcademicStructureDirectory(
    "programme",
    2026,
    {
      now: () => new Date("2026-08-30T00:00:00.000Z"),
      fetchImpl: async (url, init) => {
        requests.push({ url: String(url), init });
        return jsonResponse(
          { TotalCount: 0, Items: [] },
          {
            headers: {
              "content-type": "application/json",
              etag: '"directory-v1"',
              "last-modified": "Sat, 29 Aug 2026 00:00:00 GMT",
            },
          },
        );
      },
    },
  );

  assert.equal(requests.length, 4);
  assert.equal(directory.sourcePages.length, 4);
  assert.equal(directory.fetchedAt, "2026-08-30T00:00:00.000Z");
  assert.equal(directory.isComplete, true);
  assert.equal(directory.uniqueItemCount, 0);
  for (const request of requests) {
    const headers = new Headers(request.init.headers);
    assert.equal(headers.get("x-requested-with"), "XMLHttpRequest");
    assert.equal(
      headers.get("referer"),
      "https://programsandcourses.anu.edu.au/catalogue",
    );
  }
  for (const page of directory.sourcePages) {
    assert.match(page.contentSha256, /^[0-9a-f]{64}$/u);
    assert.equal(page.httpEtag, '"directory-v1"');
    assert.equal(page.sourceLastModified, "2026-08-29T00:00:00.000Z");
    assert.ok(page.byteSize > 0);
  }
});

test("keeps partial programme responses reviewable and bounds each request", async () => {
  let attempts = 0;
  const directory = await fetchAnuAcademicStructureDirectory(
    "programme",
    2026,
    {
      fetchImpl: async (url) => {
        attempts += 1;
        if (String(url).includes("PostGraduate")) {
          return new Response("busy", { status: 503 });
        }
        return jsonResponse({ TotalCount: 0, Items: [] });
      },
    },
  );

  assert.equal(attempts, 4);
  assert.equal(directory.isComplete, false);
  assert.equal(directory.sourcePages.length, 3);
  assert.ok(
    directory.diagnostics.some(
      ({ code, severity }) =>
        code === "INVALID_ACADEMIC_STRUCTURE_DIRECTORY_RESPONSE" &&
        severity === "error",
    ),
  );
  assert.equal(ANU_ACADEMIC_STRUCTURE_DIRECTORY_RETRY_ATTEMPTS, 1);
  assert.equal(ANU_ACADEMIC_STRUCTURE_DIRECTORY_REQUEST_TIMEOUT_MS, 45_000);
});

test("keeps the directory refresh route within the Hobby function limit", async () => {
  const route = await readTextFile(
    new URL(
      "../app/api/admin/academic-structure-directory/route.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(route, /export const maxDuration = 60;/u);
  assert.match(route, /canManageCatalogueImports/u);
  assert.ok(ANU_ACADEMIC_STRUCTURE_DIRECTORY_REQUEST_TIMEOUT_MS < 60_000);
});
