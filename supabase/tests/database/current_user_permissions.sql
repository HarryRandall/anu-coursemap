begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(8);

select extensions.ok(
  to_regprocedure('public.current_user_has_permission(text)') is not null,
  'the current-user permission RPC exists in the exposed schema'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.current_user_has_permission(text)',
    'execute'
  )
  and not has_function_privilege(
    'service_role',
    'public.current_user_has_permission(text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.current_user_has_permission(text)',
    'execute'
  ),
  'only authenticated API users can execute the permission RPC'
);

select extensions.ok(
  exists (
    select 1
    from pg_proc as functions
    where functions.oid =
      'public.current_user_has_permission(text)'::regprocedure
      and not functions.prosecdef
      and functions.provolatile = 's'
      and functions.proconfig @> array['search_path=""']::text[]
  ),
  'the permission RPC is stable security invoker with a fixed search path'
);

select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  public.current_user_has_permission('catalogue.write'),
  false,
  'an authenticated role without a user claim has no permission'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

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
    '50000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'permission-student@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '50000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'permission-admin@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  public.current_user_has_permission('catalogue.write'),
  false,
  'a signed-in student has no catalogue write permission'
);

select extensions.is(
  public.current_user_has_permission('permission.that_does_not_exist'),
  false,
  'an unknown permission is denied'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into private.user_roles (user_id, role_id, granted_by)
select
  '50000000-0000-4000-8000-000000000002',
  roles.id,
  '50000000-0000-4000-8000-000000000002'
from private.app_roles as roles
where roles.key = 'admin'
on conflict (user_id) do update
set
  role_id = excluded.role_id,
  granted_by = excluded.granted_by,
  granted_at = now();

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  public.current_user_has_permission('catalogue.write'),
  true,
  'a catalogue administrator receives catalogue write permission'
);

select extensions.is(
  public.current_user_has_permission('admin.access'),
  true,
  'the catalogue administrator can enter the administration area'
);

reset role;

select * from extensions.finish();

rollback;
