-- Completed first imports become editable drafts. Review items stay open and
-- publication remains a separate, permission-checked operation. A competing
-- import or manual edit can never be replaced by this initialisation.
create or replace function private.prepare_first_course_import_draft()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.processing_status = 'ready_for_review'
    and old.processing_status is distinct from new.processing_status
    and new.baseline_draft_snapshot_id is null
    and new.baseline_published_snapshot_id is null
    and new.candidate_snapshot_id is not null
  then
    update public.course_years as course_year
    set draft_snapshot_id = new.candidate_snapshot_id
    where course_year.id = new.course_year_id
      and course_year.lifecycle_status = 'active'
      and course_year.draft_snapshot_id is null
      and course_year.published_snapshot_id is null
      and exists (
        select 1 from public.course_snapshots as snapshot
        where snapshot.id = new.candidate_snapshot_id
          and snapshot.course_year_id = course_year.id
          and snapshot.sealed_at is not null
          and snapshot.validation_status in ('valid', 'valid_with_warnings')
      );
  end if;
  return new;
end;
$function$;

create trigger course_import_targets_prepare_first_draft
after update of processing_status on public.course_import_targets
for each row execute function private.prepare_first_course_import_draft();

create or replace function private.prepare_first_structure_import_draft()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.processing_status = 'succeeded'
    and old.processing_status is distinct from new.processing_status
    and new.baseline_draft_snapshot_id is null
    and new.baseline_published_snapshot_id is null
    and new.candidate_snapshot_id is not null
  then
    update public.academic_structure_years as structure_year
    set draft_snapshot_id = new.candidate_snapshot_id, updated_at = now()
    where structure_year.id = new.structure_year_id
      and structure_year.draft_snapshot_id is null
      and structure_year.published_snapshot_id is null
      and exists (
        select 1 from public.academic_structure_snapshots as snapshot
        where snapshot.id = new.candidate_snapshot_id
          and snapshot.structure_year_id = structure_year.id
      );
  end if;
  return new;
end;
$function$;

create trigger academic_structure_import_targets_prepare_first_draft
after update of processing_status on public.academic_structure_import_targets
for each row execute function private.prepare_first_structure_import_draft();

revoke all on function private.prepare_first_course_import_draft()
from public, anon, authenticated;
revoke all on function private.prepare_first_structure_import_draft()
from public, anon, authenticated;

-- Accepting the exact automatically prepared first draft is safe. Subsequent
-- imports still require both captured pointers to match the current workspace.
create or replace function public.accept_course_import_target(
  p_target_id uuid,
  p_expected_baseline_snapshot_id bigint,
  p_expected_current_draft_snapshot_id bigint,
  p_resolution_note text default null
)
returns public.course_import_targets
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_user_id uuid;
  selected_target public.course_import_targets;
  current_lifecycle_status text;
  current_draft_snapshot_id bigint;
  current_published_snapshot_id bigint;
begin
  selected_user_id := (select auth.uid());

  if selected_user_id is null
    or not (select private.has_permission('imports.manage'))
  then
    raise exception 'Course import management permission is required.'
      using errcode = '42501';
  end if;

  if p_resolution_note is not null and btrim(p_resolution_note) = '' then
    raise exception 'Resolution note cannot be blank.' using errcode = '22023';
  end if;

  select targets.*
  into selected_target
  from public.course_import_targets as targets
  where targets.id = p_target_id
  for update;

  if not found
    or selected_target.processing_status <> 'ready_for_review'
    or selected_target.review_status <> 'pending'
  then
    raise exception 'Course import target % is not awaiting review.', p_target_id
      using errcode = '55000';
  end if;

  if selected_target.baseline_draft_snapshot_id
    is distinct from p_expected_baseline_snapshot_id
  then
    raise exception 'The supplied import baseline is stale.'
      using errcode = '40001';
  end if;

  select
    course_years.lifecycle_status,
    course_years.draft_snapshot_id,
    course_years.published_snapshot_id
  into
    current_lifecycle_status,
    current_draft_snapshot_id,
    current_published_snapshot_id
  from public.course_years as course_years
  where course_years.id = selected_target.course_year_id
  for update;

  if found and current_lifecycle_status <> 'active' then
    raise exception
      'Imported candidates can only be accepted into active course years.'
      using errcode = '55000';
  end if;

  if not found
    or current_draft_snapshot_id
      is distinct from p_expected_current_draft_snapshot_id
    or (
      current_draft_snapshot_id is distinct from selected_target.baseline_draft_snapshot_id
      and not (
        selected_target.baseline_draft_snapshot_id is null
        and selected_target.baseline_published_snapshot_id is null
        and current_draft_snapshot_id = selected_target.candidate_snapshot_id
      )
    )
    or current_published_snapshot_id
      is distinct from selected_target.baseline_published_snapshot_id
  then
    raise exception
      'The course changed after this import began. Review against a new baseline.'
      using errcode = '40001';
  end if;

  update public.course_years
  set draft_snapshot_id = selected_target.candidate_snapshot_id
  where id = selected_target.course_year_id;

  update public.course_import_targets as targets
  set
    review_status = 'accepted',
    reviewed_by = selected_user_id,
    reviewed_at = statement_timestamp(),
    lock_version = targets.lock_version + 1
  where targets.id = p_target_id
  returning targets.* into selected_target;

  update public.course_review_items
  set
    status = 'accepted',
    resolved_by = selected_user_id,
    resolved_at = statement_timestamp(),
    resolution_note = p_resolution_note
  where target_id = p_target_id
    and status = 'open';

  perform private.refresh_course_import_run(selected_target.run_id);

  return selected_target;
