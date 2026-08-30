begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(9);

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
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'rls-owner-one@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RLS Owner One"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'rls-owner-two@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select extensions.results_eq(
  $$
    select id, display_name
    from public.profiles
    where id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
    order by id
  $$,
  $$
    values
      ('10000000-0000-4000-8000-000000000001'::uuid, 'RLS Owner One'::text),
      ('10000000-0000-4000-8000-000000000002'::uuid, 'rls-owner-two'::text)
  $$,
  'new Auth users receive profiles from metadata or their email fallback'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"rls-owner-one@example.test"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    insert into public.plans (
      id,
      owner_id,
      academic_year_id,
      name,
      is_primary,
      commencement_year,
      study_load
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      (select id from public.academic_years where year = 2030),
      'Owner one plan',
      true,
      2030,
      'full_time'
    )
  $$,
  'an authenticated owner can insert their own plan'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.plans
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  $$values (1::bigint)$$,
  'an authenticated owner can read their own plan'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","email":"rls-owner-two@example.test"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.results_eq(
  $$
    select count(*)::bigint
    from public.plans
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  $$values (0::bigint)$$,
  'another authenticated user cannot see the owner plan'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"rls-owner-one@example.test"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$
    update public.plans
    set owner_id = '10000000-0000-4000-8000-000000000002'
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'an owner cannot reassign their plan to another user'
);

select extensions.throws_ok(
  $$
    insert into public.plans (
      id,
      owner_id,
      academic_year_id,
      name,
      commencement_year,
      study_load
    )
    values (
      '20000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000002',
      (select id from public.academic_years where year = 2030),
      'Foreign owner plan',
      2030,
      'part_time'
    )
  $$,
  '42501',
  null,
  'an authenticated user cannot insert a plan for another owner'
);

select extensions.is(
  private.has_permission('catalogue.write'),
  false,
  'a student has no catalogue administrator permission by default'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select extensions.throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'anonymous users have no effective API access to profiles'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into private.user_roles (user_id, role_id, granted_by)
select
  '10000000-0000-4000-8000-000000000001',
  roles.id,
  '10000000-0000-4000-8000-000000000001'
from private.app_roles as roles
where roles.key = 'admin'
on conflict (user_id) do update
set
  role_id = excluded.role_id,
  granted_by = excluded.granted_by,
  granted_at = now();

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"rls-owner-one@example.test"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  private.has_permission('catalogue.write'),
  true,
  'a private catalogue administrator role assignment grants its permission'
);

reset role;

select * from extensions.finish();

rollback;
