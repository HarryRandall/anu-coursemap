begin;

drop policy plans_owner_all on public.plans;
drop policy plan_structures_owner_all on public.plan_structures;
drop policy plan_items_owner_all on public.plan_items;
drop policy course_attempts_owner_all on public.course_attempts;

create policy plans_owner_or_admin_select
on public.plans
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or (select private.has_permission('admin.access'))
);

create policy plans_owner_insert
on public.plans
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy plans_owner_update
on public.plans
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy plans_owner_delete
on public.plans
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy plan_structures_owner_or_admin_select
on public.plan_structures
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or (select private.has_permission('admin.access'))
);

create policy plan_structures_owner_insert
on public.plan_structures
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy plan_structures_owner_update
on public.plan_structures
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy plan_structures_owner_delete
on public.plan_structures
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy plan_items_owner_or_admin_select
on public.plan_items
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or (select private.has_permission('admin.access'))
);

create policy plan_items_owner_insert
on public.plan_items
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy plan_items_owner_update
on public.plan_items
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy plan_items_owner_delete
on public.plan_items
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy course_attempts_owner_or_admin_select
on public.course_attempts
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or (select private.has_permission('admin.access'))
);

create policy course_attempts_owner_insert
on public.course_attempts
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy course_attempts_owner_update
on public.course_attempts
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy course_attempts_owner_delete
on public.course_attempts
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create or replace view public.admin_users
with (security_invoker = true)
as
select
  profiles.id as user_id,
  profiles.email,
  profiles.display_name,
  profiles.created_at,
  profiles.updated_at,
  profiles.student_number
from public.profiles as profiles
where (select private.has_permission('admin.access'));

comment on view public.admin_users is
  'Admin-only projection of Coursemap profiles for account and study-plan support.';

revoke all on table public.admin_users from public, anon, service_role;
grant select on table public.admin_users to authenticated;

commit;
