import { createHash } from "node:crypto";
import {
  fetchAnuCourseDirectory,
  type AnuCourseDirectory,
  type AnuCourseDirectoryEntry,
} from "./anu-course-directory.ts";
import {
  courseDirectoryFailurePolicy,
  courseDirectoryResponsePolicy,
  type CourseDirectoryAvailabilityUpdate,
} from "./course-directory-policy.ts";
import { assertSupportedCourseImportYear } from "./course-import-years.ts";
import { ANU_PROGRAMS_AND_COURSES_SOURCE } from "./import-source.ts";
import { isDemoMode } from "../supabase/config.ts";
import {
  createHostedImportDatabaseClient,
  createLocalDatabaseClient,
} from "../../scripts/catalogue/lib/local-database.mjs";

export class CourseDirectoryConfigurationError extends Error {
  constructor() {
    super(
      "Configure COURSEMAP_IMPORT_DATABASE_URL before refreshing the course directory on Vercel.",
    );
    this.name = "CourseDirectoryConfigurationError";
  }
}

export type CourseDirectoryRefreshProgress = {
  action: "fetching" | "writing" | "complete";
  message: string;
};

export type CourseDirectoryRefreshCounts = {
  added: number;
  changed: number;
  checked: number;
  failed: number;
  unchanged: number;
};

export type CourseDirectoryRefreshResult = {
  status: "succeeded" | "failed";
  counts: CourseDirectoryRefreshCounts;
  warningCount: number;
  errorCount: number;
};

type SqlClient = Awaited<ReturnType<typeof createLocalDatabaseClient>>;

