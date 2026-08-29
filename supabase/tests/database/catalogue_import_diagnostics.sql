begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(14);

-- Provenance scaffolding: a year, a source, a document, a run and an item.
insert into public.catalogue_years (year, status) values (2198, 'draft');

insert into public.catalogue_sources (name, kind, base_url, is_active)
values (
  'Import diagnostics test source',
  'anu_import_diagnostics_test',
  'https://diagnostics.example.test',
  true
);

insert into public.catalogue_source_documents (
  source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
  content_sha256
)
select
  sources.id, years.id, 'structure', 'DIAG-PROGRAMME',
  'https://diagnostics.example.test/DIAG-PROGRAMME',
  md5('diagnostics-fixture') || md5('diagnostics-fixture-2')
from public.catalogue_sources as sources
cross join public.catalogue_years as years
where sources.kind = 'anu_import_diagnostics_test' and years.year = 2198;

insert into public.catalogue_import_runs (
  source_id, catalogue_year_id, scope, trigger_kind, parser_version, status,
  started_at, completed_at
)
select sources.id, years.id, 'programme_codes:DIAG-PROGRAMME', 'cli', 'test@1',
       'succeeded', now(), now()
from public.catalogue_sources as sources
cross join public.catalogue_years as years
where sources.kind = 'anu_import_diagnostics_test' and years.year = 2198;

insert into public.catalogue_import_items (
  run_id, source_document_id, source_id, catalogue_year_id, outcome,
  target_kind, target_key
)
select runs.id, documents.id, runs.source_id, runs.catalogue_year_id,
       'review', 'structure', 'DIAG-PROGRAMME'
from public.catalogue_import_runs as runs
join public.catalogue_source_documents as documents
  on documents.source_id = runs.source_id
 and documents.catalogue_year_id = runs.catalogue_year_id
where runs.scope = 'programme_codes:DIAG-PROGRAMME';

-- A second valid document gives the invalid-item assertion a unique
-- run/document pair, so only the target vocabulary can reject the row.
insert into public.catalogue_source_documents (
  source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
  content_sha256
)
select
  sources.id, years.id, 'structure', 'DIAG-PROGRAMME-INVALID-TARGET',
  'https://diagnostics.example.test/DIAG-PROGRAMME-INVALID-TARGET',
  md5('diagnostics-invalid-target-a') || md5('diagnostics-invalid-target-b')
from public.catalogue_sources as sources
cross join public.catalogue_years as years
where sources.kind = 'anu_import_diagnostics_test' and years.year = 2198;

select extensions.throws_ok(
  $$
    insert into public.catalogue_source_documents (
      source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
      content_sha256
    )
    select sources.id, years.id, 'course', 'DIAG-COURSE',
           'https://diagnostics.example.test/DIAG-COURSE',
           md5('diagnostics-course-a') || md5('diagnostics-course-b')
    from public.catalogue_sources as sources
    cross join public.catalogue_years as years
    where sources.kind = 'anu_import_diagnostics_test' and years.year = 2198
  $$,
  '23514',
  null,
  'the generic source pipeline rejects course documents'
);

select extensions.throws_ok(
  $$
    insert into public.catalogue_import_items (
      run_id, source_document_id, source_id, catalogue_year_id, outcome,
      target_kind, target_key
    )
    select runs.id, documents.id, runs.source_id, runs.catalogue_year_id,
           'review', 'course_version', 'DIAG-COURSE'
    from public.catalogue_import_runs as runs
    join public.catalogue_source_documents as documents
      on documents.source_id = runs.source_id
     and documents.catalogue_year_id = runs.catalogue_year_id
     and documents.external_key = 'DIAG-PROGRAMME-INVALID-TARGET'
    where runs.scope = 'programme_codes:DIAG-PROGRAMME'
  $$,
  '23514',
  null,
  'the generic import queue rejects course targets'
);

select extensions.throws_ok(
  $$
    insert into public.catalogue_review_items (
      import_item_id, catalogue_year_id, target_kind, target_key,
      issue_code, field, summary, old_value, new_value
    )
    select items.id, items.catalogue_year_id, 'course_version', 'DIAG-COURSE',
           'STRUCTURED_RULE_PRESERVED', 'programme.requirements',
           'invalid course review target',
           to_jsonb('COMP1100'::text), to_jsonb('COMP1130'::text)
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  '23514',
  null,
  'the generic review queue rejects course targets'
);

select extensions.is(
  public.catalogue_change_issue_codes(),
  array[
    'STRUCTURED_RULE_SOURCE_REMOVAL_PRESERVED',
    'STRUCTURED_RULE_PRESERVED'
  ]::text[],
  'the generic change queue retains only programme structure issue codes'
);

-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$
    insert into public.catalogue_import_diagnostics (
      import_item_id, issue_code, severity, summary, field, details
    )
    select items.id, 'PROGRAMME_REQUIREMENTS_NOT_OBSERVED', 'warning',
           'The official programme requirement section could not be observed.',
           'programme.requirements',
           jsonb_build_object('sourceFragment', 'fragment-a')
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  'a parser diagnostic can be recorded against an import item'
);

