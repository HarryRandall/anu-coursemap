import { createHash } from "node:crypto";
import {
  fetchAnuCourseDirectory,
  type AnuCourseDirectory,
  type AnuCourseDirectoryEntry,
} from "./anu-course-directory.ts";
import {
  courseDirectoryEntriesRefreshEnabled,
  courseDirectoryFailurePolicy,
  courseDirectoryResponsePolicy,
  type CourseDirectoryAvailabilityUpdate,
} from "./course-directory-policy.ts";
import {
  fetchAnuProgrammeDirectory,
  type AnuProgrammeDirectoryEntry,
} from "./anu-programme-directory.ts";
import {
  assertSupportedCatalogueYear,
  assertSupportedCourseImportYear,
} from "./catalogue-years.ts";
import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./anu-programs-courses.ts";
import { isDemoMode } from "../supabase/config.ts";
import {
  createHostedCatalogueDatabaseClient,
  createLocalDatabaseClient,
} from "../../scripts/catalogue/lib/local-database.mjs";

export const ANU_DIRECTORY_PARSER_VERSION = "anu-programs-courses-directory-v1";

export class CatalogueImportConfigurationError extends Error {
  constructor() {
    super(
      "Configure COURSEMAP_IMPORT_DATABASE_URL before running imports on Vercel.",
    );
    this.name = "CatalogueImportConfigurationError";
  }
}

export type DirectorySyncTarget = "courses" | "programmes";

export type DirectorySyncProgress = {
  action: "fetching" | "writing" | "complete";
  message: string;
  target: DirectorySyncTarget;
};

export type DirectorySyncCounts = {
  added: number;
  changed: number;
  checked: number;
  failed: number;
  unchanged: number;
};

export type DirectorySyncResult = {
  status: "succeeded" | "failed";
  runId: string;
  target: DirectorySyncTarget;
  counts: DirectorySyncCounts;
  warningCount: number;
  errorCount: number;
};

type SqlClient = Awaited<ReturnType<typeof createLocalDatabaseClient>>;

function configuredImportDatabaseUrl() {
  const connectionString = process.env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) throw new CatalogueImportConfigurationError();
  return connectionString;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function upsertSource(sql: SqlClient) {
  const { name, kind, baseUrl } = ANU_PROGRAMS_AND_COURSES_SOURCE;
  const inserted = await sql`
    insert into public.catalogue_sources (name, kind, base_url, is_active)
    values (${name}, ${kind}, ${baseUrl}, true)
    on conflict (kind, base_url) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;

  await sql`
    update public.catalogue_sources
    set name = ${name}, is_active = true
    where kind = ${kind}
      and base_url = ${baseUrl}
      and (name, is_active) is distinct from (${name}, true)
  `;
  const [existing] = await sql`
    select id
    from public.catalogue_sources
    where kind = ${kind} and base_url = ${baseUrl}
  `;
  return existing!.id as number;
}

async function upsertCatalogueYear(sql: SqlClient, year: number) {
  const inserted = await sql`
    insert into public.catalogue_years (year, status)
    values (${year}, 'draft')
    on conflict (year) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;
  const [existing] = await sql`
    select id from public.catalogue_years where year = ${year}
  `;
  return existing!.id as number;
}

