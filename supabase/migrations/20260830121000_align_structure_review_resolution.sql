create or replace function public.review_academic_structure_import_target(
  p_target_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  selected_run_id uuid;
  target_row public.academic_structure_import_targets%rowtype;
begin
  if actor is null or not private.has_permission('imports.manage') then
    raise exception using errcode = '42501', message = 'Import permission is required.';
  end if;
  if p_decision not in ('accepted', 'rejected') then
    raise exception using errcode = '22023', message = 'Choose accepted or rejected.';
  end if;

  select run_id into selected_run_id
  from public.academic_structure_import_targets
  where id = p_target_id;
  if selected_run_id is null then
    raise exception using errcode = 'P0002', message = 'Import target not found.';
  end if;

  perform 1
  from public.academic_structure_import_runs
  where id = selected_run_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Import run not found.';
  end if;

  select * into target_row
  from public.academic_structure_import_targets
  where id = p_target_id and run_id = selected_run_id
  for update;
  if target_row.id is null then
    raise exception using errcode = 'P0002', message = 'Import target not found.';
  end if;
  if target_row.processing_status <> 'succeeded'
     or target_row.review_status not in ('needs_review', 'unchanged') then
    raise exception using errcode = '55000', message = 'This target is not ready for review.';
  end if;
  if p_decision = 'accepted' and target_row.candidate_snapshot_id is null
     and target_row.review_status <> 'unchanged' then
    raise exception using errcode = '55000', message = 'This target has no candidate snapshot.';
  end if;

  if p_decision = 'accepted' and target_row.candidate_snapshot_id is not null then
    update public.academic_structure_years
    set draft_snapshot_id = target_row.candidate_snapshot_id, updated_at = now()
    where id = target_row.structure_year_id
      and draft_snapshot_id is not distinct from target_row.baseline_draft_snapshot_id
      and published_snapshot_id is not distinct from target_row.baseline_published_snapshot_id;
    if not found then
      raise exception using errcode = '40001', message = 'The draft changed after this import completed.';
    end if;
  end if;

  update public.academic_structure_import_targets
  set
    review_status = p_decision,
    reviewed_by = actor,
    reviewed_at = now(),
    review_note = nullif(btrim(p_note), ''),
    lock_version = lock_version + 1,
    updated_at = now()
  where id = p_target_id;

  -- Accepting a candidate confirms every non-blocking observation shown to
  -- the reviewer. Errors remain open and consistently block publication from
  -- both the import target and the structure workspace. Rejection dismisses
  -- the complete candidate review set.
  update public.academic_structure_review_items
  set
    status = case when p_decision = 'accepted' then 'resolved' else 'dismissed' end,
    resolved_by = actor,
    resolved_at = now(),
    resolution_note = nullif(btrim(p_note), ''),
    updated_at = now()
  where target_id = p_target_id
    and status = 'open'
    and (
      p_decision = 'rejected'
      or severity <> 'error'
    );

  perform private.refresh_academic_structure_import_run(target_row.run_id);
end;
$$;

revoke all
on function public.review_academic_structure_import_target(uuid, text, text)
from public, anon;

grant execute
on function public.review_academic_structure_import_target(uuid, text, text)
to authenticated;