-- The dedupe key is per import item, so one run cannot record the same
-- observation twice.
insert into public.catalogue_import_diagnostics (
  import_item_id, issue_code, severity, summary, field, details
)
select items.id, 'PROGRAMME_REQUIREMENTS_NOT_OBSERVED', 'warning',
       'The official programme requirement section could not be observed.',
       'programme.requirements',
       jsonb_build_object('sourceFragment', 'fragment-a')
from public.catalogue_import_items as items
where items.target_key = 'DIAG-PROGRAMME'
on conflict on constraint catalogue_import_diagnostics_item_issue_unique
  do nothing;

select extensions.is(
  (
    select count(*)
    from public.catalogue_import_diagnostics as diagnostics
    join public.catalogue_import_items as items
      on items.id = diagnostics.import_item_id
    where items.target_key = 'DIAG-PROGRAMME'
  ),
  1::bigint,
  'an identical diagnostic on the same import item is absorbed'
);

-- A different source fragment is a different observation, not a duplicate.
select extensions.lives_ok(
  $$
    insert into public.catalogue_import_diagnostics (
      import_item_id, issue_code, severity, summary, field, details
    )
    select items.id, 'PROGRAMME_REQUIREMENTS_NOT_OBSERVED', 'warning',
           'The official programme requirement section could not be observed.',
           'programme.requirements',
           jsonb_build_object('sourceFragment', 'fragment-b')
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  'a distinct source fragment records a separate diagnostic'
);

select extensions.throws_ok(
  $$
    insert into public.catalogue_import_diagnostics (
      import_item_id, issue_code, severity, summary
    )
    select items.id, 'BAD_SEVERITY', 'critical', 'unsupported severity'
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  '23514',
  null,
  'severity is constrained to warning or error'
);

select extensions.throws_ok(
  $$
    insert into public.catalogue_import_diagnostics (
      import_item_id, issue_code, summary
    )
    select items.id, '   ', 'blank issue code'
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  '23514',
  null,
  'a blank issue code is rejected'
);

-- ---------------------------------------------------------------------------
-- catalogue_review_items is now a change queue and must carry a real change.
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$
    insert into public.catalogue_review_items (
      import_item_id, catalogue_year_id, target_kind, target_key,
      issue_code, field, summary
    )
    select items.id, items.catalogue_year_id, items.target_kind,
           items.target_key, 'STRUCTURED_RULE_PRESERVED',
           'programme.requirements.incompatibility', 'no values supplied'
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  '23514',
  null,
  'a review item with neither an old nor a new value is rejected'
);

select extensions.throws_ok(
  $$
    insert into public.catalogue_review_items (
      import_item_id, catalogue_year_id, target_kind, target_key,
      issue_code, field, summary, old_value, new_value
    )
    select items.id, items.catalogue_year_id, items.target_kind,
           items.target_key, 'STRUCTURED_RULE_PRESERVED',
           'programme.requirements.incompatibility', 'identical values',
           to_jsonb('COMP1100'::text), to_jsonb('COMP1100'::text)
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  '23514',
  null,
  'a review item whose old and new values match is rejected'
);

select extensions.lives_ok(
  $$
    insert into public.catalogue_review_items (
      import_item_id, catalogue_year_id, target_kind, target_key,
      issue_code, field, summary, old_value, new_value
    )
    select items.id, items.catalogue_year_id, items.target_kind,
           items.target_key, 'STRUCTURED_RULE_PRESERVED',
           'programme.requirements.incompatibility',
           'The stored incompatibility rule was preserved.',
           to_jsonb('COMP1100'::text), to_jsonb('COMP1130'::text)
    from public.catalogue_import_items as items
    where items.target_key = 'DIAG-PROGRAMME'
  $$,
  'a review item carrying a real before and after is accepted'
);

-- Rerunning the same import must refresh the flag in place rather than
-- stacking a second open row, which is the duplication this key exists to stop.
insert into public.catalogue_review_items (
  import_item_id, catalogue_year_id, target_kind, target_key,
  issue_code, field, summary, old_value, new_value
)
select items.id, items.catalogue_year_id, items.target_kind,
       items.target_key, 'STRUCTURED_RULE_PRESERVED',
       'programme.requirements.incompatibility',
       'The stored incompatibility rule was preserved.',
       to_jsonb('COMP1100'::text), to_jsonb('COMP1140'::text)
from public.catalogue_import_items as items
where items.target_key = 'DIAG-PROGRAMME'
on conflict (catalogue_year_id, target_kind, target_key, issue_code, field)
do update set new_value = excluded.new_value;

select extensions.is(
  (
    select count(*) from public.catalogue_review_items
    where target_key = 'DIAG-PROGRAMME'
  ),
  1::bigint,
  'a rerun updates the existing flag instead of adding a duplicate'
);

select extensions.is(
  (
    select new_value from public.catalogue_review_items
    where target_key = 'DIAG-PROGRAMME'
  ),
  to_jsonb('COMP1140'::text),
  'the rerun refreshed the new value in place'
);

select * from extensions.finish();

rollback;
