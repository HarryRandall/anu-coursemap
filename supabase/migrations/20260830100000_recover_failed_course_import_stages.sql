create or replace function private.recover_stale_course_import_target(
  p_run_id uuid,
  p_target_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_run public.course_import_runs;
  selected_target public.course_import_targets;
  selected_failed_stage public.course_import_stages%rowtype;
begin
  -- Match claim, heartbeat and finish lock order so recovery and an active
  -- worker cannot both finalise the same target.
  select runs.*
  into selected_run
  from public.course_import_runs as runs
  where runs.id = p_run_id
  for update;

  if not found then
    raise exception 'Course import run % does not exist.', p_run_id
      using errcode = 'P0002';
  end if;

  select targets.*
  into selected_target
  from public.course_import_targets as targets
  where targets.id = p_target_id
    and targets.run_id = p_run_id
  for update;

  if not found then
    raise exception 'Course import target % does not belong to run %.',
      p_target_id,
      p_run_id
      using errcode = 'P0002';
  end if;

  if selected_target.processing_status in (
    'ready_for_review',
    'unchanged',
    'failed',
    'cancelled'
  ) then
    return true;
  end if;

  if selected_run.status not in ('queued', 'running') then
    return false;
  end if;

  -- Stage failure is durable before target completion. If a callback ends in
  -- that narrow window, a recovery-only delivery can copy the definitive
  -- error instead of waiting for the worker lease.
  if selected_target.processing_status = 'processing'
    and selected_target.error_code is null
  then
    select stages.*
    into selected_failed_stage
    from public.course_import_stages as stages
    where stages.target_id = p_target_id
      and stages.status = 'failed'
      and stages.started_at >= selected_target.claimed_at
      and stages.completed_at >= selected_target.claimed_at
    order by stages.completed_at desc, stages.position desc
    limit 1
    for update;

    if found then
      update public.course_import_targets as targets
      set
        processing_status = 'failed',
        review_status = 'not_required',
        candidate_snapshot_id = null,
        change_kind = null,
        lease_expires_at = null,
        lock_version = targets.lock_version + 1,
        error_code = nullif(btrim(selected_failed_stage.error_code), ''),
        error_summary = btrim(selected_failed_stage.error_summary),
        finished_at = statement_timestamp()
      where targets.id = p_target_id;

      perform private.refresh_course_import_run(p_run_id);
      return true;
    end if;
  end if;

  if not (
    (
      selected_target.processing_status = 'processing'
      and selected_target.lease_expires_at <= statement_timestamp()
      -- A retry release deliberately expires the lease and records its error.
      -- Leave it immediately claimable, but do not let a missing redelivery
      -- retain the active-run lock forever.
      and (
        selected_target.error_code is null
        or selected_target.heartbeat_at
          <= statement_timestamp() - interval '30 minutes'
      )
    )
    or (
      selected_target.processing_status = 'queued'
      and (
        (
          selected_target.queue_message_id is not null
          and selected_target.dispatched_at
            <= statement_timestamp() - interval '30 minutes'
        )
        or (
          selected_target.queue_message_id is null
          and selected_target.dispatched_at is null
          and selected_target.created_at
            <= statement_timestamp() - interval '30 minutes'
        )
      )
    )
  ) then
    return false;
  end if;

  update public.course_import_targets as targets
  set
    processing_status = 'failed',
    review_status = 'not_required',
    candidate_snapshot_id = null,
    change_kind = null,
    lease_expires_at = null,
    lock_version = targets.lock_version + 1,
    error_code = case
      when selected_target.processing_status = 'processing'
        then coalesce(
          selected_target.error_code,
          'WORKER_LEASE_EXPIRED'
        )
      when selected_target.queue_message_id is null
        then 'QUEUE_DISPATCH_STALE'
      else 'QUEUE_DELIVERY_STALE'
    end,
    error_summary = case
      when selected_target.processing_status = 'processing'
        then coalesce(
          selected_target.error_summary,
          'The import worker lease expired before completion.'
        )
      when selected_target.queue_message_id is null
        then 'The queued import was not confirmed as dispatched within 30 minutes.'
      else 'The queued import delivery did not start within 30 minutes.'
    end,
    finished_at = statement_timestamp()
  where targets.id = p_target_id;

  perform private.refresh_course_import_run(p_run_id);
  return true;
end;
$function$;

revoke all on function private.recover_stale_course_import_target(uuid, uuid)
from public, anon, authenticated;

grant execute on function private.recover_stale_course_import_target(uuid, uuid)
to service_role;

comment on function private.recover_stale_course_import_target(uuid, uuid) is
  'Finalises terminal, failed-stage, expired-lease or stale queued course import targets without another paid extraction.';
