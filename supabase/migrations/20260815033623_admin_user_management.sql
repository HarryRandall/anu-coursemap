begin;

alter table public.profiles
  add column email text;

update public.profiles as profiles
set email = users.email
from auth.users as users
where users.id = profiles.id;

alter table public.profiles
  add constraint profiles_email_not_blank_check
  check (email is null or btrim(email) <> '');

create unique index profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

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

  return new;
end;
$function$;

create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$function$;

revoke all on function private.sync_user_email() from public;
revoke all on function private.sync_user_email() from anon;
revoke all on function private.sync_user_email() from authenticated;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function private.sync_user_email();

create policy profiles_admin_select
on public.profiles
for select
to authenticated
using ((select private.has_permission('admin.access')));

revoke update on table public.profiles from authenticated;
grant update (display_name, student_number)
on table public.profiles
to authenticated;

create policy app_roles_admin_select
on private.app_roles
for select
to authenticated
using ((select private.has_permission('admin.access')));

create policy app_permissions_admin_select
on private.app_permissions
for select
to authenticated
using ((select private.has_permission('admin.access')));

create policy role_permissions_admin_select
on private.role_permissions
for select
to authenticated
using ((select private.has_permission('admin.access')));

create policy user_roles_admin_select
on private.user_roles
for select
to authenticated
using ((select private.has_permission('admin.access')));

create policy user_roles_admin_insert
on private.user_roles
for insert
to authenticated
with check (
  (select private.has_permission('admin.access'))
  and granted_by = (select auth.uid())
);

create policy user_roles_admin_delete
on private.user_roles
for delete
to authenticated
using ((select private.has_permission('admin.access')));

grant select on table
  private.app_roles,
  private.app_permissions,
  private.role_permissions,
  private.user_roles
to authenticated;

grant insert (user_id, role_id, granted_by), delete
on table private.user_roles
to authenticated;

create view public.admin_users
with (security_invoker = true)
as
select
  profiles.id as user_id,
  profiles.email,
  profiles.display_name,
  profiles.created_at,
  profiles.updated_at
from public.profiles as profiles
where (select private.has_permission('admin.access'));

create view public.admin_roles
with (security_invoker = true)
as
select
  roles.key as role_key,
  roles.name as role_name,
  coalesce(
    array_agg(permissions.key order by permissions.key)
      filter (where permissions.key is not null),
    array[]::text[]
  ) as permission_keys
from private.app_roles as roles
left join private.role_permissions as role_permissions
  on role_permissions.role_id = roles.id
left join private.app_permissions as permissions
  on permissions.id = role_permissions.permission_id
where (select private.has_permission('admin.access'))
group by roles.id, roles.key, roles.name;

create view public.admin_user_roles
with (security_invoker = true)
as
select
  user_roles.user_id,
  roles.key as role_key,
  user_roles.granted_by,
  user_roles.granted_at
from private.user_roles as user_roles
join private.app_roles as roles
  on roles.id = user_roles.role_id
where (select private.has_permission('admin.access'));

comment on view public.admin_users is
  'Admin-only projection of Coursemap profiles for role management.';
comment on view public.admin_roles is
  'Admin-only role catalogue with effective permission keys.';
comment on view public.admin_user_roles is
  'Admin-only projection of current application role assignments.';

revoke all on table
  public.admin_users,
  public.admin_roles,
  public.admin_user_roles
from public, anon, service_role;

grant select on table
  public.admin_users,
  public.admin_roles,
  public.admin_user_roles
to authenticated;

create function public.set_user_role(
  p_user_id uuid,
  p_role_key text,
  p_assigned boolean
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  target_role_id bigint;
  role_grants_admin boolean;
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

  select
    roles.id,
    exists (
      select 1
      from private.role_permissions as role_permissions
      join private.app_permissions as permissions
        on permissions.id = role_permissions.permission_id
      where role_permissions.role_id = roles.id
        and permissions.key = 'admin.access'
    )
  into target_role_id, role_grants_admin
  from private.app_roles as roles
  where roles.key = p_role_key;

  if target_role_id is null then
    raise exception 'The selected role does not exist.'
      using errcode = '22023';
  end if;

  if p_assigned then
    insert into private.user_roles (user_id, role_id, granted_by)
    values (p_user_id, target_role_id, (select auth.uid()))
    on conflict (user_id, role_id) do nothing;

    return true;
  end if;

  if role_grants_admin and p_user_id = (select auth.uid()) then
    raise exception 'You cannot remove your own administrator role.'
      using errcode = '22023';
  end if;

  if role_grants_admin then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('coursemap.admin-role-assignment', 0)
    );

    select count(distinct user_roles.user_id)
    into admin_count
    from private.user_roles as user_roles
    join private.role_permissions as role_permissions
      on role_permissions.role_id = user_roles.role_id
    join private.app_permissions as permissions
      on permissions.id = role_permissions.permission_id
    where permissions.key = 'admin.access';

    if admin_count <= 1 then
      raise exception 'Coursemap must keep at least one administrator.'
        using errcode = '22023';
    end if;
  end if;

  delete from private.user_roles
  where user_id = p_user_id
    and role_id = target_role_id;

  return false;
end;
$function$;

comment on function public.set_user_role(uuid, text, boolean) is
  'Assigns or removes one database-managed application role after RLS-backed administrator checks.';

revoke all on function public.set_user_role(uuid, text, boolean) from public;
revoke all on function public.set_user_role(uuid, text, boolean) from anon;
revoke all on function public.set_user_role(uuid, text, boolean) from service_role;
grant execute on function public.set_user_role(uuid, text, boolean)
to authenticated;

commit;
