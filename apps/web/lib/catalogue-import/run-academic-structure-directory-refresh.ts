import type { AcademicStructureKind } from "../structure-import/contract.ts";
import { isDemoMode } from "../supabase/config.ts";
import {
  createHostedImportDatabaseClient,
  createLocalDatabaseClient,
} from "../../scripts/catalogue/lib/local-database.mjs";
import {
  AnuAcademicStructureDirectoryHttpError,
  assertSupportedAcademicStructureImportYear,
  fetchAnuAcademicStructureDirectory,
  isAcademicStructureDirectoryKind,
  type AnuAcademicStructureDirectory,
  type AnuAcademicStructureDirectorySourcePage,
} from "./anu-academic-structure-directory.ts";
import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./import-source.ts";

export class AcademicStructureDirectoryConfigurationError extends Error {
  constructor() {
    super(
      "Configure COURSEMAP_IMPORT_DATABASE_URL before refreshing an academic structure directory on Vercel.",
    );
    this.name = "AcademicStructureDirectoryConfigurationError";
  }
}

export type AcademicStructureDirectoryRefreshProgress = {
  action: "fetching" | "writing" | "complete";
  message: string;
};

export type AcademicStructureDirectoryRefreshCounts = {
  added: number;
  changed: number;
  checked: number;
  failed: number;
  unchanged: number;
};

export type AcademicStructureDirectoryRefreshResult = {
  status: "succeeded" | "failed";
  counts: AcademicStructureDirectoryRefreshCounts;
  warningCount: number;
  errorCount: number;
  receivedItemCount: number;
  uniqueItemCount: number;
};

type SqlClient = Awaited<ReturnType<typeof createLocalDatabaseClient>>;

type DirectoryAvailabilityUpdate = {
  sourceAvailability: "unknown" | "available" | "unavailable";
  checkedAt: string;
  availabilityNote: string | null;
  markDirectoryRefreshed: boolean;
  retireMissingEntries: boolean;
  receivedItemCount: number | null;
  uniqueItemCount: number | null;
};

function configuredImportDatabaseUrl() {
  const connectionString = process.env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new AcademicStructureDirectoryConfigurationError();
  }
  return connectionString;
}

function structureKindLabel(kind: AcademicStructureKind, count?: number) {
  if (kind === "specialisation") {
    return count === 1 ? "specialisation" : "specialisations";
  }
  if (kind === "programme") return count === 1 ? "programme" : "programmes";
  if (kind === "major") return count === 1 ? "major" : "majors";
  return count === 1 ? "minor" : "minors";
}

async function upsertStructureSource(sql: SqlClient) {
  const { name, baseUrl } = ANU_PROGRAMS_AND_COURSES_SOURCE;
  const kind = "anu_programs_and_courses";
  const inserted = await sql`
    insert into public.academic_structure_sources (name, kind, base_url, is_active)
    values (${name}, ${kind}, ${baseUrl}, true)
    on conflict (kind, base_url) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;

  const [existing] = await sql`
    update public.academic_structure_sources
    set name = ${name}, is_active = true, updated_at = now()
    where kind = ${kind} and base_url = ${baseUrl}
    returning id
  `;
  if (!existing) {
    throw new Error("The academic structure source could not be resolved.");
  }
  return existing.id as number;
}

async function upsertAcademicYear(sql: SqlClient, year: number) {
  const [academicYear] = await sql`
    insert into public.academic_years (year, is_import_enabled)
    values (${year}, true)
    on conflict (year) do update set is_import_enabled = true
    returning id
  `;
  if (!academicYear) {
    throw new Error("The academic year could not be resolved.");
  }
  return academicYear.id as number;
}

async function updateDirectoryStatus(
  sql: SqlClient,
  academicYearId: number,
  structureKind: AcademicStructureKind,
  update: DirectoryAvailabilityUpdate,
) {
  await sql`
    insert into public.academic_structure_directory_statuses (
      academic_year_id,
      structure_kind,
      source_availability,
      availability_checked_at,
      directory_refreshed_at,
      availability_note,
      received_count,
      unique_count
    )
    values (
      ${academicYearId},
      ${structureKind},
      ${update.sourceAvailability},
      ${update.checkedAt},
      ${update.markDirectoryRefreshed ? update.checkedAt : null},
      ${update.availabilityNote},
      ${update.receivedItemCount},
      ${update.uniqueItemCount}
    )
    on conflict (academic_year_id, structure_kind) do update set
      source_availability = excluded.source_availability,
      availability_checked_at = excluded.availability_checked_at,
      directory_refreshed_at = case
        when ${update.markDirectoryRefreshed}
          then excluded.directory_refreshed_at
        else academic_structure_directory_statuses.directory_refreshed_at
      end,
      availability_note = excluded.availability_note,
      received_count = coalesce(
        excluded.received_count,
        academic_structure_directory_statuses.received_count
      ),
      unique_count = coalesce(
        excluded.unique_count,
        academic_structure_directory_statuses.unique_count
      ),
      updated_at = now()
  `;
}

async function upsertSourcePage(
  sql: SqlClient,
  {
    sourceId,
    academicYearId,
    structureKind,
    page,
  }: {
    sourceId: number;
    academicYearId: number;
    structureKind: AcademicStructureKind;
    page: AnuAcademicStructureDirectorySourcePage;
  },
) {
  const inserted = await sql`
    insert into public.academic_structure_source_pages (
      source_id,
      academic_year_id,
      page_kind,
      structure_kind,
      external_key,
      canonical_url,
      media_type,
      content_sha256,
      byte_size,
      http_status,
      http_etag,
      source_last_modified,
      fetched_at
    )
    values (
      ${sourceId},
      ${academicYearId},
      ${"directory"},
      ${structureKind},
      ${page.externalKey},
      ${page.sourceUrl},
      ${page.mediaType},
      ${page.contentSha256},
      ${page.byteSize},
      ${page.httpStatus},
      ${page.httpEtag},
      ${page.sourceLastModified},
      ${page.fetchedAt}
    )
    on conflict (
      source_id,
      academic_year_id,
      page_kind,
      external_key,
      content_sha256
    ) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;

  const [existing] = await sql`
    select id
    from public.academic_structure_source_pages
    where source_id = ${sourceId}
      and academic_year_id = ${academicYearId}
      and page_kind = ${"directory"}
      and external_key = ${page.externalKey}
      and content_sha256 = ${page.contentSha256}
  `;
  if (!existing) {
    throw new Error(
      `The ${page.externalKey} directory source page could not be resolved.`,
    );
  }
  return existing.id as number;
}

function normalisedNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "";
}

function entryFingerprint(entry: {
  title: string;
  shortTitle: string | null;
  academicCareer: string | null;
  durationYears: unknown;
  units: unknown;
  modeOfDelivery: string | null;
  selectionRank: unknown;
}) {
  return [
    entry.title,
    entry.shortTitle ?? "",
    entry.academicCareer ?? "",
    normalisedNumber(entry.durationYears),
    normalisedNumber(entry.units),
    entry.modeOfDelivery ?? "",
    normalisedNumber(entry.selectionRank),
  ].join("\u0000");
}

function responsePolicy(
  directory: AnuAcademicStructureDirectory,
): DirectoryAvailabilityUpdate {
  const trustedComplete =
    directory.isComplete && directory.diagnostics.length === 0;
  const hasEntries = directory.entries.length > 0;

  if (trustedComplete && !hasEntries) {
    return {
      sourceAvailability: "unavailable",
      checkedAt: directory.fetchedAt,
      availabilityNote: `ANU returned a complete ${directory.kind} directory with no entries for ${directory.academicYear}.`,
      markDirectoryRefreshed: true,
      retireMissingEntries: true,
      receivedItemCount: directory.receivedItemCount,
      uniqueItemCount: directory.uniqueItemCount,
    };
  }

  if (trustedComplete) {
    return {
      sourceAvailability: "available",
      checkedAt: directory.fetchedAt,
      availabilityNote: null,
      markDirectoryRefreshed: true,
      retireMissingEntries: true,
      receivedItemCount: directory.receivedItemCount,
      uniqueItemCount: directory.uniqueItemCount,
    };
  }

  if (hasEntries) {
    return {
      sourceAvailability: "available",
      checkedAt: directory.fetchedAt,
      availabilityNote:
        "ANU returned academic structure data, but the directory response was incomplete or contained diagnostics. Existing entries were preserved.",
      markDirectoryRefreshed: false,
      retireMissingEntries: false,
      receivedItemCount: directory.receivedItemCount,
      uniqueItemCount: directory.uniqueItemCount,
    };
  }

  return {
    sourceAvailability: "unknown",
    checkedAt: directory.fetchedAt,
    availabilityNote:
      "The ANU academic structure directory response could not be used. Existing entries were preserved.",
    markDirectoryRefreshed: false,
    retireMissingEntries: false,
    receivedItemCount: directory.receivedItemCount,
    uniqueItemCount: directory.uniqueItemCount,
  };
}

