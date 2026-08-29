begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(4);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.publish_catalogue_structure_version(text,smallint)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.publish_catalogue_structure_version(text,smallint)',
    'execute'
  )
  and to_regprocedure(
    'public.publish_catalogue_course_version(text,smallint)'
  ) is null,
  'programme publication remains while legacy course publication is removed'
);

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '80000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'publisher@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now()
);

insert into public.catalogue_sources (name, kind, base_url)
values (
  'Programme publication test source',
  'programme_publication_test',
  'https://programme-publication.example.test'
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
  'PBLS-TEST',
  'https://programme-publication.example.test/PBLS-TEST',
  repeat('2', 64)
from public.catalogue_sources as sources
join public.catalogue_years as years on years.year = 2026
where sources.kind = 'programme_publication_test';

insert into public.academic_structures (code, kind)
values ('PBLS-TEST', 'degree');

insert into public.academic_structure_versions (
  structure_id,
  catalogue_year_id,
  name,
  units,
  description,
  publication_status,
  source_document_id
)
select
  structures.id,
  years.id,
  'Publication test degree',
  24,
  'A rolled-back programme publication fixture.',
  'draft',
  documents.id
from public.academic_structures as structures
join public.catalogue_years as years on years.year = 2026
join public.catalogue_source_documents as documents
  on documents.catalogue_year_id = years.id
 and documents.external_key = 'PBLS-TEST'
where structures.code = 'PBLS-TEST';

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
where structures.code = 'PBLS-TEST';

select set_config(
  'request.jwt.claim.sub',
  '80000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$select public.publish_catalogue_structure_version('PBLS-TEST', 2026::smallint)$$,
  '42501',
  'Catalogue publishing permission is required.',
  'a standard user cannot publish a programme'
);

reset role;

update private.user_roles
set role_id = (select id from private.app_roles where key = 'admin')
where user_id = '80000000-0000-4000-8000-000000000001';

set local role authenticated;

select extensions.lives_ok(
  $$select public.publish_catalogue_structure_version('PBLS-TEST', 2026::smallint)$$,
  'an administrator can still publish an imported programme'
);

reset role;

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'PBLS-TEST'
      and versions.publication_status = 'published'
  ),
  'published programmes remain available through the shared schema'
);

select * from extensions.finish();

rollback;
