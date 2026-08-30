begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(8);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.course_import_runs'::regclass
      and tgname = 'course_import_runs_validate_lifecycle'
      and not tgisinternal
  )
  and exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.academic_structure_import_runs'::regclass
      and tgname = 'academic_structure_import_runs_validate_lifecycle'
      and not tgisinternal
  ),
  'course and academic structure runs use the forward-only lifecycle guard'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.academic_structure_import_targets'::regclass
      and tgname = 'academic_structure_import_targets_validate_lifecycle'
      and not tgisinternal
  ),
  'academic structure targets use the forward-only lifecycle guard'
);

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
  http_status
)
select
  sources.id,
  years.id,
  'structure',
  'programme',
  'LIFECYCLE-TEST',
  'https://programsandcourses.anu.edu.au/2026/program/lifecycle-test',
  'text/html',
  repeat('f', 64),
  1,
  200
from public.academic_structure_sources as sources
cross join public.academic_years as years
where sources.kind = 'anu_programs_and_courses'
  and years.year = 2026;

insert into public.academic_structure_directory_entries (
  academic_year_id,
  source_id,
  source_page_id,
  structure_kind,
  code,
  title,
  source_url
)
select
  pages.academic_year_id,
  pages.source_id,
  pages.id,
  'programme',
  'LIFECYCLE-TEST',
  'Lifecycle test programme',
  pages.canonical_url
from public.academic_structure_source_pages as pages
where pages.external_key = 'LIFECYCLE-TEST';

insert into public.academic_structure_import_runs (
  id,
  source_id,
  academic_year_id,
  structure_kind,
  requested_model,
  parser_version,
  prompt_version,
  schema_version,
  target_count,
  queued_count
)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  sources.id,
  years.id,
  'programme',
  'test/model',
  'test-parser.v1',
  'test-prompt.v1',
  'test-schema.v1',
  1,
  1
from public.academic_structure_sources as sources
cross join public.academic_years as years
where sources.kind = 'anu_programs_and_courses'
  and years.year = 2026;

insert into public.academic_structure_import_targets (
  id,
  run_id,
  academic_year_id,
  directory_entry_id,
  position,
  structure_kind,
  structure_code,
  requested_model
)
select
  '22222222-2222-4222-8222-222222222222'::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  entries.academic_year_id,
  entries.id,
  0,
  'programme',
  entries.code,
  'test/model'
from public.academic_structure_directory_entries as entries
where entries.code = 'LIFECYCLE-TEST';

select extensions.lives_ok(
  $$
    update public.academic_structure_import_targets
    set processing_status = 'failed',
        review_status = 'not_required',
        error_code = 'TEST_FAILURE',
        error_summary = 'Test failure',
        finished_at = statement_timestamp()
    where id = '22222222-2222-4222-8222-222222222222'::uuid
  $$,
  'an active academic structure target may finish as failed'
);

select extensions.lives_ok(
  $$
    select private.refresh_academic_structure_import_run(
      '11111111-1111-4111-8111-111111111111'::uuid
    )
  $$,
  'an active academic structure run may finish as failed'
);

select extensions.is(
  (
    select status
    from public.academic_structure_import_runs
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  'failed',
  'the fixture run reached its terminal state'
);

insert into public.academic_structure_import_runs (
  id,
  source_id,
  academic_year_id,
  structure_kind,
  requested_model,
  parser_version,
  prompt_version,
  schema_version,
  target_count,
  queued_count
)
select
  '33333333-3333-4333-8333-333333333333'::uuid,
  sources.id,
  years.id,
  'programme',
  'test/model',
  'test-parser.v1',
  'test-prompt.v1',
  'test-schema.v1',
  1,
  1
from public.academic_structure_sources as sources
cross join public.academic_years as years
where sources.kind = 'anu_programs_and_courses'
  and years.year = 2026;

insert into public.academic_structure_import_targets (
  id,
  run_id,
  academic_year_id,
  directory_entry_id,
  position,
  structure_kind,
  structure_code,
  requested_model
)
select
  '44444444-4444-4444-8444-444444444444'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  entries.academic_year_id,
  entries.id,
  0,
  'programme',
  entries.code,
  'test/model'
from public.academic_structure_directory_entries as entries
where entries.code = 'LIFECYCLE-TEST';

update public.academic_structure_import_targets
set processing_status = 'failed',
    review_status = 'not_required',
    error_code = 'LATER_TEST_FAILURE',
    error_summary = 'Later test failure',
    created_at = clock_timestamp() + interval '1 second',
    finished_at = statement_timestamp()
where id = '44444444-4444-4444-8444-444444444444'::uuid;

select extensions.is(
  (
    select id
    from public.academic_structure_directory_latest_import_targets
    where directory_entry_id = (
      select id
      from public.academic_structure_directory_entries
      where code = 'LIFECYCLE-TEST'
    )
  ),
  '44444444-4444-4444-8444-444444444444'::uuid,
  'the directory latest-target view selects the later failed target'
);

select extensions.throws_ok(
  $$
    update public.academic_structure_import_targets
    set processing_status = 'queued'
    where id = '22222222-2222-4222-8222-222222222222'::uuid
  $$,
  '55000',
  'invalid academic structure import target status transition: failed to queued',
  'a failed target cannot be reopened in the same run'
);

select extensions.throws_ok(
  $$
    update public.academic_structure_import_runs
    set status = 'queued'
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  $$,
  '55000',
  'invalid academic_structure_import_runs status transition: failed to queued',
  'a failed run cannot be reopened'
);

select * from extensions.finish();

rollback;
