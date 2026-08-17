begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(13);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.save_current_user_primary_plan(text,text,smallint,smallint,text,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.save_current_user_primary_plan(text,text,smallint,smallint,text,text,text)',
    'execute'
  ),
  'student plan RPCs are exposed only to authenticated users'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.set_current_user_plan_extension_years(smallint)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.set_current_user_plan_extension_years(smallint)',
    'execute'
  ),
  'plan timeline extensions are available only to authenticated users'
);

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'plan-owner@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '60000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'plan-other@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.catalogue_sources (name, kind, base_url)
values ('Plan RPC test source', 'test', 'https://plan-rpc.example.test');

insert into public.catalogue_source_documents (
  source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
  content_sha256
)
select
  sources.id, years.id, 'course', 'TSTX1000',
  'https://plan-rpc.example.test/TSTX1000', repeat('9', 64)
from public.catalogue_sources as sources
cross join public.catalogue_years as years
where sources.base_url = 'https://plan-rpc.example.test'
  and years.year = 2026;

insert into public.courses (code) values ('TSTX1000');

insert into public.course_versions (
  course_id, catalogue_year_id, title, units, level, subject, school,
  description, source_document_id
)
select
  courses.id, years.id, 'Persistence test course', 6, 1000, 'TSTX',
  'Test school', 'Used only inside the rolled-back pgTAP fixture.', documents.id
from public.courses as courses
cross join public.catalogue_years as years
cross join public.catalogue_source_documents as documents
where courses.code = 'TSTX1000'
  and years.year = 2026
  and documents.external_key = 'TSTX1000';

insert into public.academic_periods (
  calendar_year, code, name, short_name, starts_on, ends_on, sort_order
) values (2026, 'X1', 'Test period', 'X1', '2026-01-01', '2026-01-31', 99)
on conflict (calendar_year, code) do nothing;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    select public.save_current_user_primary_plan(
      'Plan Owner', 'u1234567', 2026::smallint, 2026::smallint,
      'full_time', 'BCOMP', 'SOFT-MAJ'
    )
  $$,
  'a preview-enabled user can save a primary degree plan'
);

select extensions.results_eq(
  $$
    select display_name, student_number
    from public.profiles
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  $$values ('Plan Owner'::text, 'u1234567'::text)$$,
  'saving a plan persists the student profile'
);

select extensions.is(
  (
    select count(*)
    from public.plan_structures
    where owner_id = '60000000-0000-4000-8000-000000000001'
  ),
  2::bigint,
  'the programme and major are attached to the primary plan'
);

create temporary table persistence_test_ids (id uuid primary key);
insert into persistence_test_ids
select public.add_current_user_plan_item('TSTX1000', 2026::smallint, 'X1');

select extensions.ok(
  exists (
    select 1
    from public.plan_items
    where id = (select id from persistence_test_ids)
      and planned_calendar_year = 2026
      and planned_period_code = 'X1'
  ),
  'adding a course persists its planned study period'
);

select extensions.lives_ok(
  $$
    select public.move_current_user_plan_item(
      (select id from persistence_test_ids), null::smallint, null, null
    )
  $$,
  'a planned course can move to the unscheduled bucket'
);

select extensions.ok(
  exists (
    select 1
    from public.plan_items
    where id = (select id from persistence_test_ids)
      and planned_calendar_year is null
      and planned_period_code is null
  ),
  'the unscheduled move clears both planned period fields'
);

select public.move_current_user_plan_item(
  (select id from persistence_test_ids), 2026::smallint, 'X1', null
);
select public.record_current_user_course_attempt(
  (select id from persistence_test_ids), 'completed', 75
);

select extensions.is(
  (select count(*) from public.plan_items),
  0::bigint,
  'recording a result removes the planned item'
);

select extensions.ok(
  exists (
    select 1
    from public.course_attempts
    where owner_id = '60000000-0000-4000-8000-000000000001'
      and status = 'completed'
      and mark = 75
      and units_attempted = 6
      and units_earned = 6
  ),
  'recording completion creates durable academic history'
);

select extensions.lives_ok(
  $$select public.set_current_user_plan_extension_years(2)$$,
  'a plan owner can extend their timeline'
);

select extensions.is(
  (
    select extension_years
    from public.plans
    where owner_id = '60000000-0000-4000-8000-000000000001'
  ),
  2::smallint,
  'timeline extensions persist on the primary plan'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  (select count(*) from public.plans),
  0::bigint,
  'another user cannot see the saved plan'
);

reset role;
select * from extensions.finish();
rollback;
