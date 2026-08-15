begin;

alter table private.app_roles
  add column description text;

update private.app_roles
set description = case key
  when 'catalogue_admin' then
    'Full access to Coursemap administration and catalogue operations.'
  when 'catalogue_previewer' then
    'Can inspect unpublished catalogue data without changing it.'
  else 'Application access role.'
end;

alter table private.app_roles
  alter column description set not null,
  add constraint app_roles_description_not_blank_check
    check (btrim(description) <> '');

alter table private.app_permissions
  add column description text,
  add column category text;

update private.app_permissions
set
  name = case key
    when 'admin.access' then 'Access'
    when 'approvals.review' then 'Review'
    when 'catalogue.read_drafts' then 'Read drafts'
    when 'catalogue.write' then 'Write'
    when 'imports.manage' then 'Manage'
    else name
  end,
  description = case key
    when 'admin.access' then 'Open protected Coursemap administration routes.'
    when 'approvals.review' then 'Review and resolve student approval requests.'
    when 'catalogue.read_drafts' then
      'Inspect catalogue records before publication.'
    when 'catalogue.write' then
      'Create and change catalogue-managed records.'
    when 'imports.manage' then 'Run and review catalogue import operations.'
    else name
  end,
  category = split_part(key, '.', 1);

alter table private.app_permissions
  alter column description set not null,
  alter column category set not null,
  add constraint app_permissions_description_not_blank_check
    check (btrim(description) <> ''),
  add constraint app_permissions_category_format_check
    check (category ~ '^[a-z][a-z0-9_]*$');

create policy role_permissions_admin_insert
on private.role_permissions
for insert
to authenticated
with check ((select private.has_permission('admin.access')));

create policy role_permissions_admin_delete
on private.role_permissions
for delete
to authenticated
using ((select private.has_permission('admin.access')));

grant insert (role_id, permission_id), delete
on table private.role_permissions
to authenticated;

create or replace view public.admin_roles
with (security_invoker = true)
as
select
  roles.key as role_key,
  roles.name as role_name,
  coalesce(
    array_agg(permissions.key order by permissions.key)
      filter (where permissions.key is not null),
    array[]::text[]
  ) as permission_keys,
  roles.id as role_id,
  roles.description as role_description
from private.app_roles as roles
left join private.role_permissions as role_permissions
  on role_permissions.role_id = roles.id
left join private.app_permissions as permissions
  on permissions.id = role_permissions.permission_id
where (select private.has_permission('admin.access'))
group by roles.id, roles.key, roles.name, roles.description;

create view public.admin_permissions
with (security_invoker = true)
as
select
  permissions.id as permission_id,
  permissions.key as permission_key,
  permissions.name as permission_name,
  permissions.description as permission_description,
  permissions.category as permission_category
from private.app_permissions as permissions
where (select private.has_permission('admin.access'));

create view public.admin_role_permissions
with (security_invoker = true)
as
select
  role_permissions.role_id,
  role_permissions.permission_id
from private.role_permissions as role_permissions
where (select private.has_permission('admin.access'));

comment on view public.admin_roles is
  'Admin-only role catalogue with descriptions and effective permission keys.';
comment on view public.admin_permissions is
  'Admin-only permission catalogue used by the editable role matrix.';
comment on view public.admin_role_permissions is
  'Admin-only projection of current role-level permission grants.';

revoke all on table
  public.admin_permissions,
  public.admin_role_permissions
from public, anon, service_role;

grant select on table
  public.admin_permissions,
  public.admin_role_permissions
to authenticated;

create function public.set_role_permission(
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

  if
    target_role_key = 'catalogue_admin'
    and target_permission_key = 'admin.access'
    and not p_enabled
  then
    raise exception 'Administrator access is required for the catalogue administrator role.'
      using errcode = '22023';
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
  'Grants or removes one role permission after administrator and invariant checks.';

revoke all on function public.set_role_permission(bigint, bigint, boolean)
from public;
revoke all on function public.set_role_permission(bigint, bigint, boolean)
from anon;
revoke all on function public.set_role_permission(bigint, bigint, boolean)
from service_role;
grant execute on function public.set_role_permission(bigint, bigint, boolean)
to authenticated;

commit;
