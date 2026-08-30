-- Import runs are audit records. Worker retries may move an active target back
-- to its queued state, but terminal runs and targets must never be reopened.
-- Starting the work again creates a new run with its own provenance.

create or replace function private.validate_import_run_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if not (
    (old.status = 'queued' and new.status in ('running', 'failed', 'cancelled'))
    or (
      old.status = 'running'
      and new.status in (
        'queued',
        'succeeded',
        'partially_succeeded',
        'failed',
        'cancelled'
      )
    )
  ) then
    raise exception 'invalid % status transition: % to %',
      tg_table_name,
      old.status,
      new.status
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_import_run_status_transition()
from public, anon, authenticated;

create trigger course_import_runs_validate_lifecycle
before update of status on public.course_import_runs
for each row execute function private.validate_import_run_status_transition();

create trigger academic_structure_import_runs_validate_lifecycle
before update of status on public.academic_structure_import_runs
for each row execute function private.validate_import_run_status_transition();

create or replace function private.validate_academic_structure_import_target_transition()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.processing_status is not distinct from old.processing_status then
    return new;
  end if;

  if not (
    (
      old.processing_status = 'queued'
      and new.processing_status in ('running', 'failed', 'cancelled')
    )
    or (
      old.processing_status = 'running'
      and new.processing_status in (
        'queued',
        'succeeded',
        'failed',
        'cancelled'
      )
    )
  ) then
    raise exception 'invalid academic structure import target status transition: % to %',
      old.processing_status,
      new.processing_status
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_academic_structure_import_target_transition()
from public, anon, authenticated;

create trigger academic_structure_import_targets_validate_lifecycle
before update of processing_status on public.academic_structure_import_targets
for each row execute function private.validate_academic_structure_import_target_transition();
