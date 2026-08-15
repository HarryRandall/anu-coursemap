begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(18);

select extensions.ok(
  to_regprocedure('public.set_user_role(uuid,text,boolean)') is not null,
  'the role-assignment RPC exists'
);

select extensions.ok(
  exists (
    select 1
    from pg_proc as functions
    where functions.oid =
      'public.set_user_role(uuid,text,boolean)'::regprocedure
      and not functions.prosecdef
      and functions.provolatile = 'v'
      and functions.proconfig @> array['search_path=""']::text[]
  ),
  'the role-assignment RPC is volatile security invoker with a fixed search path'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.set_user_role(uuid,text,boolean)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.set_user_role(uuid,text,boolean)',
    'execute'
  )
  and not has_function_privilege(
    'service_role',
    'public.set_user_role(uuid,text,boolean)',
    'execute'
  ),
  'only authenticated API users can execute the role-assignment RPC'
);

select extensions.ok(
  exists (
    select 1
    from pg_class as relations
    where relations.oid = 'public.admin_users'::regclass
      and relations.relkind = 'v'
      and relations.reloptions @> array['security_invoker=true']::text[]
  )
  and exists (
    select 1
    from pg_class as relations
    where relations.oid = 'public.admin_roles'::regclass
      and relations.reloptions @> array['security_invoker=true']::text[]
  )
  and exists (
    select 1
    from pg_class as relations
    where relations.oid = 'public.admin_user_roles'::regclass
      and relations.reloptions @> array['security_invoker=true']::text[]
  ),
  'all admin projections are security-invoker views'
);

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
    '70000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'users-admin@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Users Admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '70000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'users-student@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Users Student"}'::jsonb,
    now(),
    now()
  );

select extensions.results_eq(
  $$
    select email, display_name
    from public.profiles
    where id = '70000000-0000-4000-8000-000000000002'
  $$,
  $$values ('users-student@example.test'::text, 'Users Student'::text)$$,
  'new Auth users receive an email-backed profile'
);

update auth.users
set email = 'renamed-student@example.test'
where id = '70000000-0000-4000-8000-000000000002';

select extensions.is(
  (
    select email
    from public.profiles
    where id = '70000000-0000-4000-8000-000000000002'
  ),
  'renamed-student@example.test'::text,
  'Auth email changes stay synchronised to the profile'
);

insert into private.user_roles (user_id, role_id, granted_by)
select
  '70000000-0000-4000-8000-000000000001',
  roles.id,
  '70000000-0000-4000-8000-000000000001'
from private.app_roles as roles
where roles.key = 'catalogue_admin';

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '70000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  (
    select count(*)
    from public.admin_users
    where user_id in (
      '70000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  ),
  0::bigint,
  'a student cannot read the admin user projection'
);

select extensions.is(
  (select count(*) from public.admin_roles),
  0::bigint,
  'a student cannot read the admin role catalogue'
);

select extensions.throws_ok(
  $$
    select public.set_user_role(
      '70000000-0000-4000-8000-000000000002',
      'catalogue_admin',
      true
    )
  $$,
  '42501',
  'Administrator access is required.',
  'a student cannot assign roles'
);

select extensions.throws_ok(
  $$
    update public.profiles
    set email = 'forged@example.test'
    where id = '70000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  'permission denied for table profiles',
  'a user cannot overwrite their Auth-managed profile email'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '70000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  (
    select count(*)
    from public.admin_users
    where user_id in (
      '70000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  ),
  2::bigint,
  'an administrator can list Coursemap users'
);

select extensions.ok(
  exists (
    select 1
    from public.admin_roles
    where role_key = 'catalogue_admin'
      and permission_keys @> array['admin.access', 'catalogue.write']::text[]
  ),
  'the role catalogue includes effective permissions'
);

select extensions.is(
  public.set_user_role(
    '70000000-0000-4000-8000-000000000002',
    'catalogue_previewer',
    true
  ),
  true,
  'an administrator can assign a role'
);

select extensions.ok(
  exists (
    select 1
    from public.admin_user_roles
    where user_id = '70000000-0000-4000-8000-000000000002'
      and role_key = 'catalogue_previewer'
      and granted_by = '70000000-0000-4000-8000-000000000001'
  ),
  'the assigned role appears in the admin projection'
);

select extensions.is(
  public.set_user_role(
    '70000000-0000-4000-8000-000000000002',
    'catalogue_previewer',
    false
  ),
  false,
  'an administrator can remove a non-admin role'
);

select extensions.throws_ok(
  $$
    select public.set_user_role(
      '70000000-0000-4000-8000-000000000001',
      'catalogue_admin',
      false
    )
  $$,
  '22023',
  'You cannot remove your own administrator role.',
  'an administrator cannot remove their own administrator role'
);

select extensions.throws_ok(
  $$
    select public.set_user_role(
      '70000000-0000-4000-8000-000000000002',
      'role_that_does_not_exist',
      true
    )
  $$,
  '22023',
  'The selected role does not exist.',
  'an unknown role is rejected'
);

select extensions.is(
  (
    select count(*)
    from private.user_roles
    where user_id in (
      '70000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  ),
  1::bigint,
  'failed and removed assignments leave only the seeded administrator role'
);

reset role;

select * from extensions.finish();

rollback;
