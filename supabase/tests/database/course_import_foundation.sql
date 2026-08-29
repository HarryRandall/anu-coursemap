begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(28);

select extensions.is(
  (
    select count(*)
    from public.academic_years
    where year between 2020 and 2030
      and is_import_enabled
  ),
  11::bigint,
  'every year from 2020 through 2030 is selectable for course imports'
);

select extensions.ok(
  not exists (
    select 1
    from public.academic_years
    where year between 2020 and 2030
      and source_availability <> 'unknown'
  ),
  'selectable years do not claim ANU source availability before a refresh'
);

select extensions.is(
  (
    select count(*)
    from public.course_versions as versions
    join public.catalogue_years as catalogue_years
      on catalogue_years.id = versions.catalogue_year_id
    join public.academic_years as academic_years
      on academic_years.year = catalogue_years.year
    join public.course_years as course_years
      on course_years.course_id = versions.course_id
     and course_years.academic_year_id = academic_years.id
  ),
  (select count(*) from public.course_versions),
  'every legacy course version has a course-year identity'
);

select extensions.is(
  (
    select count(*)
    from public.course_versions as versions
    join public.catalogue_years as catalogue_years
      on catalogue_years.id = versions.catalogue_year_id
    join public.academic_years as academic_years
      on academic_years.year = catalogue_years.year
    join public.course_years as course_years
      on course_years.course_id = versions.course_id
     and course_years.academic_year_id = academic_years.id
    join public.course_snapshots as snapshots
      on snapshots.course_year_id = course_years.id
     and snapshots.snapshot_number = 1
     and snapshots.origin = 'legacy_backfill'
  ),
  (select count(*) from public.course_versions),
  'every legacy course version has an immutable compatibility snapshot'
);

select extensions.ok(
  not exists (
    select 1
    from public.course_years
    where lifecycle_status = 'active'
      and draft_snapshot_id is null
      and published_snapshot_id is null
  ),
  'every active backfilled course year has a draft or published snapshot'
);

select extensions.is(
  (
    select count(*)
    from public.catalogue_directory_courses as legacy_entries
    join public.catalogue_years as catalogue_years
      on catalogue_years.id = legacy_entries.catalogue_year_id
    join public.academic_years as academic_years
      on academic_years.year = catalogue_years.year
    join public.course_directory_entries as directory_entries
      on directory_entries.academic_year_id = academic_years.id
     and directory_entries.code = legacy_entries.code
  ),
  (select count(*) from public.catalogue_directory_courses),
  'every legacy directory row has a course-directory entry'
);

create temporary table course_foundation_state_before on commit drop as
select md5(
  jsonb_build_object(
    'academic_years', (
      select jsonb_agg(
        jsonb_build_array(
          id,
          directory_refreshed_at,
          updated_at
        )
        order by id
      )
      from public.academic_years
    ),
    'course_years', (
      select jsonb_agg(
        jsonb_build_array(
          id,
          draft_snapshot_id,
          published_snapshot_id,
          updated_at
        )
        order by id
      )
      from public.course_years
    ),
    'snapshot_count', (select count(*) from public.course_snapshots),
    'directory_count', (select count(*) from public.course_directory_entries),
    'fee_count', (select count(*) from public.course_fees)
  )::text
) as state_hash;

select extensions.lives_ok(
  $$select private.backfill_course_snapshot_foundation()$$,
  'the compatibility backfill is safe to run more than once'
);

select extensions.is(
  md5(
    jsonb_build_object(
      'academic_years', (
        select jsonb_agg(
          jsonb_build_array(
            id,
            directory_refreshed_at,
            updated_at
          )
          order by id
        )
        from public.academic_years
      ),
      'course_years', (
        select jsonb_agg(
          jsonb_build_array(
            id,
            draft_snapshot_id,
            published_snapshot_id,
            updated_at
          )
          order by id
        )
        from public.course_years
      ),
      'snapshot_count', (select count(*) from public.course_snapshots),
      'directory_count', (select count(*) from public.course_directory_entries),
      'fee_count', (select count(*) from public.course_fees)
    )::text
  ),
  (select state_hash from course_foundation_state_before),
  'a repeated compatibility backfill is a true no-op'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'private.backfill_course_snapshot_foundation()',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'private.backfill_course_snapshot_foundation()',
    'execute'
  ),
  'API roles cannot invoke the private compatibility backfill'
);