async function upsertCourseSource(sql: SqlClient) {
  const { name, baseUrl } = ANU_PROGRAMS_AND_COURSES_SOURCE;
  const kind = "anu_programs_courses";
  const inserted = await sql`
    insert into public.course_sources (name, kind, base_url, is_active)
    values (${name}, ${kind}, ${baseUrl}, true)
    on conflict (kind, base_url) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;

  const [existing] = await sql`
    update public.course_sources
    set name = ${name}, is_active = true
    where kind = ${kind} and base_url = ${baseUrl}
    returning id
  `;
  if (!existing) throw new Error("The course source could not be resolved.");
  return existing.id as number;
}

async function upsertAcademicYear(sql: SqlClient, year: number) {
  const [academicYear] = await sql`
    insert into public.academic_years (year, is_import_enabled)
    values (${year}, ${year >= 2020 && year <= 2030})
    on conflict (year) do update set
      is_import_enabled = excluded.is_import_enabled
    returning id
  `;
  if (!academicYear)
    throw new Error("The academic year could not be resolved.");
  return academicYear.id as number;
}

async function updateAcademicYearAvailability(
  sql: SqlClient,
  academicYearId: number,
  update: CourseDirectoryAvailabilityUpdate,
) {
  await sql`
    update public.academic_years
    set
      source_availability = ${update.sourceAvailability},
      availability_checked_at = ${update.checkedAt},
      directory_refreshed_at = case
        when ${update.markDirectoryRefreshed}
          then ${update.checkedAt}
        else directory_refreshed_at
      end,
      availability_note = ${update.availabilityNote}
    where id = ${academicYearId}
  `;
}

async function upsertCourseSourceDocument(
  sql: SqlClient,
  {
    sourceId,
    academicYearId,
    canonicalUrl,
    contentSha256,
    fetchedAt,
  }: {
    sourceId: number;
    academicYearId: number;
    canonicalUrl: string;
    contentSha256: string;
    fetchedAt: string;
  },
) {
  const inserted = await sql`
    insert into public.course_source_documents (
      source_id,
      academic_year_id,
      document_kind,
      external_key,
      canonical_url,
      media_type,
      content_sha256,
      http_status,
      fetched_at
    )
    values (
      ${sourceId},
      ${academicYearId},
      ${"course_directory"},
      ${"directory"},
      ${canonicalUrl},
      ${"application/json"},
      ${contentSha256},
      ${200},
      ${fetchedAt}
    )
    on conflict (
      source_id,
      academic_year_id,
      document_kind,
      external_key,
      content_sha256
    ) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;

  const [existing] = await sql`
    select id
    from public.course_source_documents
    where source_id = ${sourceId}
      and academic_year_id = ${academicYearId}
      and document_kind = ${"course_directory"}
      and external_key = ${"directory"}
      and content_sha256 = ${contentSha256}
  `;
  if (!existing) {
    throw new Error(
      "The course directory source document could not be resolved.",
    );
  }
  return existing.id as number;
}

async function syncCourseFoundationDirectory(
  sql: SqlClient,
  {
    catalogueYear,
    entries,
    canonicalUrl,
    contentSha256,
    fetchedAt,
    availability,
  }: {
    catalogueYear: number;
    entries: Array<AnuCourseDirectoryEntry & { name: string }>;
    canonicalUrl: string;
    contentSha256: string;
    fetchedAt: string;
    availability: CourseDirectoryAvailabilityUpdate;
  },
) {
  const sourceId = await upsertCourseSource(sql);
  const academicYearId = await upsertAcademicYear(sql, catalogueYear);
  const sourceDocumentId = await upsertCourseSourceDocument(sql, {
    sourceId,
    academicYearId,
    canonicalUrl,
    contentSha256,
    fetchedAt,
  });

  const batchSize = 200;
  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);
    await sql`
      insert into public.course_directory_entries ${sql(
        batch.map((entry) => ({
          academic_year_id: academicYearId,
          code: entry.code,
          title: entry.name,
          units: entry.units,
          academic_career: entry.career,
          session: entry.session,
          mode_of_delivery: entry.modeOfDelivery,
          source_document_id: sourceDocumentId,
          first_seen_at: fetchedAt,
          last_seen_at: fetchedAt,
          is_current: true,
        })),
      )}
      on conflict (academic_year_id, code) do update set
        title = excluded.title,
        units = excluded.units,
        academic_career = excluded.academic_career,
        session = excluded.session,
        mode_of_delivery = excluded.mode_of_delivery,
        source_document_id = excluded.source_document_id,
        last_seen_at = excluded.last_seen_at,
        is_current = true,
        updated_at = now()
    `;
  }

  const currentCodes = entries.map((entry) => entry.code);
  if (availability.retireMissingEntries && currentCodes.length > 0) {
    await sql`
      update public.course_directory_entries
      set is_current = false, updated_at = now()
      where academic_year_id = ${academicYearId}
        and is_current
        and not (code = any(${currentCodes}))
    `;
  }
  await sql`
    update public.course_directory_entries as entries
    set course_id = courses.id, updated_at = now()
    from public.courses as courses
    where entries.academic_year_id = ${academicYearId}
      and entries.code = courses.code
      and entries.course_id is distinct from courses.id
  `;
  await updateAcademicYearAvailability(sql, academicYearId, availability);
}

