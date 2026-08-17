begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.publish_catalogue_course_version(text,smallint)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.publish_catalogue_structure_version(text,smallint)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.publish_catalogue_course_version(text,smallint)',
    'execute'
  ),
  'catalogue publication actions are available only to authenticated users'
);

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '80000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'publisher@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now()
);

insert into public.catalogue_sources (name, kind, base_url)
values ('Publication action test source', 'test', 'https://publication.example.test');

insert into public.catalogue_source_documents (
  source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
  content_sha256
)
select
  sources.id, years.id, entity_kind, external_key,
  'https://publication.example.test/' || external_key, content_sha256
from public.catalogue_sources as sources
cross join public.catalogue_years as years
cross join (
  values
    ('course'::text, 'PBLS1000'::text, repeat('1', 64)),
    ('structure'::text, 'PBLS-TEST'::text, repeat('2', 64))
) as documents(entity_kind, external_key, content_sha256)
where sources.base_url = 'https://publication.example.test'
  and years.year = 2026;

insert into public.courses (code) values ('PBLS1000');

insert into public.course_versions (
  course_id, catalogue_year_id, title, units, level, subject, school,
  description, publication_status, source_document_id
)
select
  courses.id, years.id, 'Publication test course', 6, 1000, 'PBLS',
  'Test school', 'A rolled-back catalogue publication fixture.', 'draft',
  documents.id
from public.courses as courses
cross join public.catalogue_years as years
join public.catalogue_source_documents as documents
  on documents.catalogue_year_id = years.id
  and documents.external_key = 'PBLS1000'
where courses.code = 'PBLS1000'
  and years.year = 2026;

insert into public.course_offerings (
  course_version_id, catalogue_year_id, source_document_id, status
)
select versions.id, years.id, documents.id, 'draft'
from public.course_versions as versions
join public.courses as courses on courses.id = versions.course_id
join public.catalogue_years as years on years.id = versions.catalogue_year_id
join public.catalogue_source_documents as documents
  on documents.catalogue_year_id = years.id
  and documents.external_key = 'PBLS1000'
where courses.code = 'PBLS1000';

insert into public.academic_structures (code, kind)
values ('PBLS-TEST', 'degree');

insert into public.academic_structure_versions (
  structure_id, catalogue_year_id, name, units, description,
  publication_status, source_document_id
)
select
  structures.id, years.id, 'Publication test degree', 24,
  'A rolled-back catalogue publication fixture.', 'draft', documents.id
from public.academic_structures as structures
cross join public.catalogue_years as years
join public.catalogue_source_documents as documents
  on documents.catalogue_year_id = years.id
  and documents.external_key = 'PBLS-TEST'
where structures.code = 'PBLS-TEST'
  and years.year = 2026;

select set_config(
  'request.jwt.claims',
  '{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '80000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$select public.publish_catalogue_course_version('PBLS1000', 2026::smallint)$$,
  '42501',
  'Catalogue publishing permission is required.',
  'a standard user cannot publish a course'
);

reset role;

update private.user_roles
set role_id = (select id from private.app_roles where key = 'admin')
where user_id = '80000000-0000-4000-8000-000000000001';

set local role authenticated;

select extensions.lives_ok(
  $$select public.publish_catalogue_course_version('PBLS1000', 2026::smallint)$$,
  'an administrator can publish an imported course'
);

select extensions.ok(
  exists (
    select 1
    from public.course_versions as versions
    join public.courses as courses on courses.id = versions.course_id
    where courses.code = 'PBLS1000'
      and versions.publication_status = 'published'
  )
  and exists (
    select 1
    from public.course_offerings as offerings
    join public.course_versions as versions on versions.id = offerings.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    where courses.code = 'PBLS1000'
      and offerings.status = 'published'
  ),
  'course publication also publishes its offerings'
);

select extensions.lives_ok(
  $$select public.publish_catalogue_structure_version('PBLS-TEST', 2026::smallint)$$,
  'an administrator can publish an imported structure'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures on structures.id = versions.structure_id
    where structures.code = 'PBLS-TEST'
      and versions.publication_status = 'published'
  ),
  'published structures become available to the public catalogue'
);

reset role;
select * from extensions.finish();

rollback;