function configuredImportDatabaseUrl() {
  const connectionString = process.env.COURSEMAP_IMPORT_DATABASE_URL?.trim();
  if (!connectionString) throw new CourseDirectoryConfigurationError();
  return connectionString;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
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

async function upsertCourseSourcePage(
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
    insert into public.course_source_pages (
      source_id,
      academic_year_id,
      page_kind,
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
      page_kind,
      external_key,
      content_sha256
    ) do nothing
    returning id
  `;
  if (inserted.length > 0) return inserted[0]!.id as number;

  const [existing] = await sql`
    select id
    from public.course_source_pages
    where source_id = ${sourceId}
      and academic_year_id = ${academicYearId}
      and page_kind = ${"course_directory"}
      and external_key = ${"directory"}
      and content_sha256 = ${contentSha256}
  `;
  if (!existing) {
    throw new Error("The course directory source page could not be resolved.");
  }
  return existing.id as number;
}

async function writeCourseDirectory(
  sql: SqlClient,
  {
    academicYear,
    entries,
    canonicalUrl,
    contentSha256,
    fetchedAt,
    availability,
    errorCount,
  }: {
    academicYear: number;
    entries: Array<AnuCourseDirectoryEntry & { name: string }>;
    canonicalUrl: string;
    contentSha256: string;
    fetchedAt: string;
    availability: CourseDirectoryAvailabilityUpdate;
    errorCount: number;
  },
) {
  const sourceId = await upsertCourseSource(sql);
  const academicYearId = await upsertAcademicYear(sql, academicYear);
  const sourcePageId = await upsertCourseSourcePage(sql, {
    sourceId,
    academicYearId,
    canonicalUrl,
    contentSha256,
    fetchedAt,
  });

  const existingRows = await sql`
    select code, title, units, academic_career, session, mode_of_delivery
    from public.course_directory_entries
    where academic_year_id = ${academicYearId}
  `;
  const existing = new Map(
    existingRows.map((row) => [
      row.code as string,
      courseFingerprint({
        title: row.title as string,
        units: (row.units as number | null) ?? null,
        career: (row.academic_career as string | null) ?? null,
        session: (row.session as string | null) ?? null,
        mode_of_delivery: (row.mode_of_delivery as string | null) ?? null,
      }),
    ]),
  );
  const counts: CourseDirectoryRefreshCounts = {
    added: 0,
    changed: 0,
    checked: entries.length,
    failed: errorCount > 0 ? 1 : 0,
    unchanged: 0,
  };

  const batchSize = 200;
  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);
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
      insert into public.course_directory_entries ${sql(
        batch.map((entry) => ({
          academic_year_id: academicYearId,
          code: entry.code,
          title: entry.name,
          units: entry.units,
          academic_career: entry.career,
          session: entry.session,
          mode_of_delivery: entry.modeOfDelivery,
          source_page_id: sourcePageId,
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
        source_page_id = excluded.source_page_id,
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
  return { counts, sourcePageId };
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

async function refreshCourseDirectory(
  sql: SqlClient,
  academicYear: number,
  onProgress?: (
    progress: CourseDirectoryRefreshProgress,
  ) => void | Promise<void>,
  fetchImpl?: typeof fetch,
): Promise<CourseDirectoryRefreshResult> {
  await onProgress?.({
    action: "fetching",
    message: "Fetching course directory",
  });

  let directory: AnuCourseDirectory;
  try {
    directory = await fetchAnuCourseDirectory(academicYear, {
      ...(fetchImpl ? { fetchImpl } : {}),
    });
  } catch (error) {
    await sql.begin(async (transaction) => {
      const tx = transaction as unknown as SqlClient;
      const academicYearId = await upsertAcademicYear(tx, academicYear);
      await updateAcademicYearAvailability(
        tx,
        academicYearId,
        courseDirectoryFailurePolicy({
          academicYear,
          error,
          checkedAt: new Date().toISOString(),
        }),
      );
    });
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
  });

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
  const { counts } = await sql.begin(async (transaction) =>
    writeCourseDirectory(transaction as unknown as SqlClient, {
      academicYear,
      entries: usable,
      canonicalUrl: directory.sourceUrl,
      contentSha256,
      fetchedAt: directory.fetchedAt,
      availability,
      errorCount,
    }),
  );

  const status = counts.failed > 0 ? "failed" : "succeeded";

  await onProgress?.({
    action: "complete",
    message: "Course directory refreshed",
  });

  return {
    status,
    counts,
    warningCount,
    errorCount,
  };
}

function demoResult(): CourseDirectoryRefreshResult {
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
  };
}

/**
 * Refresh the lightweight ANU course directory for one academic year.
 */
export async function refreshCourseDirectoryForYear({
  academicYear,
  onProgress,
  fetchImpl,
}: {
  academicYear: number;
  onProgress?: (
    progress: CourseDirectoryRefreshProgress,
  ) => void | Promise<void>;
  fetchImpl?: typeof fetch;
}): Promise<CourseDirectoryRefreshResult> {
  assertSupportedCourseImportYear(academicYear);

  if (isDemoMode()) {
    await onProgress?.({
      action: "fetching",
      message: "Demo course directory",
    });
    await onProgress?.({
      action: "complete",
      message: "Demo course directory refreshed",
    });
    return demoResult();
  }

  const sql =
    process.env.NODE_ENV === "development"
      ? await createLocalDatabaseClient()
      : createHostedImportDatabaseClient(configuredImportDatabaseUrl());

  try {
    return await refreshCourseDirectory(
      sql,
      academicYear,
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
export async function refreshCourseDirectoryForYearLocal({
  academicYear,
  onProgress,
  fetchImpl,
}: {
  academicYear: number;
  onProgress?: (
    progress: CourseDirectoryRefreshProgress,
  ) => void | Promise<void>;
  fetchImpl?: typeof fetch;
}): Promise<CourseDirectoryRefreshResult> {
  assertSupportedCourseImportYear(academicYear);
  const sql = await createLocalDatabaseClient();
  try {
    return await refreshCourseDirectory(
      sql,
      academicYear,
      onProgress,
      fetchImpl,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