function failurePolicy({
  academicYear,
  structureKind,
  error,
  checkedAt,
}: {
  academicYear: number;
  structureKind: AcademicStructureKind;
  error: unknown;
  checkedAt: string;
}): DirectoryAvailabilityUpdate {
  if (
    error instanceof AnuAcademicStructureDirectoryHttpError &&
    (error.status === 404 || error.status === 410)
  ) {
    return {
      sourceAvailability: "unavailable",
      checkedAt,
      availabilityNote: `ANU returned HTTP ${error.status}, so no ${structureKindLabel(structureKind, 1)} directory is available for ${academicYear}.`,
      markDirectoryRefreshed: false,
      retireMissingEntries: false,
      receivedItemCount: null,
      uniqueItemCount: null,
    };
  }

  const detail = error instanceof Error ? error.message : "Unknown error.";
  return {
    sourceAvailability: "unknown",
    checkedAt,
    availabilityNote: `The ANU ${structureKindLabel(structureKind, 1)} directory check failed: ${detail}`,
    markDirectoryRefreshed: false,
    retireMissingEntries: false,
    receivedItemCount: null,
    uniqueItemCount: null,
  };
}

async function writeDirectory(
  sql: SqlClient,
  directory: AnuAcademicStructureDirectory,
  availability: DirectoryAvailabilityUpdate,
  errorCount: number,
) {
  const sourceId = await upsertStructureSource(sql);
  const academicYearId = await upsertAcademicYear(sql, directory.academicYear);
  const sourcePageIds = new Map<string, number>();
  for (const page of directory.sourcePages) {
    sourcePageIds.set(
      page.externalKey,
      await upsertSourcePage(sql, {
        sourceId,
        academicYearId,
        structureKind: directory.kind,
        page,
      }),
    );
  }

  const existingRows = await sql`
    select
      code,
      title,
      short_title,
      academic_career,
      duration_years,
      units,
      mode_of_delivery,
      selection_rank
    from public.academic_structure_directory_entries
    where academic_year_id = ${academicYearId}
      and structure_kind = ${directory.kind}
  `;
  const existing = new Map(
    existingRows.map((row) => [
      row.code as string,
      entryFingerprint({
        title: row.title as string,
        shortTitle: (row.short_title as string | null) ?? null,
        academicCareer: (row.academic_career as string | null) ?? null,
        durationYears: row.duration_years,
        units: row.units,
        modeOfDelivery: (row.mode_of_delivery as string | null) ?? null,
        selectionRank: row.selection_rank,
      }),
    ]),
  );
  const counts: AcademicStructureDirectoryRefreshCounts = {
    added: 0,
    changed: 0,
    checked: directory.entries.length,
    failed: errorCount > 0 ? 1 : 0,
    unchanged: 0,
  };

  const rows = directory.entries.map((entry) => {
    const sourcePageId = sourcePageIds.get(entry.sourcePageExternalKey);
    if (!sourcePageId) {
      throw new Error(
        `The source page for ${entry.code} could not be resolved.`,
      );
    }
    const next = entryFingerprint(entry);
    const previous = existing.get(entry.code);
    if (previous === undefined) counts.added += 1;
    else if (previous === next) counts.unchanged += 1;
    else counts.changed += 1;
    return {
      academic_year_id: academicYearId,
      source_id: sourceId,
      source_page_id: sourcePageId,
      structure_kind: directory.kind,
      code: entry.code,
      title: entry.title,
      short_title: entry.shortTitle,
      academic_career: entry.academicCareer,
      duration_years: entry.durationYears,
      units: entry.units,
      mode_of_delivery: entry.modeOfDelivery,
      selection_rank: entry.selectionRank,
      source_url: entry.sourceUrl,
      is_available: true,
      first_seen_at: directory.fetchedAt,
      last_seen_at: directory.fetchedAt,
    };
  });

  const batchSize = 200;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await sql`
      insert into public.academic_structure_directory_entries ${sql(batch)}
      on conflict (academic_year_id, structure_kind, code) do update set
        source_id = excluded.source_id,
        source_page_id = excluded.source_page_id,
        title = excluded.title,
        short_title = excluded.short_title,
        academic_career = excluded.academic_career,
        duration_years = excluded.duration_years,
        units = excluded.units,
        mode_of_delivery = excluded.mode_of_delivery,
        selection_rank = excluded.selection_rank,
        source_url = excluded.source_url,
        is_available = true,
        last_seen_at = excluded.last_seen_at,
        updated_at = now()
    `;
  }

  if (availability.retireMissingEntries) {
    const currentCodes = directory.entries.map((entry) => entry.code);
    if (currentCodes.length === 0) {
      await sql`
        update public.academic_structure_directory_entries
        set is_available = false, updated_at = now()
        where academic_year_id = ${academicYearId}
          and structure_kind = ${directory.kind}
          and is_available
      `;
    } else {
      await sql`
        update public.academic_structure_directory_entries
        set is_available = false, updated_at = now()
        where academic_year_id = ${academicYearId}
          and structure_kind = ${directory.kind}
          and is_available
          and not (code = any(${currentCodes}))
      `;
    }
  }

  await updateDirectoryStatus(
    sql,
    academicYearId,
    directory.kind,
    availability,
  );
  return counts;
}

