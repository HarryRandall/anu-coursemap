import { assertVerifiedCatalogueImportClient } from "./local-database.mjs";

const SOURCE = {
  name: "ANU Programs and Courses",
  kind: "anu_programs_courses_html",
  baseUrl: "https://programsandcourses.anu.edu.au",
};

/**
 * Store a programme faithfully as a draft and retain its full requirement text
 * for review. Course references are imported separately by the programme runner.
 */
export async function importProgrammeDocument(sql, programme) {
  assertVerifiedCatalogueImportClient(sql);
  return sql.begin("read write", async (tx) => {
    await tx`set local statement_timeout = '30s'`;
    await tx`set local lock_timeout = '5s'`;
    await tx`select pg_advisory_xact_lock(hashtext(${`coursemap:programme-import:${programme.catalogueYear}:${programme.code}`}))`;

    await tx`
      insert into public.catalogue_sources (name, kind, base_url, is_active)
      values (${SOURCE.name}, ${SOURCE.kind}, ${SOURCE.baseUrl}, true)
      on conflict (kind, base_url) do update set name = excluded.name, is_active = true
    `;
    const [source] = await tx`
      select id from public.catalogue_sources
      where kind = ${SOURCE.kind} and base_url = ${SOURCE.baseUrl}
    `;
    await tx`
      insert into public.catalogue_years (year, status)
      values (${programme.catalogueYear}, 'draft')
      on conflict (year) do nothing
    `;
    const [year] =
      await tx`select id from public.catalogue_years where year = ${programme.catalogueYear}`;

    const [document] = await tx`
      insert into public.catalogue_source_documents (
        source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
        content_sha256, fetched_at
      ) values (
        ${source.id}, ${year.id}, 'structure', ${programme.code}, ${programme.canonicalUrl},
        ${programme.contentSha256}, ${programme.fetchedAt}
      )
      on conflict (source_id, catalogue_year_id, entity_kind, external_key, content_sha256)
      do update set fetched_at = excluded.fetched_at
      returning id
    `;

    await tx`
      insert into public.academic_structures (code, kind)
      values (${programme.code}, 'degree')
      on conflict (code) do nothing
    `;
    const [structure] = await tx`
      select id, kind from public.academic_structures where code = ${programme.code}
    `;
    if (structure.kind !== "degree") {
      throw new Error(
        `${programme.code} already exists with a different structure type.`,
      );
    }

    const [existing] = await tx`
      select id, publication_status, source_document_id
      from public.academic_structure_versions
      where structure_id = ${structure.id} and catalogue_year_id = ${year.id}
    `;
    if (existing?.publication_status === "published") {
      throw new Error(
        `${programme.code} is published and must be updated through review.`,
      );
    }

    let action = "created";
    let versionId = existing?.id;
    if (!versionId) {
      const [version] = await tx`
        insert into public.academic_structure_versions (
          structure_id, catalogue_year_id, name, units, duration_years, description,
          publication_status, review_state, source_document_id
        ) values (
          ${structure.id}, ${year.id}, ${programme.name}, ${programme.units}, null, ${programme.description},
          'draft', 'review', ${document.id}
        ) returning id
      `;
      versionId = version.id;
    } else {
      const changed =
        String(existing.source_document_id) !== String(document.id);
      await tx`
        update public.academic_structure_versions
        set name = ${programme.name}, units = ${programme.units}, description = ${programme.description},
            review_state = 'review', source_document_id = ${document.id}
        where id = ${versionId}
      `;
      action = changed ? "updated" : "unchanged";
      await tx`delete from public.requirement_groups where structure_version_id = ${versionId}`;
    }

    const [group] = await tx`
      insert into public.requirement_groups (
        structure_version_id, catalogue_year_id, parent_group_id, code, name,
        description, source_text, operator, minimum_count, minimum_units, position, source_document_id
      ) values (
        ${versionId}, ${year.id}, null, 'programme-requirements', 'Programme requirements',
        'Original ANU requirement text retained for review.', ${programme.requirementText}, 'all_of', null, null, 0, ${document.id}
      ) returning id
    `;
    await tx`
      insert into public.requirement_conditions (
        structure_version_id, requirement_group_id, code, condition_kind, source_text, position
      ) values (${versionId}, ${group.id}, 'source-requirements', 'other', ${programme.requirementText}, 0)
    `;

    const [run] = await tx`
      insert into public.catalogue_import_runs (
        source_id, catalogue_year_id, scope, trigger_kind, parser_version, status,
        checked_count, added_count, changed_count, unchanged_count, failed_count, completed_at
      ) values (
        ${source.id}, ${year.id}, ${`programme_codes:${programme.code}`}, 'manual',
        'anu-programs-courses-programme-v1', 'succeeded', 1,
        ${action === "created" ? 1 : 0}, ${action === "updated" ? 1 : 0}, ${action === "unchanged" ? 1 : 0}, 0, now()
      ) returning id
    `;
    await tx`
      insert into public.catalogue_import_items (
        run_id, source_document_id, source_id, catalogue_year_id, outcome, target_kind, target_key, diagnostics
      ) values (
        ${run.id}, ${document.id}, ${source.id}, ${year.id}, ${action}, 'structure', ${programme.code},
        ${tx.json({ requirementTextRetainedForReview: true })}
      )
    `;

    return { action, runId: run.id, sourceUrl: programme.canonicalUrl };
  });
}
