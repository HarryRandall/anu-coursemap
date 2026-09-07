create or replace function public.cancel_academic_structure_import(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_target_id uuid;
begin
  if auth.uid() is null or not private.has_permission('imports.manage') then
    raise exception using errcode = '42501', message = 'Import permission is required.';
  end if;
  perform 1 from public.academic_structure_import_runs where id = p_run_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'The import run was not found.';
  end if;

  -- A worker can hold a target while saving its result. Do not wait for that
  -- target while holding the run lock; let the administrator retry instead.
  for selected_target_id in
    select id from public.academic_structure_import_targets
    where run_id = p_run_id and processing_status in ('queued', 'running')
    order by id for update nowait
  loop
    update public.academic_structure_import_targets
    set processing_status = 'cancelled', review_status = 'not_required',
        worker_id = null, lease_expires_at = null, lock_version = lock_version + 1,
        error_code = 'IMPORT_CANCELLED',
        error_summary = 'The import run was stopped by an administrator.',
        finished_at = statement_timestamp(), updated_at = now()
    where id = selected_target_id;

    update public.academic_structure_import_stages
    set status = 'skipped', completed_at = statement_timestamp(), updated_at = now()
    where academic_structure_import_stages.target_id = selected_target_id
      and status in ('pending', 'running');
    perform private.abandon_academic_structure_import_review_items(
      selected_target_id, 'The import run was stopped by an administrator.'
    );
  end loop;
  perform private.refresh_academic_structure_import_run(p_run_id);
end;
$$;

revoke all on function public.cancel_academic_structure_import(uuid) from public, anon, service_role;
grant execute on function public.cancel_academic_structure_import(uuid) to authenticated;

create or replace function public.start_academic_structure_import(
  p_academic_year smallint,
  p_structure_kind text,
  p_structure_codes text[],
  p_requested_model text,
  p_parser_version text,
  p_prompt_version text,
  p_schema_version text
)
returns table (
  run_id uuid,
  run_number bigint,
  target_id uuid,
  target_position smallint,
  structure_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  selected_year_id bigint;
  selected_source_id bigint;
  created_run_id uuid;
  created_run_number bigint;
  code_count integer;
begin
  if actor is null or not private.has_permission('imports.manage') then
    raise exception using errcode = '42501', message = 'Import permission is required.';
  end if;
  if p_structure_kind not in ('programme', 'major', 'minor', 'specialisation') then
    raise exception using errcode = '22023', message = 'Choose a supported academic structure type.';
  end if;
  if p_academic_year < 2020 or p_academic_year > 2030 then
    raise exception using errcode = '22023', message = 'Choose an academic year from 2020 to 2030.';
  end if;
  code_count := coalesce(array_length(p_structure_codes, 1), 0);
  if code_count < 1 or code_count > 10 then
    raise exception using errcode = '22023', message = 'Choose between one and ten entries.';
  end if;
  if exists (
    select 1 from unnest(p_structure_codes) as code
    where code is null or upper(btrim(code)) !~ '^[A-Z0-9][A-Z0-9-]{1,31}$'
  ) or (
    select count(distinct upper(btrim(code))) from unnest(p_structure_codes) as code
  ) <> code_count then
    raise exception using errcode = '22023', message = 'Choose distinct valid academic structure codes.';
  end if;

  -- Turn the friendly one-active-run check into a serial decision. The unique
  -- partial index remains the final invariant if another write path is added.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('academic-structure-import-active-run', 0)
  );
  perform public.reconcile_academic_structure_import_dispatch(runs.id)
  from public.academic_structure_import_runs as runs
  where runs.status in ('queued', 'running');

  if exists (
    select 1 from public.academic_structure_import_runs
    where status in ('queued', 'running')
  ) then
    raise exception using errcode = '55000', message = 'Another academic structure import is active.';
  end if;

  select id into selected_year_id
  from public.academic_years
  where year = p_academic_year and is_import_enabled
  for share;
  if selected_year_id is null then
    raise exception using errcode = '22023', message = 'That academic year is not importable.';
  end if;

  select id into selected_source_id
  from public.academic_structure_sources
  where kind = 'anu_programs_and_courses' and is_active
  order by id
  limit 1;
  if selected_source_id is null then
    raise exception using errcode = '55000', message = 'The ANU academic structure source is unavailable.';
  end if;

  if (
    select count(*)
    from public.academic_structure_directory_entries
    where academic_year_id = selected_year_id
      and structure_kind = p_structure_kind
      and is_available
      and code = any(
        select upper(btrim(code)) from unnest(p_structure_codes) as code
      )
  ) <> code_count then
    raise exception using errcode = '22023', message = 'Refresh the directory and choose available entries.';
  end if;

  insert into public.academic_structure_import_runs (
    source_id,
    academic_year_id,
    structure_kind,
    requested_model,
    parser_version,
    prompt_version,
    schema_version,
    initiated_by,
    target_count,
    queued_count
  ) values (
    selected_source_id,
    selected_year_id,
    p_structure_kind,
    lower(btrim(p_requested_model)),
    btrim(p_parser_version),
    btrim(p_prompt_version),
    btrim(p_schema_version),
    actor,
    code_count,
    code_count
  )
  returning id, academic_structure_import_runs.run_number
  into created_run_id, created_run_number;

  insert into public.academic_structure_import_targets (
    run_id,
    academic_year_id,
    directory_entry_id,
    position,
    structure_kind,
    structure_code,
    structure_id,
    structure_year_id,
    baseline_draft_snapshot_id,
    baseline_published_snapshot_id,
    requested_model
  )
  select
    created_run_id,
    selected_year_id,
    entries.id,
    requested.ordinality - 1,
    p_structure_kind,
    requested.code,
    structures.id,
    structure_years.id,
    structure_years.draft_snapshot_id,
    structure_years.published_snapshot_id,
    lower(btrim(p_requested_model))
  from (
    select upper(btrim(code)) as code, ordinality::smallint
    from unnest(p_structure_codes) with ordinality as selected(code, ordinality)
  ) as requested
  join public.academic_structure_directory_entries as entries
    on entries.academic_year_id = selected_year_id
   and entries.structure_kind = p_structure_kind
   and entries.code = requested.code
   and entries.is_available
  left join public.academic_structures as structures
    on structures.kind = p_structure_kind
   and structures.code = requested.code
  left join public.academic_structure_years as structure_years
    on structure_years.structure_id = structures.id
   and structure_years.academic_year_id = selected_year_id;

  insert into public.academic_structure_import_stages (target_id, stage_name, position)
  select targets.id, stages.stage_name, stages.position
  from public.academic_structure_import_targets as targets
  cross join (
    values
      ('source_fetch', 0),
      ('html_capture', 1),
      ('markdown_normalise', 2),
      ('model_input_prepare', 3),
      ('deterministic_extract', 4),
      ('model_extract', 5),
      ('schema_validate', 6),
      ('domain_validate', 7),
      ('database_project', 8),
      ('snapshot_persist', 9)
  ) as stages(stage_name, position)
  where targets.run_id = created_run_id;

  return query
  select
    created_run_id,
    created_run_number,
    targets.id,
    targets.position,
    targets.structure_code
  from public.academic_structure_import_targets as targets
  where targets.run_id = created_run_id
  order by targets.position;
end;
$$;
