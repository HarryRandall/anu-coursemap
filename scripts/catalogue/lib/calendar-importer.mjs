import { parseUniversityCalendarManifest } from "../../../lib/catalogue-import/anu-university-calendar.ts";
import { assertVerifiedImportDatabaseClient } from "./local-database.mjs";

const IMPORT_LOCK_NAMESPACE = "coursemap:catalogue-import";

function serialisable(value) {
  return JSON.parse(JSON.stringify(value));
}

async function upsertSource(tx, source) {
  const inserted = await tx`
    insert into public.catalogue_sources (name, kind, base_url, is_active)
    values (${source.name}, ${source.kind}, ${source.baseUrl}, true)
    on conflict (kind, base_url) do nothing
    returning id
  `;
  if (inserted.length > 0) {
    return inserted[0].id;
  }

  const [existing] = await tx`
    select id
    from public.catalogue_sources
    where kind = ${source.kind} and base_url = ${source.baseUrl}
  `;
  return existing.id;
}

async function upsertCatalogueYear(tx, year) {
  const inserted = await tx`
    insert into public.catalogue_years (year, status)
    values (${year}, 'draft')
    on conflict (year) do nothing
    returning id
  `;
  if (inserted.length > 0) {
    return inserted[0].id;
  }

  const [existing] = await tx`
    select id from public.catalogue_years where year = ${year}
  `;
  return existing.id;
}

async function upsertSourceDocument(
  tx,
  { catalogueYearId, manifest, sourceId },
) {
  const { document } = manifest;
  const inserted = await tx`
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
      'calendar',
      ${document.externalKey},
      ${document.canonicalUrl},
      ${document.contentSha256},
      ${document.fetchedAt}
    )
    on conflict (source_id, catalogue_year_id, entity_kind, external_key, content_sha256)
    do nothing
    returning id
  `;
  if (inserted.length > 0) {
    return inserted[0].id;
  }

  const [existing] = await tx`
    select id
    from public.catalogue_source_documents
    where source_id = ${sourceId}
      and catalogue_year_id = ${catalogueYearId}
      and entity_kind = 'calendar'
      and external_key = ${document.externalKey}
      and content_sha256 = ${document.contentSha256}
  `;
  return existing.id;
}

async function upsertEvent(tx, { calendarYear, event, sourceDocumentId }) {
  const inserted = await tx`
    insert into public.university_calendar_events (
      calendar_year,
      event_date,
      title,
      status,
      source_document_id
    )
    values (
      ${calendarYear},
      ${event.date},
      ${event.title},
      'published',
      ${sourceDocumentId}
    )
    on conflict (calendar_year, event_date, title) do nothing
    returning id
  `;
  if (inserted.length > 0) {
    return "created";
  }

  const republished = await tx`
    update public.university_calendar_events
    set status = 'published', source_document_id = ${sourceDocumentId}
    where calendar_year = ${calendarYear}
      and event_date = ${event.date}
      and title = ${event.title}
      and status <> 'published'
    returning id
  `;
  return republished.length > 0 ? "updated" : "unchanged";
}

async function importManifestInTransaction(tx, manifest) {
  const lockKey = `${IMPORT_LOCK_NAMESPACE}:${manifest.source.kind}:${manifest.source.baseUrl}:${manifest.calendarYear}`;
  await tx`select pg_advisory_xact_lock(hashtext(${lockKey}))`;

  const sourceId = await upsertSource(tx, manifest.source);
  const catalogueYearId = await upsertCatalogueYear(tx, manifest.calendarYear);

  const [run] = await tx`
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
        ${`university_calendar:${manifest.calendarYear}`},
        'cli',
        ${manifest.parserVersion},
        'running'
      )
      returning id
    `;

  const sourceDocumentId = await upsertSourceDocument(tx, {
    catalogueYearId,
    manifest,
    sourceId,
  });

  const errors = manifest.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  const counts = {
    added: 0,
    archived: 0,
    changed: 0,
    checked: manifest.events.length,
    failed: 0,
    unchanged: 0,
  };
  let outcome = "unchanged";

  if (errors.length > 0) {
    counts.failed = manifest.events.length;
    outcome = "failed";
  } else {
    for (const event of manifest.events) {
      const action = await upsertEvent(tx, {
        calendarYear: manifest.calendarYear,
        event,
        sourceDocumentId,
      });
      if (action === "created") {
        counts.added += 1;
      } else if (action === "updated") {
        counts.changed += 1;
      } else {
        counts.unchanged += 1;
      }
    }

    if (manifest.events.length > 0) {
      const dates = manifest.events.map((event) => event.date);
      const titles = manifest.events.map((event) => event.title);
      const archived = await tx`
          update public.university_calendar_events
          set status = 'archived'
          where calendar_year = ${manifest.calendarYear}
            and status = 'published'
            and not exists (
              select 1
              from unnest(${dates}::date[], ${titles}::text[])
                as manifest(event_date, title)
              where manifest.event_date = university_calendar_events.event_date
                and manifest.title = university_calendar_events.title
            )
          returning id
        `;
      counts.archived = archived.length;
    }

    outcome =
      counts.added > 0
        ? "created"
        : counts.changed > 0 || counts.archived > 0
          ? "updated"
          : "unchanged";
  }

  const diagnostics = serialisable({ issues: manifest.diagnostics });
  await tx`
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
        ${run.id},
        ${sourceDocumentId},
        ${sourceId},
        ${catalogueYearId},
        ${outcome},
        'university_calendar',
        ${manifest.document.externalKey},
        ${diagnostics}
      )
    `;

  const status = errors.length > 0 ? "failed" : "succeeded";
  const errorSummary =
    manifest.diagnostics.length > 0
      ? JSON.stringify({ issues: serialisable(manifest.diagnostics) })
      : null;

  await tx`
      update public.catalogue_import_runs
      set
        status = ${status},
        checked_count = ${counts.checked},
        added_count = ${counts.added},
        changed_count = ${counts.changed + counts.archived},
        unchanged_count = ${counts.unchanged},
        failed_count = ${counts.failed},
        error_summary = ${errorSummary},
        completed_at = now()
      where id = ${run.id}
    `;

  return { counts, runId: run.id, status };
}

/**
 * Import a validated university calendar manifest.
 *
 * The import is idempotent: replaying the same manifest is a no-op. Published
 * events absent from a clean manifest are archived rather than deleted, and a
 * manifest carrying error diagnostics records a failed run without touching
 * event rows.
 */
export async function importUniversityCalendarManifest(sql, value) {
  const manifest = parseUniversityCalendarManifest(value);
  assertVerifiedImportDatabaseClient(sql);
  return sql.begin("read write", async (tx) => {
    await tx`set local statement_timeout = '30s'`;
    await tx`set local lock_timeout = '5s'`;
    return importManifestInTransaction(tx, manifest);
  });
}

/** Test helper mirroring withLocalCatalogueImportTransaction. */
export async function withUniversityCalendarImportTransaction(sql, callback) {
  assertVerifiedImportDatabaseClient(sql);
  if (typeof callback !== "function") {
    throw new TypeError(
      "A university calendar import transaction callback is required.",
    );
  }

  return sql.begin("read write", async (tx) => {
    await tx`set local statement_timeout = '30s'`;
    await tx`set local lock_timeout = '5s'`;
    return callback({
      importManifest: async (value) =>
        importManifestInTransaction(tx, parseUniversityCalendarManifest(value)),
      tx,
    });
  });
}
