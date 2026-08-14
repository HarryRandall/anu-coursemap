begin;

insert into private.app_roles (key, name)
values ('catalogue_previewer', 'Local catalogue previewer')
on conflict (key) do update
set name = excluded.name;

insert into private.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from private.app_roles as roles
join private.app_permissions as permissions
  on permissions.key = 'catalogue.read_drafts'
where roles.key = 'catalogue_previewer'
on conflict (role_id, permission_id) do nothing;

alter table public.plan_items
add column planned_calendar_year smallint,
add column planned_period_code text;

alter table public.plan_items
add constraint plan_items_planned_period_pair_check
check (
  (planned_calendar_year is null and planned_period_code is null)
  or (planned_calendar_year is not null and planned_period_code is not null)
),
add constraint plan_items_planned_calendar_year_check
check (
  planned_calendar_year is null
  or planned_calendar_year between 2000 and 2200
),
add constraint plan_items_planned_period_code_check
check (
  planned_period_code is null
  or planned_period_code ~ '^[A-Z0-9][A-Z0-9-]*$'
);

create index plan_items_planned_term_order_idx
on public.plan_items (
  plan_id,
  planned_calendar_year,
  planned_period_code,
  sort_order,
  id
);

create or replace function public.save_current_user_primary_plan(
  p_display_name text,
  p_student_number text,
  p_catalogue_year smallint,
  p_commencement_year smallint,
  p_study_load text,
  p_programme_code text,
  p_major_code text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_catalogue_year_id bigint;
  v_existing_plan_id uuid;
  v_existing_catalogue_year_id bigint;
  v_plan_id uuid;
  v_programme_version_id bigint;
  v_major_version_id bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if nullif(btrim(p_display_name), '') is null then
    raise exception using errcode = '22023', message = 'Display name is required.';
  end if;

  select years.id
  into v_catalogue_year_id
  from public.catalogue_years as years
  where years.year = p_catalogue_year;

  if v_catalogue_year_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected catalogue year is not available.';
  end if;

  select versions.id
  into v_programme_version_id
  from public.academic_structure_versions as versions
  join public.academic_structures as structures
    on structures.id = versions.structure_id
  where structures.code = upper(btrim(p_programme_code))
    and structures.kind = 'degree'
    and versions.catalogue_year_id = v_catalogue_year_id
  limit 1;

  if v_programme_version_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected programme is not available for that catalogue year.';
  end if;

  if nullif(btrim(p_major_code), '') is not null then
    select versions.id
    into v_major_version_id
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = upper(btrim(p_major_code))
      and structures.kind = 'major'
      and versions.catalogue_year_id = v_catalogue_year_id
    limit 1;

    if v_major_version_id is null then
      raise exception using
        errcode = 'P0002',
        message = 'The selected major is not available for that catalogue year.';
    end if;
  end if;

  select plans.id, plans.catalogue_year_id
  into v_existing_plan_id, v_existing_catalogue_year_id
  from public.plans as plans
  where plans.owner_id = v_user_id
    and plans.is_primary
  for update;

  if v_existing_plan_id is not null
     and v_existing_catalogue_year_id <> v_catalogue_year_id
     and exists (
       select 1
       from public.plan_items as items
       where items.plan_id = v_existing_plan_id
         and not exists (
           select 1
           from public.course_versions as versions
           where versions.course_id = items.course_id
             and versions.catalogue_year_id = v_catalogue_year_id
         )
     ) then
    raise exception using
      errcode = '23503',
      message = 'The plan contains courses unavailable in the selected catalogue year.';
  end if;

  update public.profiles
  set display_name = btrim(p_display_name),
      student_number = nullif(lower(btrim(p_student_number)), '')
  where id = v_user_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The authenticated profile is missing.';
  end if;

  insert into public.plans (
    owner_id,
    catalogue_year_id,
    name,
    is_primary,
    status,
    commencement_year,
    study_load
  )
  values (
    v_user_id,
    v_catalogue_year_id,
    upper(btrim(p_programme_code)) || ' degree plan',
    true,
    'active',
    p_commencement_year,
    p_study_load
  )
  on conflict (owner_id) where is_primary do update
  set catalogue_year_id = excluded.catalogue_year_id,
      name = excluded.name,
      status = 'active',
      commencement_year = excluded.commencement_year,
      study_load = excluded.study_load,
      updated_at = now()
  returning id into v_plan_id;

  delete from public.plan_structures
  where plan_id = v_plan_id
    and owner_id = v_user_id
    and role in ('programme', 'major');

  insert into public.plan_structures (
    plan_id,
    owner_id,
    catalogue_year_id,
    structure_version_id,
    role,
    position
  ) values (
    v_plan_id,
    v_user_id,
    v_catalogue_year_id,
    v_programme_version_id,
    'programme',
    0
  );

  if v_major_version_id is not null then
    insert into public.plan_structures (
      plan_id,
      owner_id,
      catalogue_year_id,
      structure_version_id,
      role,
      position
    ) values (
      v_plan_id,
      v_user_id,
      v_catalogue_year_id,
      v_major_version_id,
      'major',
      1
    );
  end if;

  return v_plan_id;
end;
$function$;

create or replace function public.add_current_user_plan_item(
  p_course_code text,
  p_planned_calendar_year smallint default null,
  p_planned_period_code text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_plan_id uuid;
  v_catalogue_year_id bigint;
  v_course_id bigint;
  v_period_id bigint;
  v_sort_order bigint;
  v_item_id uuid;
  v_period_code text := nullif(upper(btrim(p_planned_period_code)), '');
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if (p_planned_calendar_year is null) <> (v_period_code is null) then
    raise exception using
      errcode = '22023',
      message = 'Planned year and period must be supplied together.';
  end if;

  select plans.id, plans.catalogue_year_id
  into v_plan_id, v_catalogue_year_id
  from public.plans as plans
  where plans.owner_id = v_user_id
    and plans.is_primary
    and plans.status = 'active'
  for update;

  if v_plan_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Save a primary degree plan before adding courses.';
  end if;

  select courses.id
  into v_course_id
  from public.courses as courses
  join public.course_versions as versions
    on versions.course_id = courses.id
   and versions.catalogue_year_id = v_catalogue_year_id
  where courses.code = upper(btrim(p_course_code))
  limit 1;

  if v_course_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected course is not available in this plan catalogue.';
  end if;

  if p_planned_calendar_year is not null then
    select periods.id
    into v_period_id
    from public.academic_periods as periods
    where periods.calendar_year = p_planned_calendar_year
      and periods.code = v_period_code
    limit 1;
  end if;

  select coalesce(max(items.sort_order), -1) + 1
  into v_sort_order
  from public.plan_items as items
  where items.plan_id = v_plan_id
    and items.owner_id = v_user_id
    and items.planned_calendar_year is not distinct from p_planned_calendar_year
    and items.planned_period_code is not distinct from v_period_code;

  insert into public.plan_items (
    plan_id,
    owner_id,
    course_id,
    academic_period_id,
    planned_calendar_year,
    planned_period_code,
    sort_order
  ) values (
    v_plan_id,
    v_user_id,
    v_course_id,
    v_period_id,
    p_planned_calendar_year,
    v_period_code,
    v_sort_order
  )
  returning id into v_item_id;

  return v_item_id;
end;
$function$;

create or replace function public.move_current_user_plan_item(
  p_plan_item_id uuid,
  p_planned_calendar_year smallint default null,
  p_planned_period_code text default null,
  p_before_plan_item_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_plan_id uuid;
  v_period_id bigint;
  v_sort_order bigint;
  v_period_code text := nullif(upper(btrim(p_planned_period_code)), '');
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if (p_planned_calendar_year is null) <> (v_period_code is null) then
    raise exception using
      errcode = '22023',
      message = 'Planned year and period must be supplied together.';
  end if;

  select items.plan_id
  into v_plan_id
  from public.plan_items as items
  where items.id = p_plan_item_id
    and items.owner_id = v_user_id
  for update;

  if v_plan_id is null then
    raise exception using errcode = 'P0002', message = 'Plan item not found.';
  end if;

  perform 1
  from public.plan_items as items
  where items.plan_id = v_plan_id
    and items.owner_id = v_user_id
  for update;

  if p_planned_calendar_year is not null then
    select periods.id
    into v_period_id
    from public.academic_periods as periods
    where periods.calendar_year = p_planned_calendar_year
      and periods.code = v_period_code
    limit 1;
  end if;

  if p_before_plan_item_id is not null then
    select items.sort_order
    into v_sort_order
    from public.plan_items as items
    where items.id = p_before_plan_item_id
      and items.owner_id = v_user_id
      and items.plan_id = v_plan_id
      and items.id <> p_plan_item_id
      and items.planned_calendar_year is not distinct from p_planned_calendar_year
      and items.planned_period_code is not distinct from v_period_code;

    if v_sort_order is null then
      raise exception using
        errcode = 'P0002',
        message = 'The requested destination item was not found.';
    end if;

    update public.plan_items as items
    set sort_order = items.sort_order + 1
    where items.plan_id = v_plan_id
      and items.owner_id = v_user_id
      and items.id <> p_plan_item_id
      and items.planned_calendar_year is not distinct from p_planned_calendar_year
      and items.planned_period_code is not distinct from v_period_code
      and items.sort_order >= v_sort_order;
  else
    select coalesce(max(items.sort_order), -1) + 1
    into v_sort_order
    from public.plan_items as items
    where items.plan_id = v_plan_id
      and items.owner_id = v_user_id
      and items.id <> p_plan_item_id
      and items.planned_calendar_year is not distinct from p_planned_calendar_year
      and items.planned_period_code is not distinct from v_period_code;
  end if;

  update public.plan_items as items
  set academic_period_id = v_period_id,
      planned_calendar_year = p_planned_calendar_year,
      planned_period_code = v_period_code,
      sort_order = v_sort_order
  where items.id = p_plan_item_id
    and items.owner_id = v_user_id;
end;
$function$;

create or replace function public.remove_current_user_plan_item(
  p_plan_item_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  delete from public.plan_items
  where id = p_plan_item_id
    and owner_id = v_user_id;

  return found;
end;
$function$;

create or replace function public.record_current_user_course_attempt(
  p_plan_item_id uuid,
  p_attempt_status text,
  p_attempt_mark numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_course_id bigint;
  v_catalogue_year_id bigint;
  v_calendar_year smallint;
  v_period_code text;
  v_period_id bigint;
  v_units numeric(5, 2);
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if p_attempt_status not in ('enrolled', 'completed', 'failed') then
    raise exception using
      errcode = '22023',
      message = 'Attempt status must be enrolled, completed or failed.';
  end if;

  select
    items.course_id,
    plans.catalogue_year_id,
    items.planned_calendar_year,
    items.planned_period_code
  into
    v_course_id,
    v_catalogue_year_id,
    v_calendar_year,
    v_period_code
  from public.plan_items as items
  join public.plans as plans on plans.id = items.plan_id
  where items.id = p_plan_item_id
    and items.owner_id = v_user_id
    and plans.owner_id = v_user_id
  for update of items;

  if v_course_id is null then
    raise exception using errcode = 'P0002', message = 'Plan item not found.';
  end if;

  if v_calendar_year is null or v_period_code is null then
    raise exception using
      errcode = '22023',
      message = 'Schedule the course in an academic period before recording an attempt.';
  end if;

  select periods.id
  into v_period_id
  from public.academic_periods as periods
  where periods.calendar_year = v_calendar_year
    and periods.code = v_period_code;

  if v_period_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The academic period is not available for recorded history.';
  end if;

  select versions.units
  into v_units
  from public.course_versions as versions
  where versions.course_id = v_course_id
    and versions.catalogue_year_id = v_catalogue_year_id;

  if v_units is null then
    raise exception using
      errcode = 'P0002',
      message = 'The course version is unavailable for this plan.';
  end if;

  insert into public.course_attempts (
    owner_id,
    course_id,
    academic_period_id,
    status,
    mark,
    units_attempted,
    units_earned,
    source
  ) values (
    v_user_id,
    v_course_id,
    v_period_id,
    p_attempt_status,
    p_attempt_mark,
    v_units,
    case when p_attempt_status = 'completed' then v_units else 0 end,
    'user_entered'
  )
  on conflict (owner_id, course_id, academic_period_id) do update
  set status = excluded.status,
      mark = excluded.mark,
      units_attempted = excluded.units_attempted,
      units_earned = excluded.units_earned,
      source = 'user_entered',
      updated_at = now()
  returning id into v_attempt_id;

  delete from public.plan_items
  where id = p_plan_item_id
    and owner_id = v_user_id;

  return v_attempt_id;
end;
$function$;

revoke all on function public.save_current_user_primary_plan(
  text, text, smallint, smallint, text, text, text
) from public, anon, service_role;
grant execute on function public.save_current_user_primary_plan(
  text, text, smallint, smallint, text, text, text
) to authenticated;

revoke all on function public.add_current_user_plan_item(
  text, smallint, text
) from public, anon, service_role;
grant execute on function public.add_current_user_plan_item(
  text, smallint, text
) to authenticated;

revoke all on function public.move_current_user_plan_item(
  uuid, smallint, text, uuid
) from public, anon, service_role;
grant execute on function public.move_current_user_plan_item(
  uuid, smallint, text, uuid
) to authenticated;

revoke all on function public.remove_current_user_plan_item(uuid)
from public, anon, service_role;
grant execute on function public.remove_current_user_plan_item(uuid)
to authenticated;

revoke all on function public.record_current_user_course_attempt(
  uuid, text, numeric
) from public, anon, service_role;
grant execute on function public.record_current_user_course_attempt(
  uuid, text, numeric
) to authenticated;

commit;