with protected_tables (name) as (
  select unnest(array[
    'academic_years',
    'course_sources',
    'course_source_documents',
    'course_directory_entries',
    'course_years',
    'course_snapshots',
    'course_fees',
    'course_areas_of_interest',
    'course_related_courses',
    'course_assessment_outcomes',
    'course_snapshot_field_evidence'
  ]::text[])
)
select extensions.ok(
  bool_and(coalesce(classes.relrowsecurity, false)),
  'row level security protects every course-import foundation table'
)
from protected_tables
left join pg_class as classes
  on classes.oid = format('public.%I', protected_tables.name)::regclass;

select extensions.ok(
  not has_table_privilege(
    'anon',
    'public.course_source_documents',
    'select'
  )
  and not has_table_privilege(
    'anon',
    'public.course_directory_entries',
    'select'
  )
  and not has_table_privilege(
    'anon',
    'public.course_snapshot_field_evidence',
    'select'
  ),
  'anonymous users cannot read import provenance, directory or evidence rows'
);

select extensions.ok(
  has_table_privilege(
    'authenticated',
    'public.course_source_documents',
    'select'
  )
  and has_table_privilege(
    'authenticated',
    'public.course_source_documents',
    'insert'
  )
  and not has_table_privilege(
    'authenticated',
    'public.course_source_documents',
    'update'
  )
  and not has_table_privilege(
    'authenticated',
    'public.course_source_documents',
    'delete'
  ),
  'source documents are append-only for authenticated API users'
);

insert into public.catalogue_source_documents (
  source_id,
  catalogue_year_id,
  entity_kind,
  external_key,
  canonical_url,
  content_sha256,
  storage_path
)
select
  sources.id,
  catalogue_years.id,
  fixtures.entity_kind,
  fixtures.external_key,
  fixtures.canonical_url,
  fixtures.content_sha256,
  fixtures.storage_path
from public.catalogue_sources as sources
cross join public.catalogue_years
cross join (
  values
    (
      'course',
      'EDGE1000',
      'https://course-foundation.example.test/EDGE1000',
      repeat('e', 64),
      'legacy/EDGE1000.html'
    ),
    (
      'course_directory',
      'directory:2027',
      'https://course-foundation.example.test/directory/2027',
      repeat('f', 64),
      'legacy/directory-2027.json'
    )
) as fixtures(
  entity_kind,
  external_key,
  canonical_url,
  content_sha256,
  storage_path
)
where sources.kind = 'local_mock'
  and catalogue_years.year = 2027;

insert into public.courses (code)
values ('EDGE1000');

insert into public.course_versions (
  course_id,
  catalogue_year_id,
  title,
  units,
  level,
  subject,
  school,
  description,
  publication_status,
  source_document_id
)
select
  courses.id,
  catalogue_years.id,
  'Published course in a draft year',
  6,
  1000,
  'EDGE',
  'Foundation test school',
  'A compatibility status fixture.',
  'published',
  source_documents.id
from public.courses
cross join public.catalogue_years
join public.catalogue_source_documents as source_documents
  on source_documents.catalogue_year_id = catalogue_years.id
 and source_documents.external_key = courses.code
where courses.code = 'EDGE1000'
  and catalogue_years.year = 2027;

select extensions.lives_ok(
  $$select private.backfill_course_snapshot_foundation()$$,
  'the compatibility backfill accepts legacy source paths safely'
);

select extensions.ok(
  exists (
    select 1
    from public.course_years
    join public.courses on courses.id = course_years.course_id
    join public.course_snapshots as snapshots
      on snapshots.id = course_years.draft_snapshot_id
    where courses.code = 'EDGE1000'
      and course_years.published_snapshot_id is null
      and snapshots.sealed_at is not null
  ),
  'a published legacy version in a draft year becomes a sealed draft snapshot'
);

select extensions.ok(
  (
    select bool_and(
      storage_bucket is null
      and storage_path is null
      and media_type = case document_kind
        when 'course_directory' then 'application/json'
        else 'text/html'
      end
    )
    from public.course_source_documents
    where external_key in ('EDGE1000', 'directory:2027')
  ),
  'legacy source metadata does not invent storage and keeps the correct media type'
);

insert into public.academic_years (year, is_import_enabled)
values (2190, false);

