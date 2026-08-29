begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(10);

select extensions.ok(
  (
    select classes.relrowsecurity
    from pg_class as classes
    where classes.oid = 'public.course_rule_course_references'::regclass
  ),
  'row level security is enabled on course references'
);

select extensions.ok(
  (
    select array_agg(policies.policyname::text order by policies.policyname)
    from pg_policies as policies
    where policies.schemaname = 'public'
      and policies.tablename = 'course_rule_course_references'
  ) = array[
    'course_rule_course_references_admin_all',
    'course_rule_course_references_read_drafts',
    'course_rule_course_references_read_published',
    'course_rule_course_references_read_snapshot_published'
  ],
  'course references carry the published, draft and admin catalogue policies'
);

select extensions.ok(
  has_table_privilege(
    'anon',
    'public.course_rule_course_references',
    'select'
  )
  and not has_table_privilege(
    'anon',
    'public.course_rule_course_references',
    'insert'
  ),
  'anonymous API users can only read course references'
);

select extensions.ok(
  has_table_privilege(
    'authenticated',
    'public.course_rule_course_references',
    'insert'
  )
  and has_table_privilege(
    'authenticated',
    'public.course_rule_course_references',
    'update'
  )
  and has_table_privilege(
    'authenticated',
    'public.course_rule_course_references',
    'delete'
  ),
  'authenticated API users can write course references subject to policy'
);

select extensions.ok(
  has_sequence_privilege(
    'authenticated',
    'public.course_rule_course_references_id_seq',
    'usage'
  ),
  'authenticated API users can use the course reference identity sequence'
);

select extensions.ok(
  exists (
    select 1
    from pg_proc as functions
    where functions.oid = 'public.published_course_detail(text)'::regprocedure
      and not functions.prosecdef
      and functions.proconfig @> array['search_path=""']::text[]
  ),
  'the published course detail function pins an empty search path'
);

select extensions.ok(
  exists (
    select 1
    from pg_proc as functions
    where functions.oid =
      'public.published_course_requisite_graph(text)'::regprocedure
      and not functions.prosecdef
      and functions.proconfig @> array['search_path=""']::text[]
  ),
  'the published requisite graph function pins an empty search path'
);

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'reference-student@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'reference-admin@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

update private.user_roles
set role_id = (select id from private.app_roles where key = 'admin')
where user_id = '90000000-0000-4000-8000-000000000002';

insert into public.catalogue_sources (name, kind, base_url)
values ('Course reference test source', 'test', 'https://references.example.test');

insert into public.catalogue_source_documents (
  source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
  content_sha256
)
select
  sources.id, years.id, 'course', 'CREF1000',
  'https://references.example.test/CREF1000', repeat('3', 64)
from public.catalogue_sources as sources
cross join public.catalogue_years as years
where sources.base_url = 'https://references.example.test'
  and years.year = 2026;

insert into public.courses (code) values ('CREF1000'), ('CREF1001');

insert into public.course_versions (
  course_id, catalogue_year_id, title, units, level, subject, school,
  description, publication_status, source_document_id
)
select
  courses.id, years.id, 'Course reference fixture', 6, 1000, 'CREF',
  'Test school', 'A rolled-back course reference fixture.', 'draft',
  documents.id
from public.courses as courses
cross join public.catalogue_years as years
join public.catalogue_source_documents as documents
  on documents.catalogue_year_id = years.id
  and documents.external_key = 'CREF1000'
where courses.code = 'CREF1000'
  and years.year = 2026;

insert into public.course_rules (
  course_version_id, catalogue_year_id, rule_kind, source_text,
  source_document_id
)
select
  versions.id, versions.catalogue_year_id, 'prerequisite',
  'Completion of CREF1001', versions.source_document_id
from public.course_versions as versions
join public.courses as courses on courses.id = versions.course_id
where courses.code = 'CREF1000';

insert into public.course_rule_groups (course_rule_id, operator, position)
select rules.id, 'all_of', 0
from public.course_rules as rules
join public.course_versions as versions
  on versions.id = rules.course_version_id
join public.courses as courses on courses.id = versions.course_id
where courses.code = 'CREF1000'
  and rules.rule_kind = 'prerequisite';

select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$
    insert into public.course_rule_course_references (
      course_rule_id, referenced_course_id, source_text, confidence,
      review_state
    )
    select rules.id, referenced.id, 'CREF1001', 0.5, 'review'
    from public.course_rules as rules
    join public.course_versions as versions
      on versions.id = rules.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    join public.courses as referenced on referenced.code = 'CREF1001'
    where courses.code = 'CREF1000'
      and rules.rule_kind = 'prerequisite'
  $$,
  '42501',
  null,
  'a signed-in student cannot create course references'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    insert into public.course_rule_course_references (
      course_rule_id, referenced_course_id, source_text, confidence,
      review_state
    )
    select rules.id, referenced.id, 'CREF1001', 0.5, 'review'
    from public.course_rules as rules
    join public.course_versions as versions
      on versions.id = rules.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    join public.courses as referenced on referenced.code = 'CREF1001'
    where courses.code = 'CREF1000'
      and rules.rule_kind = 'prerequisite'
  $$,
  'a catalogue administrator can create course references'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  (
    select count(*)
    from public.course_rule_course_references as rule_references
    join public.courses as referenced
      on referenced.id = rule_references.referenced_course_id
    where referenced.code = 'CREF1001'
  ),
  1::bigint,
  'a signed-in student with draft access can read draft course references'
);

reset role;

select * from extensions.finish();

rollback;