async function refreshAcademicStructureDirectory(
  sql: SqlClient,
  academicYear: number,
  structureKind: AcademicStructureKind,
  onProgress?: (
    progress: AcademicStructureDirectoryRefreshProgress,
  ) => void | Promise<void>,
  fetchImpl?: typeof fetch,
): Promise<AcademicStructureDirectoryRefreshResult> {
  const label = structureKindLabel(structureKind);
  await onProgress?.({
    action: "fetching",
    message: `Fetching ${label} directory`,
  });

  let directory: AnuAcademicStructureDirectory;
  try {
    directory = await fetchAnuAcademicStructureDirectory(
      structureKind,
      academicYear,
      { ...(fetchImpl ? { fetchImpl } : {}) },
    );
  } catch (error) {
    await sql.begin(async (transaction) => {
      const tx = transaction as unknown as SqlClient;
      const academicYearId = await upsertAcademicYear(tx, academicYear);
      await updateDirectoryStatus(
        tx,
        academicYearId,
        structureKind,
        failurePolicy({
          academicYear,
          structureKind,
          error,
          checkedAt: new Date().toISOString(),
        }),
      );
    });
    throw error;
  }

  const errorCount = directory.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;
  const warningCount = directory.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length;
  const availability = responsePolicy(directory);

  await onProgress?.({
    action: "writing",
    message: `Writing ${directory.entries.length} ${structureKindLabel(structureKind, directory.entries.length)}`,
  });
  const counts = await sql.begin(async (transaction) =>
    writeDirectory(
      transaction as unknown as SqlClient,
      directory,
      availability,
      errorCount,
    ),
  );

  await onProgress?.({
    action: "complete",
    message: `${structureKindLabel(structureKind, 1)} directory refreshed`,
  });
  return {
    status: errorCount > 0 ? "failed" : "succeeded",
    counts,
    warningCount,
    errorCount,
    receivedItemCount: directory.receivedItemCount,
    uniqueItemCount: directory.uniqueItemCount,
  };
}

function demoResult(): AcademicStructureDirectoryRefreshResult {
  return {
    status: "succeeded",
    counts: {
      added: 12,
      changed: 0,
      checked: 12,
      failed: 0,
      unchanged: 0,
    },
    warningCount: 0,
    errorCount: 0,
    receivedItemCount: 12,
    uniqueItemCount: 12,
  };
}

export async function refreshAcademicStructureDirectoryForYear({
  academicYear,
  structureKind,
  onProgress,
  fetchImpl,
}: {
  academicYear: number;
  structureKind: AcademicStructureKind;
  onProgress?: (
    progress: AcademicStructureDirectoryRefreshProgress,
  ) => void | Promise<void>;
  fetchImpl?: typeof fetch;
}): Promise<AcademicStructureDirectoryRefreshResult> {
  assertSupportedAcademicStructureImportYear(academicYear);
  if (!isAcademicStructureDirectoryKind(structureKind)) {
    throw new TypeError("Choose programme, major, minor or specialisation.");
  }

  if (isDemoMode()) {
    await onProgress?.({
      action: "fetching",
      message: `Demo ${structureKindLabel(structureKind, 1)} directory`,
    });
    await onProgress?.({
      action: "complete",
      message: `Demo ${structureKindLabel(structureKind, 1)} directory refreshed`,
    });
    return demoResult();
  }

  const sql =
    process.env.NODE_ENV === "development"
      ? await createLocalDatabaseClient()
      : createHostedImportDatabaseClient(configuredImportDatabaseUrl());
  try {
    return await refreshAcademicStructureDirectory(
      sql,
      academicYear,
      structureKind,
      onProgress,
      fetchImpl,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function refreshAcademicStructureDirectoryForYearLocal({
  academicYear,
  structureKind,
  onProgress,
  fetchImpl,
}: {
  academicYear: number;
  structureKind: AcademicStructureKind;
  onProgress?: (
    progress: AcademicStructureDirectoryRefreshProgress,
  ) => void | Promise<void>;
  fetchImpl?: typeof fetch;
}): Promise<AcademicStructureDirectoryRefreshResult> {
  assertSupportedAcademicStructureImportYear(academicYear);
  if (!isAcademicStructureDirectoryKind(structureKind)) {
    throw new TypeError("Choose programme, major, minor or specialisation.");
  }

  const sql = await createLocalDatabaseClient();
  try {
    return await refreshAcademicStructureDirectory(
      sql,
      academicYear,
      structureKind,
      onProgress,
      fetchImpl,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
