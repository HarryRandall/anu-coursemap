import assert from "node:assert/strict";
import test from "node:test";

import { refreshAcademicStructureDirectoryForYearLocal } from "../lib/catalogue-import/run-academic-structure-directory-refresh.ts";
import { createLocalDatabaseClient } from "../scripts/catalogue/lib/local-database.mjs";

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function majorPayload(items, { totalCount = items.length } = {}) {
  return {
    TotalCount: totalCount,
    Items: items,
  };
}

const currentRows = [
  {
    SubPlanCode: "TST1-MAJ",
    Name: "Test Major One",
    Career: "Undergraduate",
    Units: 48,
    Year: 2030,
  },
  {
    SubPlanCode: "TST2-MAJ",
    Name: "Test Major Two",
    Career: "Undergraduate",
    Units: 48,
    Year: 2030,
  },
];

test("academic structure directory refresh is idempotent and retires only from a trusted response", async () => {
  const first = await refreshAcademicStructureDirectoryForYearLocal({
    academicYear: 2030,
    structureKind: "major",
    fetchImpl: async () => jsonResponse(majorPayload(currentRows)),
  });
  assert.equal(first.status, "succeeded");
  assert.equal(first.counts.checked, 2);
  assert.equal(
    first.counts.added + first.counts.changed + first.counts.unchanged,
    2,
  );

  const second = await refreshAcademicStructureDirectoryForYearLocal({
    academicYear: 2030,
    structureKind: "major",
    fetchImpl: async () => jsonResponse(majorPayload(currentRows)),
  });
  assert.equal(second.status, "succeeded");
  assert.equal(second.counts.added, 0);
  assert.equal(second.counts.changed, 0);
  assert.equal(second.counts.unchanged, 2);

  const diagnostic = await refreshAcademicStructureDirectoryForYearLocal({
    academicYear: 2030,
    structureKind: "major",
    fetchImpl: async () =>
      jsonResponse(
        majorPayload([
          currentRows[0],
          {
            SubPlanCode: "bad code",
            Name: "Unsafe result",
            Career: "Undergraduate",
            Units: 48,
            Year: 2030,
          },
        ]),
      ),
  });
  assert.equal(diagnostic.status, "succeeded");
  assert.equal(diagnostic.warningCount, 1);

  const sql = await createLocalDatabaseClient();
  try {
    const preserved = await sql`
      select entries.code, entries.is_available
      from public.academic_structure_directory_entries as entries
      join public.academic_years as years
        on years.id = entries.academic_year_id
      where years.year = 2030
        and entries.structure_kind = ${"major"}
        and entries.code in (${"TST1-MAJ"}, ${"TST2-MAJ"})
      order by entries.code
    `;
    assert.deepEqual(
      preserved.map((row) => ({
        code: row.code,
        isAvailable: row.is_available,
      })),
      [
        { code: "TST1-MAJ", isAvailable: true },
        { code: "TST2-MAJ", isAvailable: true },
      ],
    );
  } finally {
    await sql.end({ timeout: 5 });
  }

  const trusted = await refreshAcademicStructureDirectoryForYearLocal({
    academicYear: 2030,
    structureKind: "major",
    fetchImpl: async () => jsonResponse(majorPayload([currentRows[0]])),
  });
  assert.equal(trusted.status, "succeeded");
  assert.equal(trusted.warningCount, 0);

  const verificationSql = await createLocalDatabaseClient();
  try {
    const entries = await verificationSql`
      select entries.code, entries.is_available
      from public.academic_structure_directory_entries as entries
      join public.academic_years as years
        on years.id = entries.academic_year_id
      where years.year = 2030
        and entries.structure_kind = ${"major"}
        and entries.code in (${"TST1-MAJ"}, ${"TST2-MAJ"})
      order by entries.code
    `;
    assert.deepEqual(
      entries.map((row) => ({
        code: row.code,
        isAvailable: row.is_available,
      })),
      [
        { code: "TST1-MAJ", isAvailable: true },
        { code: "TST2-MAJ", isAvailable: false },
      ],
    );

    const [status] = await verificationSql`
      select
        statuses.source_availability,
        statuses.received_count,
        statuses.unique_count,
        statuses.directory_refreshed_at
      from public.academic_structure_directory_statuses as statuses
      join public.academic_years as years
        on years.id = statuses.academic_year_id
      where years.year = 2030
        and statuses.structure_kind = ${"major"}
    `;
    assert.equal(status.source_availability, "available");
    assert.equal(status.received_count, 1);
    assert.equal(status.unique_count, 1);
    assert.ok(status.directory_refreshed_at instanceof Date);
  } finally {
    await verificationSql.end({ timeout: 5 });
  }
});
