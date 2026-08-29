begin;

-- Student-owned planner rows are read directly but are only mutated through
-- the authenticated RPC contract. SECURITY DEFINER is deliberately narrow:
-- every write derives the actor from auth.uid() and constrains ownership.
drop policy if exists plan_items_owner_insert on public.plan_items;
drop policy if exists plan_items_owner_update on public.plan_items;
drop policy if exists plan_items_owner_delete on public.plan_items;
drop policy if exists course_attempts_owner_insert on public.course_attempts;
drop policy if exists course_attempts_owner_update on public.course_attempts;
drop policy if exists course_attempts_owner_delete on public.course_attempts;

revoke insert, update, delete on table public.plan_items from authenticated;
revoke insert, update, delete on table public.course_attempts from authenticated;

-- Serialise plan membership with course-year archival. The plan-item trigger
-- takes a shared row lock, while an archive update takes an exclusive row
-- lock. Whichever transaction arrives second therefore observes the first
-- transaction's committed state instead of creating an unreadable plan item.
create or replace function private.require_active_plan_item_course_year()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_lifecycle_status text;
begin
  select course_years.lifecycle_status
  into selected_lifecycle_status
  from public.course_years as course_years
  where course_years.course_id = new.course_id
    and course_years.academic_year_id = new.academic_year_id
  for share of course_years;

  if not found then
    raise exception 'The selected course year was not found.'
      using errcode = 'P0002';
  end if;
  if selected_lifecycle_status <> 'active' then
    raise exception 'Plan items can reference only active course years.'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

drop trigger if exists plan_items_require_active_course_year
on public.plan_items;

create trigger plan_items_require_active_course_year
before insert or update of course_id, academic_year_id on public.plan_items
for each row execute function private.require_active_plan_item_course_year();

revoke all on function private.require_active_plan_item_course_year()
from public, anon, authenticated, service_role;

-- The archive update already holds the matching course-year row lock. Paired
-- with the plan-item trigger above, this check is safe against a concurrent
-- plan insertion and protects every update path, not only the public RPC.
create or replace function private.guard_archived_course_year()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.lifecycle_status = 'archived' then
    if new is distinct from old then
      raise exception 'Archived course years are immutable.' using errcode = '55000';
    end if;
    return new;
  end if;

  if new.lifecycle_status = 'archived'
    and (
      new.draft_snapshot_id is distinct from old.draft_snapshot_id
      or new.published_snapshot_id is distinct from old.published_snapshot_id
      or new.course_id is distinct from old.course_id
      or new.academic_year_id is distinct from old.academic_year_id
    )
  then
    raise exception 'Archival cannot change course snapshot pointers.'
      using errcode = '55000';
  end if;

  if new.lifecycle_status = 'archived'
    and exists (
      select 1
      from public.plan_items as plan_items
      where plan_items.course_id = old.course_id
        and plan_items.academic_year_id = old.academic_year_id
    )
  then
    raise exception 'This course year cannot be archived while it is referenced by a student plan.'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

