begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

select extensions.is(
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'catalogue_directory_programmes',
        'academic_structures',
        'academic_structure_versions',
        'academic_structure_relationships',
        'requirement_groups',
        'requirement_conditions'
      )
  ),
  6::bigint,
  'the shared programme import and requirement tables remain available'
);

select extensions.is(
  (
    select count(*)
    from public.academic_structures
    where code in ('BCOMP', 'SOFT-MAJ')
  ),
  0::bigint,
  'the clean cutover retains no legacy programme seed rows'
);

insert into public.catalogue_sources (name, kind, base_url)
values (
  'Programme capability test source',
  'programme_capability_test',
  'https://programme-capability.example.test'
);

insert into public.catalogue_source_documents (
  source_id,
  catalogue_year_id,
  entity_kind,
  external_key,
  canonical_url,
  content_sha256
)
select
  sources.id,
  years.id,
  'structure',
  'CAPABILITY-PROGRAMME',
  'https://programme-capability.example.test/CAPABILITY-PROGRAMME',
  repeat('7', 64)
from public.catalogue_sources as sources
join public.catalogue_years as years on years.year = 2026
where sources.kind = 'programme_capability_test';

insert into public.catalogue_import_runs (
  source_id,
  catalogue_year_id,
  scope,
  trigger_kind,
  parser_version
)
select
  sources.id,
  years.id,
  'structure_codes:CAPABILITY-PROGRAMME',
  'cli',
  'programme-capability.v1'
from public.catalogue_sources as sources
join public.catalogue_years as years on years.year = 2026
where sources.kind = 'programme_capability_test';

insert into public.catalogue_import_items (
  run_id,
  source_document_id,
  source_id,
  catalogue_year_id,
  outcome,
  target_kind,
  target_key
)
select
  runs.id,
  documents.id,
  runs.source_id,
  runs.catalogue_year_id,
  'created',
  'structure',
  'CAPABILITY-PROGRAMME'
from public.catalogue_import_runs as runs
join public.catalogue_source_documents as documents
  on documents.source_id = runs.source_id
 and documents.catalogue_year_id = runs.catalogue_year_id
where runs.scope = 'structure_codes:CAPABILITY-PROGRAMME';

select extensions.ok(
  exists (
    select 1
    from public.catalogue_import_items as items
    join public.catalogue_import_runs as runs on runs.id = items.run_id
    where runs.scope = 'structure_codes:CAPABILITY-PROGRAMME'
      and items.outcome = 'created'
  ),
  'programme import provenance can still be recorded'
);

insert into public.academic_structures (code, kind)
values ('CAPABILITY-PROGRAMME', 'degree');

insert into public.academic_structure_versions (
  structure_id,
  catalogue_year_id,
  name,
  units,
  duration_years,
  description,
  source_document_id
)
select
  structures.id,
  years.id,
  'Capability programme',
  144,
  3,
  'A rolled-back programme import capability fixture.',
  documents.id
from public.academic_structures as structures
join public.catalogue_years as years on years.year = 2026
join public.catalogue_source_documents as documents
  on documents.catalogue_year_id = years.id
 and documents.external_key = 'CAPABILITY-PROGRAMME'
where structures.code = 'CAPABILITY-PROGRAMME';

insert into public.requirement_groups (
  structure_version_id,
  catalogue_year_id,
  code,
  name,
  source_text,
  operator,
  position,
  source_document_id
)
select
  versions.id,
  versions.catalogue_year_id,
  'ROOT',
  'Root',
  'Complete the programme requirements.',
  'all_of',
  0,
  versions.source_document_id
from public.academic_structure_versions as versions
join public.academic_structures as structures
  on structures.id = versions.structure_id
where structures.code = 'CAPABILITY-PROGRAMME';

insert into public.courses (code)
values ('PGMI1000'), ('PGMX1000');

insert into public.course_years (course_id, academic_year_id)
select courses.id, years.id
from public.courses
join public.academic_years as years on years.year = 2026
where courses.code = 'PGMI1000';

select extensions.lives_ok(
  $$
    insert into public.requirement_conditions (
      structure_version_id,
      requirement_group_id,
      code,
      condition_kind,
      course_id,
      source_text,
      position
    )
    select
      groups.structure_version_id,
      groups.id,
      'IMPORTED-COURSE',
      'course',
      courses.id,
      'Complete PGMI1000.',
      0
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    join public.courses on courses.code = 'PGMI1000'
    where structures.code = 'CAPABILITY-PROGRAMME'
      and groups.code = 'ROOT'
  $$,
  'programme requirements can reference an explicitly imported course'
);

select extensions.throws_ok(
  $$
    insert into public.requirement_conditions (
      structure_version_id,
      requirement_group_id,
      code,
      condition_kind,
      course_id,
      source_text,
      position
    )
    select
      groups.structure_version_id,
      groups.id,
      'PLACEHOLDER-COURSE',
      'course',
      courses.id,
      'Complete PGMX1000.',
      1
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    join public.courses on courses.code = 'PGMX1000'
    where structures.code = 'CAPABILITY-PROGRAMME'
      and groups.code = 'ROOT'
  $$,
  '23503',
  'programme requirements may reference only an explicitly imported course',
  'programme import cannot recursively create a course from a placeholder'
);

select extensions.ok(
  exists (
    select 1
    from public.requirement_groups as groups
    join public.requirement_conditions as conditions
      on conditions.requirement_group_id = groups.id
    join public.courses on courses.id = conditions.course_id
    where groups.code = 'ROOT'
      and courses.code = 'PGMI1000'
  ),
  'a complete programme requirement tree remains representable'
);

select * from extensions.finish();

rollback;