end;
$function$;

revoke all on function public.accept_course_import_target(
  uuid,
  bigint,
  bigint,
  text
) from public, anon, service_role;

grant execute on function public.accept_course_import_target(
  uuid,
  bigint,
  bigint,
  text
) to authenticated;


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
      and (
        draft_snapshot_id is not distinct from target_row.baseline_draft_snapshot_id
        or (
          target_row.baseline_draft_snapshot_id is null
          and target_row.baseline_published_snapshot_id is null
          and draft_snapshot_id = target_row.candidate_snapshot_id
        )
      )
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

-- A course is confirmed once in its workspace, including its originating import.
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
  reviewed_run_id uuid;
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

  -- Follow the worker's run, target, course-year lock order when confirmation
  -- also closes the import review. Later proposed candidates are never adopted.
  perform runs.id
  from public.course_import_runs as runs
  where runs.id in (
    select targets.run_id from public.course_import_targets as targets
    where targets.course_year_id = p_course_year_id and targets.review_status = 'pending'
  )
  order by runs.id for update;
  perform targets.id from public.course_import_targets as targets
  where targets.course_year_id = p_course_year_id and targets.review_status = 'pending'
  order by targets.id for update;

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

  -- This single workspace decision also closes the owning import. Link through
  -- the confirmed manual-review items so unrelated newer proposals stay pending.
  for reviewed_run_id in
    update public.course_import_targets as targets
    set review_status = 'accepted', reviewed_by = actor_id,
      reviewed_at = statement_timestamp(), lock_version = targets.lock_version + 1
    where targets.course_year_id = p_course_year_id
      and targets.processing_status = 'ready_for_review'
      and targets.review_status = 'pending'
      and exists (
        select 1 from public.course_review_items as reviews
        where reviews.target_id = targets.id
          and reviews.id = any(expected_blocking_ids)
          and reviews.issue_code = 'MANUAL_REVIEW_REQUIRED'
      )
    returning targets.run_id
  loop
    perform private.refresh_course_import_run(reviewed_run_id);
  end loop;

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


-- A viewable candidate is publishable only after it is the reviewed current draft.
create or replace function public.publish_academic_structure_snapshot(
  p_structure_year_id bigint,
  p_snapshot_id bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  selected_year public.academic_structure_years%rowtype;
  selected_snapshot public.academic_structure_snapshots%rowtype;
begin
  if actor is null or not private.has_permission('catalogue.write') then
    raise exception using errcode = '42501', message = 'Catalogue publication permission is required.';
  end if;
  select * into selected_year
  from public.academic_structure_years
  where id = p_structure_year_id
  for update;
  if selected_year.id is null or selected_year.draft_snapshot_id is distinct from p_snapshot_id then
    raise exception using errcode = '55000', message = 'Publish the exact current draft.';
  end if;
  select * into selected_snapshot
  from public.academic_structure_snapshots
  where id = p_snapshot_id and structure_year_id = p_structure_year_id;
  if selected_snapshot.id is null then
    raise exception using errcode = '55000', message = 'The draft snapshot is invalid.';
  end if;
  if selected_snapshot.critical_uncertainty
     or selected_snapshot.confirmation_status = 'required'
     or exists (
       select 1
       from public.academic_structure_review_items
       where snapshot_id = p_snapshot_id and status = 'open'
         and (severity = 'error' or item_kind = 'manual_review')
     ) then
    raise exception using errcode = '55000', message = 'Resolve blocking review items before publication.';
  end if;
  update public.academic_structure_years
  set published_snapshot_id = p_snapshot_id, updated_at = now()
  where id = p_structure_year_id;
end;
$$;

