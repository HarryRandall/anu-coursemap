-- Link published minors and specialisations to student plans without adding a
-- second structure-selection model. A plan continues to have one programme
-- and at most one major, while minors and specialisations are repeatable.

drop function public.save_current_user_primary_plan(
  text,
  text,
  smallint,
  smallint,
  text,
  text,
  text
);

create function private.validate_plan_structure_kind()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_kind text;
begin
  select structures.kind
  into selected_kind
  from public.academic_structure_years as structure_years
  join public.academic_structures as structures
    on structures.id = structure_years.structure_id
  where structure_years.id = new.structure_year_id;

  if selected_kind is not null and selected_kind is distinct from new.role then
    raise exception using
      errcode = '23514',
      message = 'The plan structure role must match the academic structure kind.';
  end if;

  return new;
end;
$$;

create trigger plan_structures_validate_kind
before insert or update of structure_year_id, role
on public.plan_structures
for each row execute function private.validate_plan_structure_kind();

create unique index plan_structures_one_major_idx
on public.plan_structures (plan_id)
where role = 'major';

create function public.save_current_user_primary_plan(
  p_display_name text,
  p_student_number text,
  p_academic_year smallint,
  p_commencement_year smallint,
  p_study_load text,
  p_programme_code text,
  p_major_code text default null,
  p_minor_codes text[] default '{}'::text[],
  p_specialisation_codes text[] default '{}'::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  user_id uuid := auth.uid();
  selected_academic_year_id bigint;
  selected_plan_id uuid;
  existing_plan_id uuid;
  selected_programme_year_id bigint;
  selected_programme_snapshot_id bigint;
  selected_programme_units numeric;
  selected_programme_duration_years numeric;
  selected_structure record;
  selected_structure_year_id bigint;
  inserted_structure_count integer;
  expected_structure_count integer;
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;
  if nullif(btrim(p_display_name), '') is null then
    raise exception using errcode = '22023', message = 'Display name is required.';
  end if;

  p_major_code := nullif(upper(btrim(p_major_code)), '');
  p_minor_codes := coalesce(p_minor_codes, '{}'::text[]);
  p_specialisation_codes := coalesce(p_specialisation_codes, '{}'::text[]);

  if exists (
    select 1
    from unnest(p_minor_codes || p_specialisation_codes) as requested(code)
    where nullif(btrim(requested.code), '') is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'Selected minor and specialisation codes cannot be blank.';
  end if;

  select coalesce(
    array_agg(upper(btrim(requested.code)) order by requested.position),
    '{}'::text[]
  )
  into p_minor_codes
  from unnest(p_minor_codes) with ordinality as requested(code, position);

  select coalesce(
    array_agg(upper(btrim(requested.code)) order by requested.position),
    '{}'::text[]
  )
  into p_specialisation_codes
  from unnest(p_specialisation_codes) with ordinality as requested(code, position);

  if exists (
    select 1
    from (
      select p_major_code as code where p_major_code is not null
      union all
      select code from unnest(p_minor_codes) as minors(code)
      union all
      select code from unnest(p_specialisation_codes) as specialisations(code)
    ) as requested
    group by requested.code
    having count(*) > 1
  ) then
    raise exception using
      errcode = '22023',
      message = 'Select each academic structure only once.';
  end if;

  select years.id
  into selected_academic_year_id
  from public.academic_years as years
  where years.year = p_academic_year;
  if selected_academic_year_id is null then
    raise exception using errcode = 'P0002', message = 'The selected academic year is not available.';
  end if;

  select
    structure_years.id,
    structure_years.published_snapshot_id,
    snapshots.units,
    snapshots.duration_years
  into
    selected_programme_year_id,
    selected_programme_snapshot_id,
    selected_programme_units,
    selected_programme_duration_years
  from public.academic_structure_years as structure_years
  join public.academic_structures as structures
    on structures.id = structure_years.structure_id
  join public.academic_structure_snapshots as snapshots
    on snapshots.id = structure_years.published_snapshot_id
  where structures.code = upper(btrim(p_programme_code))
    and structures.kind = 'programme'
    and structure_years.academic_year_id = selected_academic_year_id
    and structure_years.published_snapshot_id is not null
  limit 1;
  if selected_programme_year_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected programme is not published for that academic year.';
  end if;
  if selected_programme_units is null
     and selected_programme_duration_years is null then
    raise exception using
      errcode = '22023',
      message = 'The selected programme does not include duration or unit information for planning.';
  end if;

  for selected_structure in
    select
      'major'::text as role,
      p_major_code as code,
      1::integer as position
    where p_major_code is not null
    union all
    select
      'minor'::text,
      requested.code,
      requested.position::integer
        + case when p_major_code is null then 0 else 1 end
    from unnest(p_minor_codes) with ordinality as requested(code, position)
    union all
    select
      'specialisation'::text,
      requested.code,
      requested.position::integer
        + case when p_major_code is null then 0 else 1 end
        + cardinality(p_minor_codes)
    from unnest(p_specialisation_codes) with ordinality as requested(code, position)
    order by position
  loop
    selected_structure_year_id := null;

    select structure_years.id
    into selected_structure_year_id
    from public.academic_structure_years as structure_years
    join public.academic_structures as structures
      on structures.id = structure_years.structure_id
    where structures.code = selected_structure.code
      and structures.kind = selected_structure.role
      and structure_years.academic_year_id = selected_academic_year_id
      and structure_years.published_snapshot_id is not null
    limit 1;

    if selected_structure_year_id is null then
      raise exception using
        errcode = 'P0002',
        message = format(
          'The selected %s is not published for that academic year.',
          selected_structure.role
        );
    end if;

    if not exists (
      select 1
      from public.academic_structure_snapshot_relationships as relationships
      where relationships.snapshot_id = selected_programme_snapshot_id
        and relationships.relationship_kind in ('required', 'option')
        and relationships.target_kind = selected_structure.role
        and relationships.target_code = selected_structure.code
    ) and not exists (
      select 1
      from public.academic_structure_requirement_options as options
      join public.academic_structure_requirement_conditions as conditions
        on conditions.id = options.requirement_condition_id
       and conditions.snapshot_id = options.snapshot_id
      where options.snapshot_id = selected_programme_snapshot_id
        and conditions.condition_kind = 'structure_list'
        and conditions.structure_kind = selected_structure.role
        and options.option_kind = 'structure'
        and options.structure_kind = selected_structure.role
        and options.option_code = selected_structure.code
    ) then
      raise exception using
        errcode = '22023',
        message = format(
          'The selected %s is not an explicit option for that programme.',
          selected_structure.role
        );
    end if;
  end loop;

  update public.profiles
  set
    display_name = btrim(p_display_name),
    student_number = nullif(lower(btrim(p_student_number)), '')
  where id = user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'The authenticated profile is missing.';
  end if;

  select plans.id
  into existing_plan_id
  from public.plans
  where plans.owner_id = user_id and plans.is_primary
  for update;

  if existing_plan_id is not null then
    delete from public.plan_structures
    where plan_id = existing_plan_id and owner_id = user_id;
  end if;

  insert into public.plans (
    owner_id,
    academic_year_id,
    name,
    is_primary,
    status,
    commencement_year,
    study_load
  ) values (
    user_id,
    selected_academic_year_id,
    upper(btrim(p_programme_code)) || ' plan',
    true,
    'active',
    p_commencement_year,
    p_study_load
  )
  on conflict (owner_id) where is_primary do update
  set
    academic_year_id = excluded.academic_year_id,
    name = excluded.name,
    status = 'active',
    commencement_year = excluded.commencement_year,
    study_load = excluded.study_load,
    updated_at = now()
  returning id into selected_plan_id;

  insert into public.plan_structures (
    plan_id,
    owner_id,
    academic_year_id,
    structure_year_id,
    role,
    position
  ) values (
    selected_plan_id,
    user_id,
    selected_academic_year_id,
    selected_programme_year_id,
    'programme',
    0
  );

  insert into public.plan_structures (
    plan_id,
    owner_id,
    academic_year_id,
    structure_year_id,
    role,
    position
  )
  select
    selected_plan_id,
    user_id,
    selected_academic_year_id,
    structure_years.id,
    requested.role,
    requested.position
  from (
    select
      'major'::text as role,
      p_major_code as code,
      1::integer as position
    where p_major_code is not null
    union all
    select
      'minor'::text,
      minors.code,
      minors.position::integer
        + case when p_major_code is null then 0 else 1 end
    from unnest(p_minor_codes) with ordinality as minors(code, position)
    union all
    select
      'specialisation'::text,
      specialisations.code,
      specialisations.position::integer
        + case when p_major_code is null then 0 else 1 end
        + cardinality(p_minor_codes)
    from unnest(p_specialisation_codes) with ordinality
      as specialisations(code, position)
  ) as requested
  join public.academic_structures as structures
    on structures.code = requested.code
   and structures.kind = requested.role
  join public.academic_structure_years as structure_years
    on structure_years.structure_id = structures.id
   and structure_years.academic_year_id = selected_academic_year_id
   and structure_years.published_snapshot_id is not null
  order by requested.position;

  get diagnostics inserted_structure_count = row_count;
  expected_structure_count :=
    case when p_major_code is null then 0 else 1 end
    + cardinality(p_minor_codes)
    + cardinality(p_specialisation_codes);

  if inserted_structure_count <> expected_structure_count then
    raise exception using
      errcode = '40001',
      message = 'A selected academic structure changed while the plan was being saved. Please try again.';
  end if;

  return selected_plan_id;
end;
$$;

revoke all on function private.validate_plan_structure_kind()
from public, anon, authenticated, service_role;

revoke all on function public.save_current_user_primary_plan(
  text,
  text,
  smallint,
  smallint,
  text,
  text,
  text,
  text[],
  text[]
)
from public, anon, authenticated, service_role;

grant execute on function public.save_current_user_primary_plan(
  text,
  text,
  smallint,
  smallint,
  text,
  text,
  text,
  text[],
  text[]
)
to authenticated;