create or replace function public.add_current_user_plan_item(
  p_course_code text,
  p_academic_year smallint,
  p_planned_calendar_year smallint default null,
  p_planned_period_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
  selected_plan_id uuid;
  selected_course_id bigint;
  selected_academic_year_id bigint;
  selected_period_id bigint;
  next_sort_order bigint;
  created_item_id uuid;
  period_code text := nullif(upper(btrim(p_planned_period_code)), '');
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if p_academic_year is null then
    raise exception using
      errcode = '22023',
      message = 'A course academic year is required.';
  end if;

  if (p_planned_calendar_year is null) <> (period_code is null) then
    raise exception using
      errcode = '22023',
      message = 'Planned year and period must be supplied together.';
  end if;

  if p_planned_calendar_year is not null
    and p_planned_calendar_year <> p_academic_year
  then
    raise exception using
      errcode = '22023',
      message = 'The planned period must be in the selected course academic year.';
  end if;

  select plans.id
  into selected_plan_id
  from public.plans
  where plans.owner_id = user_id
    and plans.is_primary
    and plans.status = 'active'
  for update of plans;

  if selected_plan_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Save a primary degree plan before adding courses.';
  end if;

  select courses.id, academic_years.id
  into selected_course_id, selected_academic_year_id
  from public.courses
  join public.course_years on course_years.course_id = courses.id
  join public.academic_years
    on academic_years.id = course_years.academic_year_id
  where courses.code = upper(btrim(p_course_code))
    and academic_years.year = p_academic_year
    and course_years.lifecycle_status = 'active'
    and course_years.published_snapshot_id is not null
  limit 1;

  if selected_course_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected course has no published snapshot for the planned year.';
  end if;

  if p_planned_calendar_year is not null then
    select academic_periods.id
    into selected_period_id
    from public.academic_periods
    where academic_periods.calendar_year = p_planned_calendar_year
      and academic_periods.code = period_code
    limit 1;
  end if;

  select coalesce(max(plan_items.sort_order), -1) + 1
  into next_sort_order
  from public.plan_items
  where plan_items.plan_id = selected_plan_id
    and plan_items.owner_id = user_id
    and plan_items.planned_calendar_year is not distinct from
      p_planned_calendar_year
    and plan_items.planned_period_code is not distinct from period_code;

  insert into public.plan_items (
    plan_id,
    owner_id,
    course_id,
    academic_year_id,
    academic_period_id,
    planned_calendar_year,
    planned_period_code,
    sort_order
  ) values (
    selected_plan_id,
    user_id,
    selected_course_id,
    selected_academic_year_id,
    selected_period_id,
    p_planned_calendar_year,
    period_code,
    next_sort_order
  )
  returning id into created_item_id;

  return created_item_id;
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
security definer
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
  selected_plan_id uuid;
  selected_academic_year smallint;
  selected_period_id bigint;
  destination_sort_order bigint;
  period_code text := nullif(upper(btrim(p_planned_period_code)), '');
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if (p_planned_calendar_year is null) <> (period_code is null) then
    raise exception using
      errcode = '22023',
      message = 'Planned year and period must be supplied together.';
  end if;

  select plan_items.plan_id, academic_years.year
  into selected_plan_id, selected_academic_year
  from public.plan_items
  join public.academic_years
    on academic_years.id = plan_items.academic_year_id
  where plan_items.id = p_plan_item_id
    and plan_items.owner_id = user_id
  for update of plan_items;

  if selected_plan_id is null then
    raise exception using errcode = 'P0002', message = 'Plan item not found.';
  end if;

  if p_planned_calendar_year is not null
    and p_planned_calendar_year <> selected_academic_year
  then
    raise exception using
      errcode = '22023',
      message = 'A planned course cannot be moved outside its selected academic year.';
  end if;

  perform 1
  from public.plan_items
  where plan_items.plan_id = selected_plan_id
    and plan_items.owner_id = user_id
  for update of plan_items;

  if p_planned_calendar_year is not null then
    select academic_periods.id
    into selected_period_id
    from public.academic_periods
    where academic_periods.calendar_year = p_planned_calendar_year
      and academic_periods.code = period_code
    limit 1;
  end if;

  if p_before_plan_item_id is not null then
    select plan_items.sort_order
    into destination_sort_order
    from public.plan_items
    where plan_items.id = p_before_plan_item_id
      and plan_items.owner_id = user_id
      and plan_items.plan_id = selected_plan_id
      and plan_items.id <> p_plan_item_id
      and plan_items.planned_calendar_year is not distinct from
        p_planned_calendar_year
      and plan_items.planned_period_code is not distinct from period_code;

    if destination_sort_order is null then
      raise exception using
        errcode = 'P0002',
        message = 'The requested destination item was not found.';
    end if;

    update public.plan_items
    set sort_order = plan_items.sort_order + 1
    where plan_items.plan_id = selected_plan_id
      and plan_items.owner_id = user_id
      and plan_items.id <> p_plan_item_id
      and plan_items.planned_calendar_year is not distinct from
        p_planned_calendar_year
      and plan_items.planned_period_code is not distinct from period_code
      and plan_items.sort_order >= destination_sort_order;
  else
    select coalesce(max(plan_items.sort_order), -1) + 1
    into destination_sort_order
    from public.plan_items
    where plan_items.plan_id = selected_plan_id
      and plan_items.owner_id = user_id
      and plan_items.id <> p_plan_item_id
      and plan_items.planned_calendar_year is not distinct from
        p_planned_calendar_year
      and plan_items.planned_period_code is not distinct from period_code;
  end if;

  update public.plan_items
  set
    academic_period_id = selected_period_id,
    planned_calendar_year = p_planned_calendar_year,
    planned_period_code = period_code,
    sort_order = destination_sort_order
  where plan_items.id = p_plan_item_id
    and plan_items.owner_id = user_id;
end;
$function$;

create or replace function public.remove_current_user_plan_item(
  p_plan_item_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  delete from public.plan_items
  where plan_items.id = p_plan_item_id
    and plan_items.owner_id = user_id;

  return found;
end;
$function$;

drop function public.record_current_user_course_attempt(uuid, text, numeric);

create function public.record_current_user_course_attempt(
  p_plan_item_id uuid,
  p_attempt_status text,
  p_attempt_mark numeric default null,
  p_units_attempted numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
  selected_course_id bigint;
  selected_academic_year_id bigint;
  selected_calendar_year smallint;
  selected_period_code text;
  selected_period_id bigint;
  selected_snapshot_id bigint;
  selected_unit_value_kind text;
  selected_fixed_units numeric(6, 2);
  selected_minimum_units numeric(6, 2);
  selected_maximum_units numeric(6, 2);
  existing_attempt_id uuid;
  existing_snapshot_id bigint;
  existing_attempted_units numeric(5, 2);
  attempted_units numeric(5, 2);
  normalised_mark numeric(5, 2);
  created_attempt_id uuid;
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if p_attempt_status not in ('enrolled', 'completed', 'failed') then
    raise exception using
      errcode = '22023',
      message = 'Attempt status must be enrolled, completed or failed.';
  end if;

  if p_attempt_mark is not null and (p_attempt_mark < 0 or p_attempt_mark > 100) then
    raise exception using
      errcode = '22023',
      message = 'Attempt mark must be between 0 and 100.';
  end if;

  if p_units_attempted is not null and (
    p_units_attempted <= 0
    or p_units_attempted > 999.99
    or p_units_attempted <> round(p_units_attempted, 2)
  ) then
    raise exception using
      errcode = '22023',
      message = 'Attempted units must be a positive value with at most two decimal places.';
  end if;

  normalised_mark := case
    when p_attempt_status = 'enrolled' then null
    else p_attempt_mark::numeric(5, 2)
  end;

  select
    plan_items.course_id,
    plan_items.academic_year_id,
    plan_items.planned_calendar_year,
    plan_items.planned_period_code
  into
    selected_course_id,
    selected_academic_year_id,
    selected_calendar_year,
    selected_period_code
  from public.plan_items
  join public.plans on plans.id = plan_items.plan_id
  where plan_items.id = p_plan_item_id
    and plan_items.owner_id = user_id
    and plans.owner_id = user_id
  for update of plan_items;

  if selected_course_id is null then
    raise exception using errcode = 'P0002', message = 'Plan item not found.';
  end if;

  if selected_calendar_year is null or selected_period_code is null then
    raise exception using
      errcode = '22023',
      message = 'Schedule the course in an academic period before recording an attempt.';
  end if;

  select academic_periods.id
  into selected_period_id
  from public.academic_periods
  where academic_periods.calendar_year = selected_calendar_year
    and academic_periods.code = selected_period_code;

  if selected_period_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The academic period is not available for recorded history.';
  end if;

  select
    course_attempts.id,
    course_attempts.course_snapshot_id,
    course_attempts.units_attempted
  into
    existing_attempt_id,
    existing_snapshot_id,
    existing_attempted_units
  from public.course_attempts
  where course_attempts.owner_id = user_id
    and course_attempts.course_id = selected_course_id
    and course_attempts.academic_period_id = selected_period_id
  for update;

  if existing_attempt_id is not null then
    if p_units_attempted is not null
      and p_units_attempted <> existing_attempted_units
    then
      raise exception using
        errcode = '22023',
        message = 'Attempted units cannot change after an attempt is recorded.';
    end if;

    selected_snapshot_id := existing_snapshot_id;
    attempted_units := existing_attempted_units;
  else
    select
      course_snapshots.id,
      course_snapshots.unit_value_kind,
      course_snapshots.units,
      course_snapshots.minimum_units,
      course_snapshots.maximum_units
    into
      selected_snapshot_id,
      selected_unit_value_kind,
      selected_fixed_units,
      selected_minimum_units,
      selected_maximum_units
    from public.course_years
    join public.course_snapshots
      on course_snapshots.id = course_years.published_snapshot_id
    where course_years.course_id = selected_course_id
      and course_years.academic_year_id = selected_academic_year_id
      and course_years.lifecycle_status = 'active';

    if selected_snapshot_id is null then
      raise exception using
        errcode = 'P0002',
        message = 'The course has no published units for the attempted year.';
    end if;

    case selected_unit_value_kind
      when 'fixed' then
        if selected_fixed_units is null or selected_fixed_units <= 0 then
          raise exception using
            errcode = 'P0002',
            message = 'The course has no published units for the attempted year.';
        end if;

        if p_units_attempted is not null
          and p_units_attempted <> selected_fixed_units
        then
          raise exception using
            errcode = '22023',
            message = 'Attempted units must match the fixed course value.';
        end if;

        attempted_units := selected_fixed_units::numeric(5, 2);

      when 'range' then
        if p_units_attempted is null then
          raise exception using
            errcode = '22023',
            message = 'Choose the attempted units for this course.';
        end if;

        if selected_minimum_units is null
          or selected_maximum_units is null
          or selected_minimum_units <= 0
          or p_units_attempted < selected_minimum_units
          or p_units_attempted > selected_maximum_units
        then
          raise exception using
            errcode = '22023',
            message = 'Attempted units must be within the published course range.';
        end if;

        attempted_units := p_units_attempted::numeric(5, 2);

      when 'variable' then
        if p_units_attempted is null then
          raise exception using
            errcode = '22023',
            message = 'Choose the attempted units for this course.';
        end if;

        if not exists (
          select 1
          from public.course_unit_options
          where course_unit_options.course_snapshot_id = selected_snapshot_id
            and course_unit_options.units = p_units_attempted
        ) then
          raise exception using
            errcode = '22023',
            message = 'Attempted units must match a published course unit option.';
        end if;

        attempted_units := p_units_attempted::numeric(5, 2);

      else
        raise exception using
          errcode = 'P0002',
          message = 'The course has no published units for the attempted year.';
    end case;
  end if;

  insert into public.course_attempts (
    owner_id,
    course_id,
    course_snapshot_id,
    academic_period_id,
    status,
    mark,
    grade,
    units_attempted,
    units_earned,
    source
  ) values (
    user_id,
    selected_course_id,
    selected_snapshot_id,
    selected_period_id,
    p_attempt_status,
    normalised_mark,
    null,
    attempted_units,
    case when p_attempt_status = 'completed' then attempted_units else 0 end,
    'user_entered'
  )
  on conflict (owner_id, course_id, academic_period_id) do update
  set
    status = excluded.status,
    mark = excluded.mark,
    grade = null,
    units_earned = case
      when excluded.status = 'completed'
        then course_attempts.units_attempted
      else 0
    end,
    source = 'user_entered',
    updated_at = now()
  where course_attempts.units_attempted = excluded.units_attempted
  returning id into created_attempt_id;

  if created_attempt_id is null then
    raise exception using
      errcode = '22023',
      message = 'Attempted units cannot change after an attempt is recorded.';
  end if;

  delete from public.plan_items
  where plan_items.id = p_plan_item_id
    and plan_items.owner_id = user_id;

  return created_attempt_id;
end;
$function$;

revoke all on function public.add_current_user_plan_item(
  text, smallint, smallint, text
) from public, anon, authenticated, service_role;
revoke all on function public.move_current_user_plan_item(
  uuid, smallint, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.remove_current_user_plan_item(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.record_current_user_course_attempt(
  uuid, text, numeric, numeric
)
from public, anon, authenticated, service_role;

grant execute on function public.add_current_user_plan_item(
  text, smallint, smallint, text
) to authenticated;
grant execute on function public.move_current_user_plan_item(
  uuid, smallint, text, uuid
) to authenticated;
grant execute on function public.remove_current_user_plan_item(uuid)
to authenticated;
grant execute on function public.record_current_user_course_attempt(
  uuid, text, numeric, numeric
)
to authenticated;

-- A durable audit record is separate from field evidence. Confirming a draft
-- resolves only the blocking review rows named by the administrator; it does
-- not relabel model evidence or silently consume non-blocking review work.
create table public.course_snapshot_confirmations (
  id uuid primary key default gen_random_uuid(),
  course_year_id bigint not null,
  course_snapshot_id bigint not null,
  based_on_snapshot_id bigint not null,
  confirmed_by uuid not null,
  confirmation_note text not null,
  confirmed_at timestamptz not null default statement_timestamp(),
  constraint course_snapshot_confirmations_course_year_id_fkey
    foreign key (course_year_id) references public.course_years (id),
  constraint course_snapshot_confirmations_snapshot_id_fkey
    foreign key (course_snapshot_id) references public.course_snapshots (id),
  constraint course_snapshot_confirmations_base_snapshot_id_fkey
    foreign key (based_on_snapshot_id) references public.course_snapshots (id),
  constraint course_snapshot_confirmations_confirmed_by_fkey
    foreign key (confirmed_by) references auth.users (id),
  constraint course_snapshot_confirmations_snapshot_unique
    unique (course_snapshot_id),
  constraint course_snapshot_confirmations_note_check
    check (btrim(confirmation_note) <> '')
);

create table public.course_snapshot_confirmation_items (
  confirmation_id uuid not null,
  review_item_id uuid not null,
  primary key (confirmation_id, review_item_id),
  constraint course_snapshot_confirmation_items_confirmation_id_fkey
    foreign key (confirmation_id)
    references public.course_snapshot_confirmations (id) on delete cascade,
  constraint course_snapshot_confirmation_items_review_item_id_fkey
    foreign key (review_item_id) references public.course_review_items (id),
  constraint course_snapshot_confirmation_items_review_item_unique
    unique (review_item_id)
);

create index course_snapshot_confirmations_course_year_id_idx
  on public.course_snapshot_confirmations (course_year_id, confirmed_at desc);

alter table public.course_snapshot_confirmations enable row level security;
alter table public.course_snapshot_confirmation_items enable row level security;

create policy course_snapshot_confirmations_admin_read
on public.course_snapshot_confirmations
for select
to authenticated
using ((select private.has_permission('courses.write')));

create policy course_snapshot_confirmation_items_admin_read
on public.course_snapshot_confirmation_items
for select
to authenticated
using (
  exists (
    select 1
    from public.course_snapshot_confirmations as confirmations
    where confirmations.id = course_snapshot_confirmation_items.confirmation_id
  )
  and (select private.has_permission('courses.write'))
);

revoke all on table
  public.course_snapshot_confirmations,
  public.course_snapshot_confirmation_items
from public, anon, authenticated;
grant select on table
  public.course_snapshot_confirmations,
  public.course_snapshot_confirmation_items
to authenticated;
grant all on table
  public.course_snapshot_confirmations,
  public.course_snapshot_confirmation_items
to service_role;

-- A recorded attempt pins the exact snapshot that was used for the result.
-- Its owner must retain access to every canonical child row for that snapshot
-- after a different snapshot is published or the course year is archived.
do $block$
declare
  table_name text;
begin
  foreach table_name in array array[
    'course_fees',
    'course_areas_of_interest',
    'course_related_courses',
    'course_attributes',
    'course_unit_options',
    'course_offerings',
    'offering_sessions',
    'course_learning_outcomes',
    'course_assessment_items',
    'course_assessment_outcomes',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions',
    'course_rule_condition_courses',
    'course_rule_course_references'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated '
      || 'using (exists ('
      || 'select 1 from public.course_attempts '
      || 'where course_attempts.course_snapshot_id = %I.course_snapshot_id '
      || 'and course_attempts.owner_id = (select auth.uid())'
      || '))',
      table_name || '_read_own_attempt_snapshots',
      table_name,
      table_name
    );
  end loop;
end;
$block$;

-- Historical projections can contain course identities that are no longer
-- named by the current published snapshot. Keep those identity codes visible
-- only to the owner of the attempt that pins the historical snapshot.
create policy courses_read_own_attempt_history
on public.courses
for select
to authenticated
using (
  exists (
    select 1
    from public.course_attempts
    where course_attempts.course_id = courses.id
      and course_attempts.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.course_rule_conditions as conditions
    join public.course_attempts as attempts
      on attempts.course_snapshot_id = conditions.course_snapshot_id
    where conditions.required_course_id = courses.id
      and attempts.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.course_rule_condition_courses as members
    join public.course_attempts as attempts
      on attempts.course_snapshot_id = members.course_snapshot_id
    where members.referenced_course_id = courses.id
      and attempts.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.course_rule_course_references as rule_references
    join public.course_attempts as attempts
      on attempts.course_snapshot_id = rule_references.course_snapshot_id
    where rule_references.referenced_course_id = courses.id
      and attempts.owner_id = (select auth.uid())
  )
);

-- The planner needs one exact relational projection per historical attempt,
-- not a historical heading combined with current published rich fields. This
-- SECURITY DEFINER boundary accepts only snapshots pinned by the caller's own
-- attempts and reuses the canonical projection used by review and publishing.
create function public.current_user_course_attempt_snapshot_projections(
  p_snapshot_ids bigint[]
)
returns table (
  snapshot_id bigint,
  projection jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
begin
  if user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_snapshot_ids is null then
    raise exception 'Snapshot IDs are required.' using errcode = '22023';
  end if;
  if cardinality(p_snapshot_ids) > 200 then
    raise exception 'At most 200 snapshot IDs may be requested.'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(p_snapshot_ids) as requested(requested_snapshot_id)
    where requested.requested_snapshot_id is null
  ) then
    raise exception 'Snapshot IDs cannot contain null values.'
      using errcode = '22023';
  end if;

  return query
  with owned_snapshots as (
    select snapshots.id as selected_snapshot_id
    from public.course_snapshots as snapshots
    where snapshots.id = any(p_snapshot_ids)
      and exists (
        select 1
        from public.course_attempts as attempts
        where attempts.course_snapshot_id = snapshots.id
          and attempts.owner_id = user_id
      )
  ),
  base_projections as (
    select
      owned_snapshots.selected_snapshot_id,
      private.course_snapshot_projection(
        owned_snapshots.selected_snapshot_id
      ) as canonical_projection
    from owned_snapshots
  )
  select
    base_projections.selected_snapshot_id,
    base_projections.canonical_projection || jsonb_build_object(
      'rules', coalesce((
        select jsonb_agg(
          rule_entries.value || jsonb_build_object(
            'reviewState', rules.review_state,
            'confidence', rules.confidence
          )
          order by rule_entries.position
        )
        from jsonb_array_elements(
          base_projections.canonical_projection -> 'rules'
        ) with ordinality as rule_entries(value, position)
        join public.course_rules as rules
          on rules.course_snapshot_id = base_projections.selected_snapshot_id
         and rules.rule_kind = rule_entries.value ->> 'ruleKind'
      ), '[]'::jsonb),
      'ruleConditions', coalesce((
        select jsonb_agg(
          condition_entries.value || jsonb_build_object(
            'reviewState', conditions.review_state,
            'confidence', conditions.confidence
          )
          order by condition_entries.position
        )
        from jsonb_array_elements(
          base_projections.canonical_projection -> 'ruleConditions'
        ) with ordinality as condition_entries(value, position)
        join public.course_rule_conditions as conditions
          on conditions.course_snapshot_id = base_projections.selected_snapshot_id
         and conditions.projection_key = condition_entries.value ->> 'key'
      ), '[]'::jsonb),
      'ruleCourseReferences', coalesce((
        select jsonb_agg(
          reference_entries.value || jsonb_build_object(
            'reviewState', rule_references.review_state,
            'confidence', rule_references.confidence
          )
          order by reference_entries.position
        )
        from jsonb_array_elements(
          base_projections.canonical_projection -> 'ruleCourseReferences'
        ) with ordinality as reference_entries(value, position)
        join public.course_rules as rules
          on rules.course_snapshot_id = base_projections.selected_snapshot_id
         and rules.rule_kind = reference_entries.value ->> 'ruleKey'
        join public.courses as referenced_courses
          on referenced_courses.code =
            reference_entries.value ->> 'referencedCourseCode'
        join public.course_rule_course_references as rule_references
          on rule_references.course_rule_id = rules.id
         and rule_references.course_snapshot_id =
           base_projections.selected_snapshot_id
         and rule_references.referenced_course_id = referenced_courses.id
      ), '[]'::jsonb),
      'prerequisiteCodes', coalesce((
        select jsonb_agg(prerequisites.code order by prerequisites.code)
        from (
          select referenced_courses.code
          from public.course_rule_course_references as rule_references
          join public.course_rules as rules
            on rules.id = rule_references.course_rule_id
          join public.courses as referenced_courses
            on referenced_courses.id = rule_references.referenced_course_id
          where rules.course_snapshot_id =
              base_projections.selected_snapshot_id
            and rules.rule_kind = 'prerequisite'

          union

          select required_courses.code
          from public.course_rule_conditions as conditions
          join public.course_rules as rules
            on rules.id = conditions.course_rule_id
          join public.courses as required_courses
            on required_courses.id = conditions.required_course_id
          where rules.course_snapshot_id =
              base_projections.selected_snapshot_id
            and rules.rule_kind = 'prerequisite'
            and conditions.condition_kind = 'course'

          union

          select members.source_course_code
          from public.course_rule_condition_courses as members
          join public.course_rule_conditions as conditions
            on conditions.id = members.condition_id
          join public.course_rules as rules
            on rules.id = conditions.course_rule_id
          where rules.course_snapshot_id =
              base_projections.selected_snapshot_id
            and rules.rule_kind = 'prerequisite'
        ) as prerequisites(code)
      ), '[]'::jsonb)
    )
  from base_projections
  order by base_projections.selected_snapshot_id;
end;
$function$;

revoke all on function public.current_user_course_attempt_snapshot_projections(bigint[])
from public, anon, authenticated, service_role;
grant execute on function public.current_user_course_attempt_snapshot_projections(bigint[])
to authenticated;

comment on function public.current_user_course_attempt_snapshot_projections(bigint[]) is
  'Returns canonical relational projections only for snapshots pinned by the current user''s recorded attempts.';

-- A transaction-scoped, unguessable capability distinguishes the explicit
-- confirmation RPC from an ordinary manual save. The table is private and has
-- no API grants; the token is removed before the RPC returns.
create table private.course_snapshot_confirmation_contexts (
  token uuid primary key default gen_random_uuid(),
  transaction_id bigint not null,
  actor_id uuid not null,
  base_snapshot_id bigint not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint course_snapshot_confirmation_contexts_actor_id_fkey
    foreign key (actor_id) references auth.users (id),
  constraint course_snapshot_confirmation_contexts_base_snapshot_id_fkey
    foreign key (base_snapshot_id) references public.course_snapshots (id)
);

revoke all on table private.course_snapshot_confirmation_contexts
from public, anon, authenticated, service_role;

create or replace function private.preserve_manual_snapshot_review_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  base_has_critical_uncertainty boolean;
  confirmation_token uuid;
  confirmation_is_valid boolean := false;
begin
  if new.origin <> 'manual_edit' or new.based_on_snapshot_id is null then
    return new;
  end if;

  select snapshots.has_critical_uncertainty
  into base_has_critical_uncertainty
  from public.course_snapshots as snapshots
  where snapshots.id = new.based_on_snapshot_id;

  if not coalesce(base_has_critical_uncertainty, false) then
    return new;
  end if;

  begin
    confirmation_token := nullif(
      current_setting('coursemap.course_snapshot_confirmation_token', true),
      ''
    )::uuid;
  exception
    when invalid_text_representation then
      confirmation_token := null;
  end;

  if confirmation_token is not null then
    select exists (
      select 1
      from private.course_snapshot_confirmation_contexts as contexts
      where contexts.token = confirmation_token
        and contexts.transaction_id = txid_current()
        and contexts.actor_id = (select auth.uid())
        and contexts.base_snapshot_id = new.based_on_snapshot_id
    ) into confirmation_is_valid;
  end if;

  -- Ordinary saves inherit uncertainty. Only the explicit confirmation RPC
  -- can create a descendant with the critical flag cleared.
  new.has_critical_uncertainty := not confirmation_is_valid;
  return new;
end;
$function$;

revoke all on function private.preserve_manual_snapshot_review_state()
from public, anon, authenticated, service_role;

create trigger course_snapshots_preserve_manual_review_state
before insert on public.course_snapshots
for each row execute function private.preserve_manual_snapshot_review_state();

create or replace function private.preserve_manual_snapshot_source_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  base_snapshot_id bigint;
  base_evidence public.course_snapshot_field_evidence;
begin
  select snapshots.based_on_snapshot_id
  into base_snapshot_id
  from public.course_snapshots as snapshots
  where snapshots.id = new.course_snapshot_id
    and snapshots.origin = 'manual_edit';

  if base_snapshot_id is null then
    return new;
  end if;

  -- The 140000 persistence implementation used this synthetic root row for a
  -- blanket confirmation. Explicit confirmation is now represented by the
  -- confirmation audit tables, so the synthetic evidence must not be stored.
  if new.entity_kind = 'manual_edit'
    and new.entity_key = 'root'
    and new.field_key = '$'
    and new.note =
      'Administrator confirmed the complete critical snapshot while creating this manual draft.'
  then
    return null;
  end if;

  -- When the persistence implementation attempts to relabel every inherited
  -- field, restore the exact evidence from the base snapshot. Newly edited
  -- field paths use a different note and retain their human-confirmed state.
  if new.note =
    'Administrator confirmed this evidence while clearing critical uncertainty.'
  then
    select evidence.*
    into base_evidence
    from public.course_snapshot_field_evidence as evidence
    where evidence.course_snapshot_id = base_snapshot_id
      and evidence.entity_kind = new.entity_kind
      and evidence.entity_key = new.entity_key
      and evidence.field_key = new.field_key;

    if found then
      new.academic_year_id := base_evidence.academic_year_id;
      new.source_page_id := base_evidence.source_page_id;
      new.importance := base_evidence.importance;
      new.extraction_state := base_evidence.extraction_state;
      new.confidence := base_evidence.confidence;
      new.confidence_band := base_evidence.confidence_band;
      new.verification_status := base_evidence.verification_status;
      new.source_locator := base_evidence.source_locator;
      new.evidence_excerpt := base_evidence.evidence_excerpt;
      new.note := base_evidence.note;
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.preserve_manual_snapshot_source_evidence()
from public, anon, authenticated, service_role;

create trigger course_snapshot_field_evidence_preserve_manual_source
before insert on public.course_snapshot_field_evidence
for each row execute function private.preserve_manual_snapshot_source_evidence();

create or replace function private.prevent_implicit_course_review_resolution()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status = 'open'
    and new.status = 'accepted'
    and new.resolution_note like
      'Superseded by administrator-confirmed manual snapshot %'
  then
    return null;
  end if;

  return new;
end;
$function$;

revoke all on function private.prevent_implicit_course_review_resolution()
from public, anon, authenticated, service_role;

create trigger course_review_items_prevent_implicit_resolution
before update on public.course_review_items
for each row execute function private.prevent_implicit_course_review_resolution();

-- Keep the complete relational persistence functions private. The public
-- wrappers below add review semantics without duplicating the large canonical
-- projection writer introduced in 140000.
alter function public.create_course_manual_snapshot(bigint, bigint, jsonb)
  set schema private;
alter function private.create_course_manual_snapshot(bigint, bigint, jsonb)
  rename to persist_course_manual_snapshot;
revoke all on function private.persist_course_manual_snapshot(bigint, bigint, jsonb)
from public, anon, authenticated, service_role;

alter function public.publish_course_snapshot(bigint, bigint, bigint)
  set schema private;
alter function private.publish_course_snapshot(bigint, bigint, bigint)
  rename to perform_publish_course_snapshot;
revoke all on function private.perform_publish_course_snapshot(bigint, bigint, bigint)
from public, anon, authenticated, service_role;

create or replace function public.create_course_manual_snapshot(
  p_course_year_id bigint,
  p_expected_base_snapshot_id bigint,
  p_projection jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_course_year public.course_years;
  base_snapshot_id bigint;
  base_projection jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if not (select private.has_permission('courses.write')) then
    raise exception 'Course write permission is required.' using errcode = '42501';
  end if;

  select course_years.*
  into selected_course_year
  from public.course_years as course_years
  where course_years.id = p_course_year_id
  for update;

  if not found then
    raise exception 'The course year was not found.' using errcode = 'P0002';
  end if;

  base_snapshot_id := coalesce(
    selected_course_year.draft_snapshot_id,
    selected_course_year.published_snapshot_id
  );
  if base_snapshot_id is distinct from p_expected_base_snapshot_id then
    raise exception 'The course draft changed while it was being edited.'
      using errcode = '40001';
  end if;

  base_projection := private.course_snapshot_projection(base_snapshot_id);
  if p_projection = base_projection then
    raise exception 'No canonical course fields changed.' using errcode = '22023';
  end if;

  return private.persist_course_manual_snapshot(
    p_course_year_id,
    p_expected_base_snapshot_id,
    p_projection
  );
end;
$function$;

create or replace function public.confirm_course_manual_snapshot(
  p_course_year_id bigint,
  p_expected_base_snapshot_id bigint,
  p_projection jsonb,
  p_blocking_review_item_ids uuid[],
  p_confirmation_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  selected_course_year public.course_years;
  selected_base_snapshot public.course_snapshots;
  base_snapshot_id bigint;
  expected_blocking_ids uuid[];
  supplied_blocking_ids uuid[];
  confirmation_token uuid;
  confirmation_id uuid;
  confirmed_snapshot_id bigint;
begin
  if actor_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if not (select private.has_permission('courses.write')) then
    raise exception 'Course write permission is required.' using errcode = '42501';
  end if;
  if nullif(btrim(p_confirmation_note), '') is null then
    raise exception 'A confirmation note is required.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_blocking_review_item_ids, '{}'::uuid[]))
      as supplied(review_item_id)
    where supplied.review_item_id is null
  ) then
    raise exception 'Blocking review item IDs cannot contain null.'
      using errcode = '22023';
  end if;

  select coalesce(
    array_agg(distinct supplied.review_item_id order by supplied.review_item_id),
    '{}'::uuid[]
  )
  into supplied_blocking_ids
  from unnest(coalesce(p_blocking_review_item_ids, '{}'::uuid[]))
    as supplied(review_item_id);

  if cardinality(supplied_blocking_ids)
    <> cardinality(coalesce(p_blocking_review_item_ids, '{}'::uuid[]))
  then
    raise exception 'Blocking review item IDs must be unique.'
      using errcode = '22023';
  end if;

  select course_years.*
  into selected_course_year
  from public.course_years as course_years
  where course_years.id = p_course_year_id
  for update;

  if not found then
    raise exception 'The course year was not found.' using errcode = 'P0002';
  end if;
  if selected_course_year.lifecycle_status <> 'active' then
    raise exception 'Archived course years cannot be edited.' using errcode = '55000';
  end if;

  base_snapshot_id := selected_course_year.draft_snapshot_id;
  if base_snapshot_id is null then
    raise exception 'Only the current draft can be explicitly confirmed.'
      using errcode = '55000';
  end if;
  if base_snapshot_id is distinct from p_expected_base_snapshot_id then
    raise exception 'The course draft changed while it was being confirmed.'
      using errcode = '40001';
  end if;

  select snapshots.*
  into selected_base_snapshot
  from public.course_snapshots as snapshots
  where snapshots.id = base_snapshot_id
    and snapshots.course_year_id = p_course_year_id;

  if not found or selected_base_snapshot.sealed_at is null then
    raise exception 'The current course snapshot is not sealed.'
      using errcode = '55000';
  end if;

  with recursive snapshot_ancestry as (
    select snapshots.id, snapshots.based_on_snapshot_id
    from public.course_snapshots as snapshots
    where snapshots.id = base_snapshot_id

    union all

    select parents.id, parents.based_on_snapshot_id
    from public.course_snapshots as parents
    join snapshot_ancestry
      on snapshot_ancestry.based_on_snapshot_id = parents.id
  )
  select coalesce(array_agg(reviews.id order by reviews.id), '{}'::uuid[])
  into expected_blocking_ids
  from public.course_review_items as reviews
  join snapshot_ancestry on snapshot_ancestry.id = reviews.course_snapshot_id
  where reviews.status = 'open'
    and reviews.is_blocking;

  if supplied_blocking_ids is distinct from expected_blocking_ids then
    raise exception
      'The blocking review selection changed. Refresh and confirm the exact open items.'
      using errcode = '40001';
  end if;

  if not selected_base_snapshot.has_critical_uncertainty
    and cardinality(expected_blocking_ids) = 0
  then
    raise exception 'The current draft has no blocking review work to confirm.'
      using errcode = '22023';
  end if;

  update public.course_review_items
  set
    status = 'accepted',
    resolved_by = actor_id,
    resolved_at = statement_timestamp(),
    resolution_note = btrim(p_confirmation_note)
  where course_review_items.id = any(expected_blocking_ids)
    and course_review_items.status = 'open'
    and course_review_items.is_blocking;

  if not selected_base_snapshot.has_critical_uncertainty
    and p_projection = private.course_snapshot_projection(base_snapshot_id)
  then
    -- Resolving blockers does not create a content-identical snapshot when no
    -- critical uncertainty remains. The current sealed draft is still exact.
    confirmed_snapshot_id := base_snapshot_id;
  else
    insert into private.course_snapshot_confirmation_contexts (
      transaction_id,
      actor_id,
      base_snapshot_id
    ) values (
      txid_current(),
      actor_id,
      base_snapshot_id
    )
    returning token into confirmation_token;

    perform set_config(
      'coursemap.course_snapshot_confirmation_token',
      confirmation_token::text,
      true
    );

    confirmed_snapshot_id := private.persist_course_manual_snapshot(
      p_course_year_id,
      p_expected_base_snapshot_id,
      p_projection
    );
  end if;

  insert into public.course_snapshot_confirmations (
    course_year_id,
    course_snapshot_id,
    based_on_snapshot_id,
    confirmed_by,
    confirmation_note
  ) values (
    p_course_year_id,
    confirmed_snapshot_id,
    base_snapshot_id,
    actor_id,
    btrim(p_confirmation_note)
  )
  returning id into confirmation_id;

  insert into public.course_snapshot_confirmation_items (
    confirmation_id,
    review_item_id
  )
  select confirmation_id, review_item_id
  from unnest(expected_blocking_ids) as selected(review_item_id);

  if confirmation_token is not null then
    delete from private.course_snapshot_confirmation_contexts as contexts
    where contexts.token = confirmation_token;
    perform set_config('coursemap.course_snapshot_confirmation_token', '', true);
  end if;

  return jsonb_build_object(
    'confirmationId', confirmation_id,
    'courseYearId', p_course_year_id,
    'snapshotId', confirmed_snapshot_id,
    'draftSnapshotId', confirmed_snapshot_id,
    'publishedSnapshotId', selected_course_year.published_snapshot_id,
    'basedOnSnapshotId', base_snapshot_id,
    'confirmedReviewItemIds', to_jsonb(expected_blocking_ids)
  );
end;
$function$;

create or replace function public.publish_course_snapshot(
  p_course_year_id bigint,
  p_snapshot_id bigint,
  p_expected_published_snapshot_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if not (select private.has_permission('courses.write')) then
    raise exception 'Course write permission is required.' using errcode = '42501';
  end if;

  if exists (
    with recursive snapshot_ancestry as (
      select snapshots.id, snapshots.based_on_snapshot_id
      from public.course_snapshots as snapshots
      where snapshots.id = p_snapshot_id

      union all

      select parents.id, parents.based_on_snapshot_id
      from public.course_snapshots as parents
      join snapshot_ancestry
        on snapshot_ancestry.based_on_snapshot_id = parents.id
    )
    select 1
    from public.course_review_items as reviews
    join snapshot_ancestry on snapshot_ancestry.id = reviews.course_snapshot_id
    where reviews.status = 'open'
      and reviews.is_blocking
  ) then
    raise exception 'Resolve blocking review items before publishing this course.'
      using errcode = '55000';
  end if;

  return private.perform_publish_course_snapshot(
    p_course_year_id,
    p_snapshot_id,
    p_expected_published_snapshot_id
  );
end;
$function$;

revoke all on function public.create_course_manual_snapshot(bigint, bigint, jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.confirm_course_manual_snapshot(
  bigint, bigint, jsonb, uuid[], text
) from public, anon, authenticated, service_role;
revoke all on function public.publish_course_snapshot(bigint, bigint, bigint)
from public, anon, authenticated, service_role;

grant execute on function public.create_course_manual_snapshot(bigint, bigint, jsonb)
to authenticated;
grant execute on function public.confirm_course_manual_snapshot(
  bigint, bigint, jsonb, uuid[], text
) to authenticated;
grant execute on function public.publish_course_snapshot(bigint, bigint, bigint)
to authenticated;

comment on function public.create_course_manual_snapshot(bigint, bigint, jsonb) is
  'Saves changed canonical fields as a sealed draft while preserving inherited uncertainty, source evidence and review work.';
comment on function public.confirm_course_manual_snapshot(
  bigint, bigint, jsonb, uuid[], text
) is
  'Explicitly confirms the exact current draft and exact open blocking review rows, records an audit note and returns refreshed snapshot pointers.';
comment on function public.publish_course_snapshot(bigint, bigint, bigint) is
  'Publishes the exact current reviewed draft only when no blocking item remains in its snapshot ancestry.';

commit;
