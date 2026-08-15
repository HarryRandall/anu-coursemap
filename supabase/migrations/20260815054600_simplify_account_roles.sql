begin;

update private.app_roles
set
  key = 'admin',
  name = 'Admin',
  description = 'Full access to Coursemap administration and catalogue operations.'
where key = 'catalogue_admin';

update private.app_roles
set
  key = 'user',
  name = 'User',
  description = 'Standard access to Coursemap planning and catalogue features.'
where key = 'catalogue_previewer';

update private.app_permissions
set
  name = case key
    when 'admin.access' then 'Admin access'
    when 'approvals.review' then 'Review approvals'
    when 'catalogue.read_drafts' then 'View draft catalogue'
    when 'catalogue.write' then 'Edit catalogue'
    when 'imports.manage' then 'Manage imports'
    else name
  end,
  description = case key
    when 'admin.access' then 'Open Coursemap administration pages.'
    when 'approvals.review' then 'Review and resolve student approval requests.'
    when 'catalogue.read_drafts' then 'View catalogue records before publication.'
    when 'catalogue.write' then 'Create and update catalogue records.'
    when 'imports.manage' then 'Run and review catalogue imports.'
    else description
  end;

delete from private.user_roles as user_roles
where user_roles.role_id = (
  select roles.id
  from private.app_roles as roles
  where roles.key = 'user'
)
and exists (
  select 1
  from private.user_roles as administrator_roles
  join private.app_roles as roles
    on roles.id = administrator_roles.role_id
  where administrator_roles.user_id = user_roles.user_id
    and roles.key = 'admin'
);

insert into private.user_roles (user_id, role_id, granted_by)
select users.id, roles.id, null
from auth.users as users
cross join private.app_roles as roles
where roles.key = 'user'
and not exists (
  select 1
  from private.user_roles as user_roles
  where user_roles.user_id = users.id
)
on conflict (user_id, role_id) do nothing;

alter table private.user_roles
  add constraint user_roles_user_id_unique unique (user_id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Student'
    )
  )
  on conflict (id) do update
  set email = excluded.email;

  insert into private.user_roles (user_id, role_id, granted_by)
  select new.id, roles.id, null
  from private.app_roles as roles
  where roles.key = 'user'
  on conflict (user_id) do nothing;

  return new;
end;
$function$;

drop function public.set_user_role(uuid, text, boolean);

create function public.set_user_role(
  p_user_id uuid,
  p_role_key text
)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  target_role_id bigint;
  current_role_key text;
  admin_count bigint;
begin
  if not (select private.has_permission('admin.access')) then
    raise exception 'Administrator access is required.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profiles
    where profiles.id = p_user_id
  ) then
    raise exception 'The selected user does not exist.'
      using errcode = '22023';
  end if;

  select roles.id
  into target_role_id
  from private.app_roles as roles
  where roles.key = p_role_key
    and roles.key in ('admin', 'user');

  if target_role_id is null then
    raise exception 'The selected role does not exist.'
      using errcode = '22023';
  end if;

  select roles.key
  into current_role_key
  from private.user_roles as user_roles
  join private.app_roles as roles on roles.id = user_roles.role_id
  where user_roles.user_id = p_user_id;

  if current_role_key = p_role_key then
    return p_role_key;
  end if;

  if current_role_key = 'admin' and p_user_id = (select auth.uid()) then
    raise exception 'You cannot remove your own administrator role.'
      using errcode = '22023';
  end if;

  if current_role_key = 'admin' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('coursemap.admin-role-assignment', 0)
    );

    select count(*)
    into admin_count
    from private.user_roles as user_roles
    join private.app_roles as roles on roles.id = user_roles.role_id
    where roles.key = 'admin';

    if admin_count <= 1 then
      raise exception 'Coursemap must keep at least one administrator.'
        using errcode = '22023';
    end if;
  end if;

  delete from private.user_roles
  where user_id = p_user_id;

  insert into private.user_roles (user_id, role_id, granted_by)
  values (p_user_id, target_role_id, (select auth.uid()));

  return p_role_key;
end;
$function$;

comment on function public.set_user_role(uuid, text) is
  'Sets one database-managed account role after RLS-backed administrator checks.';

revoke all on function public.set_user_role(uuid, text) from public;
revoke all on function public.set_user_role(uuid, text) from anon;
revoke all on function public.set_user_role(uuid, text) from service_role;
grant execute on function public.set_user_role(uuid, text) to authenticated;

create or replace function public.set_role_permission(
  p_role_id bigint,
  p_permission_id bigint,
  p_enabled boolean
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  target_role_key text;
  target_permission_key text;
begin
  if not (select private.has_permission('admin.access')) then
    raise exception 'Administrator access is required.'
      using errcode = '42501';
  end if;

  select roles.key
  into target_role_key
  from private.app_roles as roles
  where roles.id = p_role_id;

  select permissions.key
  into target_permission_key
  from private.app_permissions as permissions
  where permissions.id = p_permission_id;

  if target_role_key is null or target_permission_key is null then
    raise exception 'The selected role or permission does not exist.'
      using errcode = '22023';
  end if;

  if target_permission_key = 'admin.access' then
    if target_role_key = 'admin' and not p_enabled then
      raise exception 'Administrator access is required for the admin role.'
        using errcode = '22023';
    end if;

    if target_role_key <> 'admin' and p_enabled then
      raise exception 'Administrator access can only be granted by the admin role.'
        using errcode = '22023';
    end if;
  end if;

  if p_enabled then
    insert into private.role_permissions (role_id, permission_id)
    values (p_role_id, p_permission_id)
    on conflict (role_id, permission_id) do nothing;

    return true;
  end if;

  delete from private.role_permissions
  where role_id = p_role_id
    and permission_id = p_permission_id;

  return false;
end;
$function$;

comment on function public.set_role_permission(bigint, bigint, boolean) is
  'Grants or removes one role permission while preserving account-role invariants.';

commit;