insert into public.course_sources (name, kind, base_url)
values (
  'Course import foundation test source',
  'course_import_foundation_test',
  'https://course-foundation.example.test'
);

insert into public.course_source_documents (
  source_id,
  academic_year_id,
  document_kind,
  external_key,
  canonical_url,
  media_type,
  content_sha256
)
select
  sources.id,
  academic_years.id,
  'course_page',
  fixtures.code,
  'https://course-foundation.example.test/' || fixtures.code,
  'text/html',
  fixtures.content_sha256
from public.course_sources as sources
cross join public.academic_years
cross join (
  values
    ('FOUN1000', repeat('a', 64)),
    ('FOUN1001', repeat('b', 64))
) as fixtures(code, content_sha256)
where sources.kind = 'course_import_foundation_test'
  and academic_years.year = 2190;

insert into public.courses (code)
values ('FOUN1000'), ('FOUN1001');

insert into public.course_years (course_id, academic_year_id)
select courses.id, academic_years.id
from public.courses
cross join public.academic_years
where courses.code in ('FOUN1000', 'FOUN1001')
  and academic_years.year = 2190;

insert into public.course_snapshots (
  course_year_id,
  academic_year_id,
  snapshot_number,
  origin,
  source_document_id,
  projection_sha256,
  validation_status,
  title,
  units
)
select
  course_years.id,
  course_years.academic_year_id,
  1,
  'manual_edit',
  source_documents.id,
  case courses.code
    when 'FOUN1000' then repeat('c', 64)
    else repeat('d', 64)
  end,
  'valid',
  case courses.code
    when 'FOUN1000' then 'Foundation draft fixture'
    else 'Foundation published fixture'
  end,
  6
from public.course_years
join public.courses on courses.id = course_years.course_id
join public.academic_years
  on academic_years.id = course_years.academic_year_id
join public.course_source_documents as source_documents
  on source_documents.academic_year_id = academic_years.id
 and source_documents.external_key = courses.code
where courses.code in ('FOUN1000', 'FOUN1001')
  and academic_years.year = 2190;

insert into public.course_fees (
  course_snapshot_id,
  position,
  fee_year,
  audience,
  fee_type,
  amount,
  currency,
  basis,
  source_label
)
select
  snapshots.id,
  1,
  2190,
  'international',
  'tuition',
  1200,
  'AUD',
  'course',
  'Foundation fixture fee'
from public.course_snapshots as snapshots
where snapshots.title in (
  'Foundation draft fixture',
  'Foundation published fixture'
);

select extensions.throws_ok(
  $$
    insert into public.course_fees (
      course_snapshot_id,
      position,
      audience,
      fee_type,
      amount,
      basis
    )
    select id, 2, 'domestic', 'indicative', -1, 'course'
    from public.course_snapshots
    where title = 'Foundation draft fixture'
  $$,
  '23514',
  null,
  'negative course fees are rejected'
);

select extensions.throws_ok(
  $$
    insert into public.course_snapshots (
      course_year_id,
      academic_year_id,
      snapshot_number,
      origin,
      validation_status,
      title,
      units
    )
    select
      course_year_id,
      academic_year_id,
      2,
      'manual_edit',
      'valid',
      'Missing projection hash',
      6
    from public.course_snapshots
    where title = 'Foundation draft fixture'
  $$,
  '23514',
  null,
  'new imported or manually edited snapshots require a projection hash'
);

select extensions.lives_ok(
  $$
    insert into public.course_snapshots (
      course_year_id,
      academic_year_id,
      snapshot_number,
      origin,
      projection_sha256,
      validation_status,
      title,
      units
    )
    select
      course_year_id,
      academic_year_id,
      2,
      'manual_edit',
      projection_sha256,
      'valid',
      'Duplicate projection fixture',
      6
    from public.course_snapshots
    where title = 'Foundation draft fixture'
  $$,
  'matching projections may be retained as distinct immutable snapshot events'
);

update public.course_years
set draft_snapshot_id = snapshots.id
from public.course_snapshots as snapshots
join public.courses on courses.code = 'FOUN1000'
where course_years.id = snapshots.course_year_id
  and course_years.course_id = courses.id;

update public.course_years
set published_snapshot_id = snapshots.id
from public.course_snapshots as snapshots
join public.courses on courses.code = 'FOUN1001'
where course_years.id = snapshots.course_year_id
  and course_years.course_id = courses.id;