async function upsertSourceDocument(
  sql: SqlClient,
  {
    sourceId,
    catalogueYearId,
    entityKind,
    canonicalUrl,
    contentSha256,
    fetchedAt,
  }: {
    sourceId: number;
    catalogueYearId: number;
    entityKind: "course_directory" | "programme_directory";
    canonicalUrl: string;
    contentSha256: string;
    fetchedAt: string;
  },
) {
  const externalKey = "directory";
  const inserted = await sql`
    insert into public.catalogue_source_documents (
      source_id,
      catalogue_year_id,
      entity_kind,
      external_key,
      canonical_url,
      content_sha256,
      fetched_at
    )
    values (
      ${sourceId},
      ${catalogueYearId},
      ${entityKind},
      ${externalKey},
      ${canonicalUrl},
      ${contentSha256},
      ${fetchedAt}
    )
    on conflict (
      source_id,
      catalogue_year_id,
      entity_kind,
      external_key,
      content_sha256
    ) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;

  const [existing] = await sql`
    select id
    from public.catalogue_source_documents
    where source_id = ${sourceId}
      and catalogue_year_id = ${catalogueYearId}
      and entity_kind = ${entityKind}
      and external_key = ${externalKey}
      and content_sha256 = ${contentSha256}
  `;
  return existing!.id as number;
}

function courseFingerprint(entry: {
  title: string;
  units: number | null;
  career: string | null;
  session: string | null;
  mode_of_delivery: string | null;
}) {
  const units =
    entry.units == null || !Number.isFinite(Number(entry.units))
      ? ""
      : String(Number(entry.units));
  return [
    entry.title,
    units,
    entry.career ?? "",
    entry.session ?? "",
    entry.mode_of_delivery ?? "",
  ].join("\u0000");
}

function programmeFingerprint(entry: {
  title: string;
  kind: string;
  career: string | null;
  duration: number | null;
}) {
  const duration =
    entry.duration == null || !Number.isFinite(Number(entry.duration))
      ? ""
      : String(Number(entry.duration));
  return [entry.title, entry.kind, entry.career ?? "", duration].join("\u0000");
}

async function syncCourseDirectory(
  sql: SqlClient,
  catalogueYear: number,
  onProgress?: (progress: DirectorySyncProgress) => void | Promise<void>,
  fetchImpl?: typeof fetch,
): Promise<DirectorySyncResult> {
  await onProgress?.({
    action: "fetching",
    message: "Fetching course directory",
    target: "courses",
  });

  const nativeDirectoryEnabled = courseDirectoryEntriesRefreshEnabled();
  let directory: AnuCourseDirectory;
  try {
    directory = await fetchAnuCourseDirectory(catalogueYear, {
      ...(fetchImpl ? { fetchImpl } : {}),
    });
  } catch (error) {
    if (nativeDirectoryEnabled) {
      const academicYearId = await upsertAcademicYear(sql, catalogueYear);
      await updateAcademicYearAvailability(
        sql,
        academicYearId,
        courseDirectoryFailurePolicy({
          catalogueYear,
          error,
          checkedAt: new Date().toISOString(),
        }),
      );
    }
    throw error;
  }
  const availability = courseDirectoryResponsePolicy(directory);
  const usable = directory.entries.filter(
    (entry): entry is AnuCourseDirectoryEntry & { name: string } =>
      typeof entry.name === "string" && entry.name.trim() !== "",
  );
  const errorCount = directory.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;
  const warningCount = directory.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length;

  await onProgress?.({
    action: "writing",
    message: `Writing ${usable.length} course codes`,
    target: "courses",
  });

  const sourceId = await upsertSource(sql);
  const catalogueYearId = await upsertCatalogueYear(sql, catalogueYear);
  const contentSha256 = sha256(
    JSON.stringify({
      totalCount: directory.totalCount,
      receivedItemCount: directory.receivedItemCount,
      isComplete: directory.isComplete,
      entries: usable.map((entry) => [
        entry.code,
        entry.name,
        entry.units,
        entry.career,
        entry.session,
        entry.modeOfDelivery,
      ]),
      diagnostics: directory.diagnostics,
    }),
  );
  const sourceDocumentId = await upsertSourceDocument(sql, {
    sourceId,
    catalogueYearId,
    entityKind: "course_directory",
    canonicalUrl: directory.sourceUrl,
    contentSha256,
    fetchedAt: directory.fetchedAt,
  });

  const [run] = await sql`
    insert into public.catalogue_import_runs (
      source_id,
      catalogue_year_id,
      scope,
      trigger_kind,
      parser_version,
      status
    )
    values (
      ${sourceId},
      ${catalogueYearId},
      ${"directory:courses"},
      ${"manual"},
      ${ANU_DIRECTORY_PARSER_VERSION},
      ${"running"}
    )
    returning id
  `;
  const runId = run!.id as string;

  const existingRows = await sql`
    select code, title, units, career, session, mode_of_delivery
    from public.catalogue_directory_courses
    where catalogue_year_id = ${catalogueYearId}
  `;
  const existing = new Map(
    existingRows.map((row) => [
      row.code as string,
      courseFingerprint({
        title: row.title as string,
        units: (row.units as number | null) ?? null,
        career: (row.career as string | null) ?? null,
        session: (row.session as string | null) ?? null,
        mode_of_delivery: (row.mode_of_delivery as string | null) ?? null,
      }),
    ]),
  );

  const counts: DirectorySyncCounts = {
    added: 0,
    changed: 0,
    checked: usable.length,
    failed: errorCount > 0 ? 1 : 0,
    unchanged: 0,
  };

  const batchSize = 200;
  for (let index = 0; index < usable.length; index += batchSize) {
    const batch = usable.slice(index, index + batchSize);
    for (const entry of batch) {
      const next = courseFingerprint({
        title: entry.name,
        units: entry.units,
        career: entry.career,
        session: entry.session,
        mode_of_delivery: entry.modeOfDelivery,
      });
      const previous = existing.get(entry.code);
      if (previous === undefined) counts.added += 1;
      else if (previous !== next) counts.changed += 1;
      else counts.unchanged += 1;
    }

    await sql`
      insert into public.catalogue_directory_courses ${sql(
        batch.map((entry) => ({
          catalogue_year_id: catalogueYearId,
          code: entry.code,
          title: entry.name,
          units: entry.units,
          career: entry.career,
          session: entry.session,
          mode_of_delivery: entry.modeOfDelivery,
          source_document_id: sourceDocumentId,
          import_run_id: runId,
        })),
      )}
      on conflict (catalogue_year_id, code) do update set
        title = excluded.title,
        units = excluded.units,
        career = excluded.career,
        session = excluded.session,
        mode_of_delivery = excluded.mode_of_delivery,
        source_document_id = excluded.source_document_id,
        import_run_id = excluded.import_run_id,
        updated_at = now()
    `;
  }

  // Native directory writes have their own server-side deployment switch.
  // Queue dispatch can therefore remain disabled while directory refreshes
  // are tested independently.
  if (nativeDirectoryEnabled) {
    await syncCourseFoundationDirectory(sql, {
      catalogueYear,
      entries: usable,
      canonicalUrl: directory.sourceUrl,
      contentSha256,
      fetchedAt: directory.fetchedAt,
      availability,
    });
  }

  const outcome =
    counts.failed > 0
      ? "failed"
      : counts.added > 0
        ? "created"
        : counts.changed > 0
          ? "updated"
          : "unchanged";

  await sql`
    insert into public.catalogue_import_items (
      run_id,
      source_document_id,
      source_id,
      catalogue_year_id,
      outcome,
      target_kind,
      target_key,
      diagnostics
    )
    values (
      ${runId},
      ${sourceDocumentId},
      ${sourceId},
      ${catalogueYearId},
      ${outcome},
      ${"course_directory"},
      ${String(catalogueYear)},
      ${sql.json({
        warningCount,
        errorCount,
        totalCount: directory.totalCount,
        receivedItemCount: directory.receivedItemCount,
        isComplete: directory.isComplete,
        retiredMissingEntries:
          nativeDirectoryEnabled && availability.retireMissingEntries,
        diagnostics: directory.diagnostics.slice(0, 50),
      })}
    )
  `;

  const status = counts.failed > 0 ? "failed" : "succeeded";

  await sql`
    update public.catalogue_import_runs
    set
      status = ${status},
      checked_count = ${counts.checked},
      added_count = ${counts.added},
      changed_count = ${counts.changed},
      unchanged_count = ${counts.unchanged},
      failed_count = ${counts.failed},
      error_summary = ${
        status === "failed"
          ? "Course directory sync returned an invalid or incomplete response."
          : null
      },
      completed_at = now()
    where id = ${runId}
  `;

  await onProgress?.({
    action: "complete",
    message: "Course directory refreshed",
    target: "courses",
  });

  return {
    status,
    runId,
    target: "courses",
    counts,
    warningCount,
    errorCount,
  };
}

async function syncProgrammeDirectory(
  sql: SqlClient,
  catalogueYear: number,
  onProgress?: (progress: DirectorySyncProgress) => void | Promise<void>,
  fetchImpl?: typeof fetch,
): Promise<DirectorySyncResult> {
  await onProgress?.({
    action: "fetching",
    message: "Fetching programme directory",
    target: "programmes",
  });

  const directory = await fetchAnuProgrammeDirectory(catalogueYear, {
    ...(fetchImpl ? { fetchImpl } : {}),
  });
  const usable: AnuProgrammeDirectoryEntry[] = directory.entries;
  const errorCount = directory.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;
  const warningCount = directory.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length;

  await onProgress?.({
    action: "writing",
    message: `Writing ${usable.length} programme codes`,
    target: "programmes",
  });

  const sourceId = await upsertSource(sql);
  const catalogueYearId = await upsertCatalogueYear(sql, catalogueYear);
  const contentSha256 = sha256(
    JSON.stringify(
      usable.map((entry) => [
        entry.code,
        entry.title,
        entry.kind,
        entry.career,
        entry.duration,
      ]),
    ),
  );
  const sourceDocumentId = await upsertSourceDocument(sql, {
    sourceId,
    catalogueYearId,
    entityKind: "programme_directory",
    canonicalUrl:
      directory.sourceUrls[0] ?? ANU_PROGRAMS_AND_COURSES_SOURCE.baseUrl,
    contentSha256,
    fetchedAt: directory.fetchedAt,
  });

  const [run] = await sql`
    insert into public.catalogue_import_runs (
      source_id,
      catalogue_year_id,
      scope,
      trigger_kind,
      parser_version,
      status
    )
    values (
      ${sourceId},
      ${catalogueYearId},
      ${"directory:programmes"},
      ${"manual"},
      ${ANU_DIRECTORY_PARSER_VERSION},
      ${"running"}
    )
    returning id
  `;
  const runId = run!.id as string;

  const existingRows = await sql`
    select code, title, kind, career, duration
    from public.catalogue_directory_programmes
    where catalogue_year_id = ${catalogueYearId}
  `;
  const existing = new Map(
    existingRows.map((row) => [
      row.code as string,
      programmeFingerprint({
        title: row.title as string,
        kind: row.kind as string,
        career: (row.career as string | null) ?? null,
        duration: (row.duration as number | null) ?? null,
      }),
    ]),
  );

  const counts: DirectorySyncCounts = {
    added: 0,
    changed: 0,
    checked: usable.length,
    failed: errorCount > 0 && usable.length === 0 ? 1 : 0,
    unchanged: 0,
  };

  const batchSize = 200;
  for (let index = 0; index < usable.length; index += batchSize) {
    const batch = usable.slice(index, index + batchSize);
    for (const entry of batch) {
      const next = programmeFingerprint(entry);
      const previous = existing.get(entry.code);
      if (previous === undefined) counts.added += 1;
      else if (previous !== next) counts.changed += 1;
      else counts.unchanged += 1;
    }

    await sql`
      insert into public.catalogue_directory_programmes ${sql(
        batch.map((entry) => ({
          catalogue_year_id: catalogueYearId,
          code: entry.code,
          title: entry.title,
          kind: entry.kind,
          career: entry.career,
          duration: entry.duration,
          source_document_id: sourceDocumentId,
          import_run_id: runId,
        })),
      )}
      on conflict (catalogue_year_id, code) do update set
        title = excluded.title,
        kind = excluded.kind,
        career = excluded.career,
        duration = excluded.duration,
        source_document_id = excluded.source_document_id,
        import_run_id = excluded.import_run_id,
        updated_at = now()
    `;
  }

  const outcome =
    counts.failed > 0
      ? "failed"
      : counts.added > 0
        ? "created"
        : counts.changed > 0
          ? "updated"
          : "unchanged";

  await sql`
    insert into public.catalogue_import_items (
      run_id,
      source_document_id,
      source_id,
      catalogue_year_id,
      outcome,
      target_kind,
      target_key,
      diagnostics
    )
    values (
      ${runId},
      ${sourceDocumentId},
      ${sourceId},
      ${catalogueYearId},
      ${outcome},
      ${"programme_directory"},
      ${String(catalogueYear)},
      ${sql.json({
        warningCount,
        errorCount,
        diagnostics: directory.diagnostics.slice(0, 50),
      })}
    )
  `;

  const status =
    counts.failed > 0 || (errorCount > 0 && usable.length === 0)
      ? "failed"
      : "succeeded";

  await sql`
    update public.catalogue_import_runs
    set
      status = ${status},
      checked_count = ${counts.checked},
      added_count = ${counts.added},
      changed_count = ${counts.changed},
      unchanged_count = ${counts.unchanged},
      failed_count = ${counts.failed},
      error_summary = ${
        status === "failed"
          ? "Programme directory sync returned no usable programmes."
          : null
      },
      completed_at = now()
    where id = ${runId}
  `;

  await onProgress?.({
    action: "complete",
    message: "Programme directory refreshed",
    target: "programmes",
  });

  return {
    status,
    runId,
    target: "programmes",
    counts,
    warningCount,
    errorCount,
  };
}

function demoResult(target: DirectorySyncTarget): DirectorySyncResult {
  return {
    status: "succeeded",
    runId: `demo-directory-${target}`,
    target,
    counts: {
      added: target === "courses" ? 12 : 6,
      changed: 0,
      checked: target === "courses" ? 12 : 6,
      failed: 0,
      unchanged: 0,
    },
    warningCount: 0,
    errorCount: 0,
  };
}

/**
 * Refresh the lightweight ANU directory for one target in a catalogue year.
 */
export async function runDirectorySync({
  catalogueYear,
  target,
  onProgress,
  fetchImpl,
}: {
  catalogueYear: number;
  target: DirectorySyncTarget;
  onProgress?: (progress: DirectorySyncProgress) => void | Promise<void>;
  fetchImpl?: typeof fetch;
}): Promise<DirectorySyncResult> {
  if (target === "courses") assertSupportedCourseImportYear(catalogueYear);
  else assertSupportedCatalogueYear(catalogueYear);

  if (isDemoMode()) {
    await onProgress?.({
      action: "fetching",
      message: `Demo ${target} directory`,
      target,
    });
    await onProgress?.({
      action: "complete",
      message: `Demo ${target} directory refreshed`,
      target,
    });
    return demoResult(target);
  }

  const sql = createHostedCatalogueDatabaseClient(
    configuredImportDatabaseUrl(),
  );

  try {
    if (target === "courses") {
      return await syncCourseDirectory(
        sql,
        catalogueYear,
        onProgress,
        fetchImpl,
      );
    }
    return await syncProgrammeDirectory(
      sql,
      catalogueYear,
      onProgress,
      fetchImpl,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Local / test helper that uses the loopback Postgres client.
 */
export async function runDirectorySyncLocal({
  catalogueYear,
  target,
  onProgress,
  fetchImpl,
}: {
  catalogueYear: number;
  target: DirectorySyncTarget;
  onProgress?: (progress: DirectorySyncProgress) => void | Promise<void>;
  fetchImpl?: typeof fetch;
}): Promise<DirectorySyncResult> {
  if (target === "courses") assertSupportedCourseImportYear(catalogueYear);
  else assertSupportedCatalogueYear(catalogueYear);
  const sql = await createLocalDatabaseClient();
  try {
    if (target === "courses") {
      return await syncCourseDirectory(
        sql,
        catalogueYear,
        onProgress,
        fetchImpl,
      );
    }
    return await syncProgrammeDirectory(
      sql,
      catalogueYear,
      onProgress,
      fetchImpl,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
