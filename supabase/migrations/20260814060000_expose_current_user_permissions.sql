begin;

insert into private.app_permissions (key, name)
values ('admin.access', 'Access the catalogue administration area');

insert into private.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from private.app_roles as roles
join private.app_permissions as permissions
  on permissions.key = 'admin.access'
where roles.key = 'catalogue_admin';

create function public.current_user_has_permission(required_permission text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.has_permission(required_permission);
$function$;

comment on function public.current_user_has_permission(text) is
  'Reports whether the authenticated caller has a database-managed application permission.';

revoke all on function public.current_user_has_permission(text) from public;
revoke all on function public.current_user_has_permission(text) from anon;
revoke all on function public.current_user_has_permission(text) from service_role;
grant execute on function public.current_user_has_permission(text) to authenticated;

commit;