select extensions.throws_ok(
  $$
    update public.course_snapshots
    set title = 'Mutated title'
    where title = 'Foundation draft fixture'
  $$,
  '55000',
  null,
  'saved course snapshots cannot be changed in place'
);

select extensions.throws_ok(
  $$
    update public.course_years
    set draft_snapshot_id = (
      select id
      from public.course_snapshots
      where title = 'Foundation published fixture'
    )
    where course_id = (
      select id from public.courses where code = 'FOUN1000'
    )
      and academic_year_id = (
        select id from public.academic_years where year = 2190
      )
  $$,
  '23503',
  null,
  'a course year cannot point at another course year snapshot'
);

select extensions.throws_ok(
  $$
    update public.course_years
    set published_snapshot_id = draft_snapshot_id
    where course_id = (
      select id from public.courses where code = 'FOUN1000'
    )
      and academic_year_id = (
        select id from public.academic_years where year = 2190
      )
  $$,
  '23514',
  null,
  'draft and published pointers cannot reference the same snapshot'
);

select extensions.throws_ok(
  $$
    insert into public.course_fees (
      course_snapshot_id,
      position,
      audience,
      fee_type,
      amount,
      currency,
      basis
    )
    select id, 2, 'domestic', 'indicative', 100, 'AUD', 'course'
    from public.course_snapshots
    where title = 'Foundation draft fixture'
  $$,
  '55000',
  null,
  'a sealed snapshot cannot gain new canonical child rows'
);

select extensions.throws_ok(
  $$
    update public.course_source_documents
    set canonical_url = 'https://course-foundation.example.test/changed'
    where external_key = 'FOUN1000'
  $$,
  '55000',
  null,
  'captured source documents cannot be changed in place'
);

insert into public.course_snapshots (
  course_year_id,
  academic_year_id,
  snapshot_number,
  origin,
  based_on_snapshot_id,
  source_document_id,
  projection_sha256,
  validation_status,
  title,
  units
)
select
  course_year_id,
  academic_year_id,
  2,
  'manual_edit',
  id,
  source_document_id,
  repeat('9', 64),
  'valid',
  'Foundation replacement fixture',
  units
from public.course_snapshots
where title = 'Foundation published fixture';

insert into public.course_fees (
  course_snapshot_id,
  position,
  fee_year,
  audience,
  fee_type,
  amount,
  currency,
  basis,
  source_label
)
select
  id,
  1,
  2190,
  'international',
  'tuition',
  1250,
  'AUD',
  'course',
  'Foundation fixture fee'
from public.course_snapshots
where title = 'Foundation replacement fixture';

update public.course_years
set published_snapshot_id = snapshots.id
from public.course_snapshots as snapshots
where course_years.id = snapshots.course_year_id
  and snapshots.title = 'Foundation replacement fixture';

select extensions.throws_ok(
  $$
    insert into public.course_fees (
      course_snapshot_id,
      position,
      audience,
      fee_type,
      amount,
      currency,
      basis
    )
    select id, 2, 'domestic', 'indicative', 100, 'AUD', 'course'
    from public.course_snapshots
    where title = 'Foundation published fixture'
  $$,
  '55000',
  null,
  'a snapshot remains permanently sealed after its pointer moves away'
);

set local role anon;

select extensions.is(
  (
    select count(*)
    from public.course_snapshots
    where title like 'Foundation % fixture'
  ),
  1::bigint,
  'anonymous users see only the published fixture snapshot'
);

select extensions.is(
  (
    select count(*)
    from public.course_years
    where academic_year_id = (
      select id from public.academic_years where year = 2190
    )
  ),
  1::bigint,
  'anonymous users see only the course year with a published snapshot'
);

select extensions.is(
  (
    select count(*)
    from public.course_fees
    where source_label = 'Foundation fixture fee'
  ),
  1::bigint,
  'anonymous users see fees only for the published snapshot'
);

reset role;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '90000000-0000-4000-8000-000000000090',
  'authenticated',
  'authenticated',
  'course-foundation-student@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000090","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-4000-8000-000000000090',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$
    insert into public.course_sources (name, kind, base_url)
    values (
      'Unauthorised source',
      'unauthorised_source',
      'https://unauthorised-source.example.test'
    )
  $$,
  '42501',
  null,
  'a signed-in student cannot create course import sources'
);

reset role;

select extensions.finish();

rollback;
