begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(85);

select extensions.is(
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'course_import_runs',
        'course_import_targets',
        'course_import_stages',
        'course_import_artifacts',
        'course_extractions',
        'course_review_items'
      )
  ),
  6::bigint,
  'all six durable workflow tables exist'
);

select extensions.is(
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'course_attributes',
        'course_unit_options',
        'course_rule_condition_courses'
      )
  ),
  3::bigint,
  'new relational course detail tables exist'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'private.claim_course_import_target(uuid,uuid,text,uuid,integer)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'private.recover_stale_course_import_target(uuid,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'private.claim_course_import_target(uuid,uuid,text,uuid,integer)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'private.claim_course_import_target(uuid,uuid,text,uuid,integer)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'private.recover_stale_course_import_target(uuid,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'private.recover_stale_course_import_target(uuid,uuid)',
    'execute'
  ),
  'only the trusted worker role can execute private claim and recovery functions'
);

select extensions.ok(
  has_table_privilege(
    'service_role',
    'public.course_source_pages',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'public.course_source_pages',
    'insert'
  )
  and has_sequence_privilege(
    'service_role',
    'public.course_source_pages_id_seq',
    'usage'
  )
  and has_table_privilege(
    'service_role',
    'public.course_directory_entries',
    'select'
  )
  and has_table_privilege(
    'service_role',
    'public.course_directory_entries',
    'update'
  ),
  'the trusted worker can record source pages and link directory entries'
);

select extensions.ok(
  has_table_privilege(
    'service_role',
    'public.academic_periods',
    'select'
  )
  and not exists (
    select 1
    from (
      values
        ('public.courses_id_seq'),
        ('public.course_years_id_seq'),
        ('public.course_snapshots_id_seq'),
        ('public.course_fees_id_seq'),
        ('public.course_areas_of_interest_id_seq'),
        ('public.course_related_courses_id_seq'),
        ('public.course_offerings_id_seq'),
        ('public.offering_sessions_id_seq'),
        ('public.course_learning_outcomes_id_seq'),
        ('public.course_assessment_items_id_seq'),
        ('public.course_rules_id_seq'),
        ('public.course_rule_groups_id_seq'),
        ('public.course_rule_conditions_id_seq'),
        ('public.course_rule_course_references_id_seq'),
        ('public.course_snapshot_field_evidence_id_seq')
    ) as worker_sequences (sequence_name)
    where not has_sequence_privilege(
      'service_role',
      worker_sequences.sequence_name,
      'usage'
    )
  ),
  'the trusted worker can resolve periods and allocate snapshot identities'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.start_course_import(smallint,text[],text,text,text,text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.accept_course_import_target(uuid,bigint,bigint,text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.reject_course_import_target(uuid,text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.start_course_import(smallint,text[],text,text,text,text)',
    'execute'
  ),
  'authenticated administrators receive only the public workflow RPCs'
);

select extensions.ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'course_snapshots_projection_sha256_idx'
      and indexdef not like 'CREATE UNIQUE INDEX%'
  ),
  'projection hashes are indexed for comparison without constraining history'
);

select extensions.ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.course_extractions'::regclass
      and conname = 'course_extractions_target_fingerprint_unique'
      and contype = 'u'
  ),
  'an extraction fingerprint can be charged at most once for each target'
);

select extensions.ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'course_offerings'
      and column_name in (
        'course_version_id',
        'catalogue_year_id',
        'source_document_id',
        'status'
      )
  ),
  'course offerings expose only snapshot-native lineage'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '61000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'pipeline-admin@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '61000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'pipeline-student@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into private.user_roles (user_id, role_id, granted_by)
select
  '61000000-0000-4000-8000-000000000001',
  roles.id,
  '61000000-0000-4000-8000-000000000001'
from private.app_roles as roles
where roles.key = 'admin'
on conflict (user_id) do update
set
  role_id = excluded.role_id,
  granted_by = excluded.granted_by,
  granted_at = statement_timestamp();

insert into public.course_sources (name, kind, base_url)
values (
  'Course import pipeline test',
  'course_import_pipeline_test',
  'https://pipeline.example.test'
);

insert into public.course_source_pages (
  source_id,
  academic_year_id,
  page_kind,
  external_key,
  canonical_url,
  media_type,
  content_sha256,
  http_status,
  byte_size
)
select
  sources.id,
  years.id,
  'course_directory',
  'courses-2030',
  'https://pipeline.example.test/2030/courses',
  'application/json',
  repeat('a', 64),
  200,
  100
from public.course_sources as sources
cross join public.academic_years as years
where sources.kind = 'course_import_pipeline_test'
  and years.year = 2030;

insert into public.courses (code)
values ('PIPE1000'), ('PIPE1001');

insert into public.course_years (course_id, academic_year_id)
select courses.id, years.id
from public.courses
cross join public.academic_years as years
where courses.code in ('PIPE1000', 'PIPE1001')
  and years.year = 2030;

insert into public.course_snapshots (
  course_year_id,
  academic_year_id,
  snapshot_number,
  origin,
  source_page_id,
  projection_sha256,
  validation_status,
  overall_confidence,
  title,
  units,
  level,
  subject_code,
  offering_status
)
select
  course_years.id,
  course_years.academic_year_id,
  1,
  'manual_edit',
  documents.id,
  case courses.code
    when 'PIPE1000' then repeat('b', 64)
    else repeat('c', 64)
  end,
  'valid',
  1,
  'Baseline ' || courses.code,
  6,
  1000,
  'PIPE',
  'offered'
from public.course_years
join public.courses on courses.id = course_years.course_id
join public.academic_years as years
  on years.id = course_years.academic_year_id
join public.course_source_pages as documents
  on documents.academic_year_id = years.id
 and documents.page_kind = 'course_directory'
where courses.code in ('PIPE1000', 'PIPE1001')
  and years.year = 2030;

update public.course_years as course_years
set draft_snapshot_id = snapshots.id
from public.course_snapshots as snapshots
where snapshots.course_year_id = course_years.id
  and snapshots.snapshot_number = 1
  and course_years.course_id in (
    select courses.id
    from public.courses
    where courses.code in ('PIPE1000', 'PIPE1001')
  )
  and course_years.academic_year_id = (
    select years.id
    from public.academic_years as years
    where years.year = 2030
  );

insert into public.course_directory_entries (
  academic_year_id,
  course_id,
  code,
  title,
  units,
  source_page_id
)
select
  years.id,
  courses.id,
  courses.code,
  'Directory ' || courses.code,
  6,
  documents.id
from public.courses
cross join public.academic_years as years
join public.course_source_pages as documents
  on documents.academic_year_id = years.id
 and documents.page_kind = 'course_directory'
where courses.code in ('PIPE1000', 'PIPE1001')
  and years.year = 2030;

insert into public.academic_periods (
  calendar_year,
  code,
  name,
  short_name,
  starts_on,
  ends_on,
  sort_order,
  status
)
values (
  2030,
  'PIPE-S1',
  'Pipeline Semester 1',
  'S1',
  '2030-02-18',
  '2030-06-30',
  1,
  'draft'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1000'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  '42501',
  'Course import management permission is required.',
  'a student cannot start an import'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1000', 'PIPE1001'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  'an administrator can start a course import for dispatch'
);

reset role;

do $block$
declare
  selected_run_id uuid;
begin
  select runs.id
  into selected_run_id
  from public.course_import_runs as runs
  where runs.status = 'queued'
  order by runs.created_at desc
  limit 1;

  update public.course_import_targets
  set
    processing_status = 'failed',
    review_status = 'not_required',
    dispatch_error = 'The queue rejected this target.',
    error_code = 'QUEUE_DISPATCH_FAILED',
    error_summary = 'The queue rejected this target.',
    finished_at = statement_timestamp(),
    updated_at = statement_timestamp()
  where run_id = selected_run_id
    and course_code = 'PIPE1001';

  perform private.refresh_course_import_run(selected_run_id);
end;
$block$;

select extensions.ok(
  exists (
    select 1
    from public.course_import_runs as runs
    where runs.status = 'running'
      and runs.target_count = 2
      and runs.processed_count = 1
      and runs.failed_count = 1
      and runs.started_at is not null
      and runs.completed_at is null
      and exists (
        select 1
        from public.course_import_targets as targets
        where targets.run_id = runs.id
          and targets.course_code = 'PIPE1000'
          and targets.processing_status = 'queued'
      )
  ),
  'a partial dispatch failure starts the run and preserves queued siblings'
);

select extensions.lives_ok(
  $$
    with failed_targets as (
      update public.course_import_targets
      set
        processing_status = 'failed',
        review_status = 'not_required',
        dispatch_error = 'The queue rejected this target.',
        error_code = 'QUEUE_DISPATCH_FAILED',
        error_summary = 'The queue rejected this target.',
        finished_at = statement_timestamp(),
        updated_at = statement_timestamp()
      where processing_status = 'queued'
      returning run_id
    )
    select private.refresh_course_import_run(run_id)
    from (
      select distinct failed_targets.run_id
      from failed_targets
    ) as failed_runs
  $$,
  'a queue dispatch rejection can fail a target before it is claimed'
);

select extensions.ok(
  exists (
    select 1
    from public.course_import_targets as targets
    join public.course_import_runs as runs on runs.id = targets.run_id
    where targets.processing_status = 'failed'
      and targets.review_status = 'not_required'
      and targets.dispatch_error = 'The queue rejected this target.'
      and targets.error_code = 'QUEUE_DISPATCH_FAILED'
      and targets.finished_at is not null
      and runs.status = 'failed'
      and runs.completed_at is not null
  ),
  'dispatch failures retain their error and final workflow state'
);

delete from public.course_import_runs as runs
using public.course_import_targets as targets
where targets.run_id = runs.id
  and runs.status = 'failed'
  and targets.dispatch_error = 'The queue rejected this target.';

set local role authenticated;

select public.start_course_import(
  2030::smallint,
  array['PIPE1000', 'PIPE1001'],
  'google/gemini-test',
  'parser.v1',
  'prompt.v1',
  'course-snapshot.v1'
);

reset role;

select set_config(
  'coursemap.test.expired_run_id',
  (
    select runs.id::text
    from public.course_import_runs as runs
    where runs.status = 'queued'
  ),
  true
);

do $block$
declare
  selected_target record;
begin
  for selected_target in
    select targets.id, targets.course_code
    from public.course_import_targets as targets
    where targets.run_id = current_setting(
      'coursemap.test.expired_run_id'
    )::uuid
    order by targets.position
  loop
    perform private.claim_course_import_target(
      current_setting('coursemap.test.expired_run_id')::uuid,
      selected_target.id,
      'expired-lease-' || lower(selected_target.course_code),
      '64000000-0000-4000-8000-000000000001'::uuid,
      600
    );
  end loop;

  update public.course_import_targets as targets
  set lease_expires_at = statement_timestamp() - interval '1 second'
  where targets.run_id = current_setting(
      'coursemap.test.expired_run_id'
    )::uuid
    and targets.course_code = 'PIPE1000';
end;
$block$;

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

select extensions.throws_ok(
  $$
    select public.fail_expired_course_import_targets(
      current_setting('coursemap.test.expired_run_id')::uuid
    )
  $$,
  '42501',
  'Course import management permission is required.',
  'a student cannot recover expired course import leases'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
set local role service_role;

select extensions.ok(
  private.recover_stale_course_import_target(
    current_setting('coursemap.test.expired_run_id')::uuid,
    (
      select targets.id
      from public.course_import_targets as targets
      where targets.run_id = current_setting(
          'coursemap.test.expired_run_id'
        )::uuid
        and targets.course_code = 'PIPE1000'
    )
  ),
  'the trusted worker can terminally recover one expired target without another paid attempt'
);

select extensions.ok(
  not private.recover_stale_course_import_target(
    current_setting('coursemap.test.expired_run_id')::uuid,
    (
      select targets.id
      from public.course_import_targets as targets
      where targets.run_id = current_setting(
          'coursemap.test.expired_run_id'
        )::uuid
        and targets.course_code = 'PIPE1001'
    )
  ),
  'worker recovery reports a live target as non-terminal so queue retry continues'
);

reset role;

select extensions.ok(
  exists (
    select 1
    from public.course_import_runs as runs
    where runs.id = current_setting(
        'coursemap.test.expired_run_id'
      )::uuid
      and runs.status = 'running'
      and runs.processed_count = 1
      and runs.failed_count = 1
      and exists (
        select 1
        from public.course_import_targets as expired
        where expired.run_id = runs.id
          and expired.course_code = 'PIPE1000'
          and expired.processing_status = 'failed'
          and expired.error_code = 'WORKER_LEASE_EXPIRED'
          and expired.lease_expires_at is null
      )
      and exists (
        select 1
        from public.course_import_targets as live
        where live.run_id = runs.id
          and live.course_code = 'PIPE1001'
          and live.processing_status = 'processing'
          and live.lease_expires_at > statement_timestamp()
      )
  ),
  'lease recovery fails only expired targets and leaves a live lease running'
);

update public.course_import_targets as targets
set lease_expires_at = statement_timestamp() - interval '1 second'
where targets.run_id = current_setting(
    'coursemap.test.expired_run_id'
  )::uuid
  and targets.processing_status = 'processing';

set local role authenticated;

select public.fail_expired_course_import_targets(
  current_setting('coursemap.test.expired_run_id')::uuid
);

reset role;

select extensions.ok(
  exists (
    select 1
    from public.course_import_runs as runs
    where runs.id = current_setting(
        'coursemap.test.expired_run_id'
      )::uuid
      and runs.status = 'failed'
      and runs.processed_count = 2
      and runs.failed_count = 2
      and runs.completed_at is not null
  ),
  'recovering the final expired lease releases the active import run'
);

delete from public.course_import_runs
where id = current_setting('coursemap.test.expired_run_id')::uuid;

set local role authenticated;

select public.start_course_import(
  2030::smallint,
  array['PIPE1000', 'PIPE1001'],
  'google/gemini-test',
  'parser.v1',
  'prompt.v1',
  'course-snapshot.v1'
);

reset role;

select set_config(
  'coursemap.test.stale_dispatch_run_id',
  (
    select runs.id::text
    from public.course_import_runs as runs
    where runs.status = 'queued'
  ),
  true
);

update public.course_import_targets as targets
set
  queue_message_id = 'stale-dispatch-pipe1000',
  dispatched_at = statement_timestamp() - interval '31 minutes'
where targets.run_id = current_setting(
    'coursemap.test.stale_dispatch_run_id'
  )::uuid
  and targets.course_code = 'PIPE1000';

set local role authenticated;

select extensions.lives_ok(
  $$
    select public.fail_expired_course_import_targets(
      current_setting('coursemap.test.stale_dispatch_run_id')::uuid
    )
  $$,
  'an administrator can recover a stale queued delivery'
);

reset role;

select extensions.ok(
  exists (
    select 1
    from public.course_import_runs as runs
    where runs.id = current_setting(
        'coursemap.test.stale_dispatch_run_id'
      )::uuid
      and runs.status = 'running'
      and runs.processed_count = 1
      and runs.failed_count = 1
      and exists (
        select 1
        from public.course_import_targets as stale
        where stale.run_id = runs.id
          and stale.course_code = 'PIPE1000'
          and stale.processing_status = 'failed'
          and stale.error_code = 'QUEUE_DELIVERY_STALE'
      )
      and exists (
        select 1
        from public.course_import_targets as undispatched
        where undispatched.run_id = runs.id
          and undispatched.course_code = 'PIPE1001'
          and undispatched.processing_status = 'queued'
          and undispatched.queue_message_id is null
          and undispatched.dispatched_at is null
      )
  ),
  'stale delivery recovery leaves an undispatched queued target untouched'
);

update public.course_import_targets as targets
set created_at = statement_timestamp() - interval '31 minutes'
where targets.run_id = current_setting(
    'coursemap.test.stale_dispatch_run_id'
  )::uuid
  and targets.course_code = 'PIPE1001';

set local role authenticated;

select extensions.lives_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1000'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  'starting an import recovers an unconfirmed dispatch older than 30 minutes'
);

reset role;

select extensions.ok(
  exists (
    select 1
    from public.course_import_runs as stale_runs
    where stale_runs.id = current_setting(
        'coursemap.test.stale_dispatch_run_id'
      )::uuid
      and stale_runs.status = 'failed'
      and stale_runs.processed_count = 2
      and stale_runs.failed_count = 2
      and stale_runs.completed_at is not null
      and exists (
        select 1
        from public.course_import_targets as undispatched
        where undispatched.run_id = stale_runs.id
          and undispatched.course_code = 'PIPE1001'
          and undispatched.processing_status = 'failed'
          and undispatched.error_code = 'QUEUE_DISPATCH_STALE'
          and undispatched.queue_message_id is null
          and undispatched.dispatched_at is null
      )
  )
  and exists (
    select 1
    from public.course_import_runs as replacement_runs
    where replacement_runs.id <> current_setting(
        'coursemap.test.stale_dispatch_run_id'
      )::uuid
      and replacement_runs.status = 'queued'
  ),
  'old unconfirmed dispatch recovery releases the active-run lock for its replacement'
);

delete from public.course_import_runs
where id <> current_setting('coursemap.test.stale_dispatch_run_id')::uuid
  and status = 'queued';

delete from public.course_import_runs
where id = current_setting('coursemap.test.stale_dispatch_run_id')::uuid;

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['pipe1000', 'PIPE1001'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  'an administrator can atomically start a two-course import'
);

select extensions.lives_ok(
  $$
    set constraints
      course_import_runs_check_target_count,
      course_import_targets_check_target_count
    immediate
  $$,
  'deferred run target-count checks resolve the correct trigger record shape'
);

set constraints
  course_import_runs_check_target_count,
  course_import_targets_check_target_count
deferred;

select extensions.is(
  (
    select count(*)
    from public.course_import_targets
  ),
  2::bigint,
  'the start RPC creates exactly the selected targets'
);

select extensions.results_eq(
  $$
    select position, course_code
    from public.course_import_targets
    order by position
  $$,
  $$
    values
      (1::smallint, 'PIPE1000'::text),
      (2::smallint, 'PIPE1001'::text)
  $$,
  'target positions preserve the administrator selection order'
);

select extensions.is(
  (select count(*) from public.course_import_stages),
  20::bigint,
  'every target receives the exact ten-stage pipeline'
);

select extensions.ok(
  not exists (
    select 1
    from public.course_import_targets as targets
    join public.course_years as course_years
      on course_years.id = targets.course_year_id
    where targets.baseline_draft_snapshot_id
      is distinct from course_years.draft_snapshot_id
  ),
  'target baselines capture the current draft pointer'
);

select extensions.throws_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1000'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  '55000',
  'Another course import run is already active.',
  'only one queued or running import may exist globally'
);

select extensions.throws_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1000', 'pipe1000'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  '22023',
  'Course codes must be distinct within an import run.',
  'duplicate target codes are rejected before creating a run'
);

select extensions.throws_ok(
  $$
    insert into public.course_import_targets (
      run_id,
      source_id,
      academic_year_id,
      directory_entry_id,
      position,
      course_code
    )
    select
      runs.id,
      runs.source_id,
      runs.academic_year_id,
      entries.id,
      3,
      entries.code
    from public.course_import_runs as runs
    join public.course_directory_entries as entries
      on entries.academic_year_id = runs.academic_year_id
    where entries.code = 'PIPE1000'
  $$,
  '42501',
  'permission denied for table course_import_targets',
  'authenticated clients cannot bypass the atomic start RPC'
);

reset role;

create temporary table pipeline_test_run on commit drop as
select id
from public.course_import_runs;

create temporary table pipeline_test_targets on commit drop as
select id, course_code, course_id, course_year_id,
  baseline_draft_snapshot_id, baseline_published_snapshot_id
from public.course_import_targets;

grant select on pipeline_test_run, pipeline_test_targets
to service_role, authenticated;

set local role service_role;

select extensions.lives_ok(
  format(
    $sql$
      select * from private.claim_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1000-attempt-1',
        '62000000-0000-4000-8000-000000000001'::uuid,
        600
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1000')
  ),
  'the trusted worker can claim an explicit queued target'
);

select extensions.ok(
  exists (
    select 1
    from public.course_import_targets as targets
    join public.course_import_runs as runs on runs.id = targets.run_id
    where targets.course_code = 'PIPE1000'
      and targets.processing_status = 'processing'
      and targets.attempt_count = 1
      and targets.lock_version = 1
      and targets.queue_message_id = 'message-pipe-1000-attempt-1'
      and runs.status = 'running'
      and runs.requested_model = 'google/gemini-test'
  ),
  'claiming starts the run and records the model, message, attempt and lock'
);

select extensions.lives_ok(
  format(
    $sql$
      select * from private.heartbeat_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1000-attempt-1',
        '62000000-0000-4000-8000-000000000001'::uuid,
        1,
        600
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1000')
  ),
  'the lease owner can heartbeat with its current optimistic lock version'
);

select extensions.throws_ok(
  format(
    $sql$
      select * from private.heartbeat_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1000-attempt-1',
        '62000000-0000-4000-8000-000000000001'::uuid,
        1,
        600
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1000')
  ),
  '55000',
  'Course import target lease or lock version no longer matches.',
  'a stale heartbeat cannot extend a lease'
);

select extensions.throws_ok(
  format(
    $sql$
      insert into public.course_import_artifacts (
        target_id,
        artifact_kind,
        media_type,
        content_sha256,
        byte_size,
        storage_bucket,
        storage_path
      ) values (
        %L::uuid,
        'raw_html',
        'text/html',
        %L,
        42,
        '',
        '2030/PIPE1000/raw.html'
      )
    $sql$,
    (select id from pipeline_test_targets where course_code = 'PIPE1000'),
    repeat('1', 64)
  ),
  '23514',
  null,
  'artefacts require a nonblank private storage location and never inline bodies'
);

insert into public.course_import_artifacts (
  target_id,
  stage_id,
  artifact_kind,
  media_type,
  content_sha256,
  byte_size,
  storage_bucket,
  storage_path
)
select
  targets.id,
  stages.id,
  artifact.artifact_kind,
  artifact.media_type,
  artifact.content_sha256,
  artifact.byte_size,
  'course-import-artifacts',
  '2030/PIPE1000/' || artifact.storage_name
from public.course_import_targets as targets
join public.course_import_stages as stages
  on stages.target_id = targets.id
 and stages.stage_name = 'model_extract'
cross join (
  values
    ('model_request'::text, 'application/json'::text, repeat('2', 64), 120::bigint, 'request.json'::text),
    ('model_response'::text, 'application/json'::text, repeat('3', 64), 240::bigint, 'response.json'::text),
    ('validated_json'::text, 'application/json'::text, repeat('4', 64), 180::bigint, 'validated.json'::text)
) as artifact(
  artifact_kind,
  media_type,
  content_sha256,
  byte_size,
  storage_name
)
where targets.course_code = 'PIPE1000';

select extensions.lives_ok(
  $$
    insert into public.course_extractions (
      target_id,
      extraction_number,
      requested_model,
      extraction_fingerprint,
      prompt_version,
      schema_version,
      request_artifact_id,
      started_at
    )
    select
      targets.id,
      1,
      'google/gemini-test',
      repeat('5', 64),
      'prompt.v1',
      'course-snapshot.v1',
      requests.id,
      statement_timestamp() - interval '1 second'
    from public.course_import_targets as targets
    join public.course_import_artifacts as requests
      on requests.target_id = targets.id
     and requests.artifact_kind = 'model_request'
    where targets.course_code = 'PIPE1000'
  $$,
  'a model fingerprint is durably reserved before the paid request starts'
);

select extensions.lives_ok(
  $$
    update public.course_extractions as extractions
    set
      resolved_model = 'google/gemini-resolved',
      response_artifact_id = responses.id,
      provider_request_id = 'openrouter-request-1',
      finish_reason = 'stop',
      input_tokens = 100,
      cached_input_tokens = 20,
      output_tokens = 50,
      reasoning_tokens = 10,
      cost_usd = 0.000123,
      cost_source = 'provider',
      latency_ms = 432
    from public.course_import_artifacts as responses
    where responses.target_id = extractions.target_id
      and responses.artifact_kind = 'model_response'
      and extractions.response_artifact_id is null
  $$,
  'the reserved extraction accepts its immutable paid response exactly once'
);

select extensions.throws_ok(
  $$
    update public.course_extractions as extractions
    set
      validated_artifact_id = validated.id,
      validation_status = 'valid',
      schema_valid = true,
      domain_valid = true,
      warning_count = 1,
      completed_at = statement_timestamp(),
      cost_usd = extractions.cost_usd + 1
    from public.course_import_artifacts as validated
    where validated.target_id = extractions.target_id
      and validated.artifact_kind = 'validated_json'
  $$,
  '55000',
  'pending course extraction request, response, usage and cost evidence is immutable',
  'validation cannot rewrite the paid response cost evidence'
);

select extensions.lives_ok(
  $$
    update public.course_extractions as extractions
    set
      validated_artifact_id = validated.id,
      validation_status = 'valid',
      schema_valid = true,
      domain_valid = true,
      warning_count = 1,
      completed_at = statement_timestamp()
    from public.course_import_artifacts as validated
    where validated.target_id = extractions.target_id
      and validated.artifact_kind = 'validated_json'
  $$,
  'pending extraction validation can complete exactly once'
);

select extensions.throws_ok(
  $$
    update public.course_extractions
    set warning_count = warning_count + 1
  $$,
  '55000',
  'completed course extractions are immutable',
  'a completed extraction cannot be rewritten'
);

insert into public.course_import_artifacts (
  target_id,
  artifact_kind,
  attempt_number,
  media_type,
  content_sha256,
  byte_size,
  storage_bucket,
  storage_path
)
select
  targets.id,
  artifact.artifact_kind,
  artifact.attempt_number,
  'application/json',
  artifact.content_sha256,
  100,
  'course-import-artifacts',
  '2030/PIPE1001/' || artifact.storage_name
from public.course_import_targets as targets
cross join (
  values
    ('model_request'::text, 1::smallint, repeat('6', 64), 'request-1.json'::text),
    ('model_response'::text, 1::smallint, repeat('7', 64), 'response-1.json'::text),
    ('model_request'::text, 2::smallint, repeat('8', 64), 'request-2.json'::text),
    ('model_response'::text, 2::smallint, repeat('9', 64), 'response-2.json'::text)
) as artifact(
  artifact_kind,
  attempt_number,
  content_sha256,
  storage_name
)
where targets.course_code = 'PIPE1001';

select extensions.lives_ok(
  $$
    insert into public.course_extractions (
      target_id,
      extraction_number,
      requested_model,
      resolved_model,
      extraction_fingerprint,
      reused_from_extraction_id,
      prompt_version,
      schema_version,
      request_artifact_id,
      response_artifact_id,
      finish_reason,
      input_tokens,
      output_tokens,
      cost_usd,
      cost_source,
      started_at
    )
    select
      targets.id,
      1,
      source_extractions.requested_model,
      source_extractions.resolved_model,
      source_extractions.extraction_fingerprint,
      source_extractions.id,
      source_extractions.prompt_version,
      source_extractions.schema_version,
      requests.id,
      responses.id,
      source_extractions.finish_reason,
      source_extractions.input_tokens,
      source_extractions.output_tokens,
      0,
      'cache',
      statement_timestamp()
    from public.course_import_targets as targets
    join public.course_import_artifacts as requests
      on requests.target_id = targets.id
     and requests.artifact_kind = 'model_request'
     and requests.attempt_number = 1
    join public.course_import_artifacts as responses
      on responses.target_id = targets.id
     and responses.artifact_kind = 'model_response'
     and responses.attempt_number = 1
    cross join lateral (
      select extractions.*
      from public.course_extractions as extractions
      join public.course_import_targets as source_targets
        on source_targets.id = extractions.target_id
      where source_targets.course_code = 'PIPE1000'
    ) as source_extractions
    where targets.course_code = 'PIPE1001'
  $$,
  'a matching response can be reused without charging the new target again'
);

select extensions.ok(
  exists (
    select 1
    from public.course_extractions as cached
    join public.course_extractions as paid
      on paid.id = cached.reused_from_extraction_id
    where cached.cost_source = 'cache'
      and cached.cost_usd = 0
      and cached.extraction_fingerprint = paid.extraction_fingerprint
      and paid.reused_from_extraction_id is null
  ),
  'cached extraction cost and fingerprint lineage point directly to paid evidence'
);

select extensions.throws_ok(
  $$
    insert into public.course_extractions (
      target_id,
      extraction_number,
      requested_model,
      extraction_fingerprint,
      reused_from_extraction_id,
      prompt_version,
      schema_version,
      request_artifact_id,
      response_artifact_id,
      cost_source,
      started_at
    )
    select
      targets.id,
      2,
      paid.requested_model,
      repeat('a', 64),
      paid.id,
      paid.prompt_version,
      paid.schema_version,
      requests.id,
      responses.id,
      'cache',
      statement_timestamp()
    from public.course_import_targets as targets
    join public.course_import_artifacts as requests
      on requests.target_id = targets.id
     and requests.artifact_kind = 'model_request'
     and requests.attempt_number = 2
    join public.course_import_artifacts as responses
      on responses.target_id = targets.id
     and responses.artifact_kind = 'model_response'
     and responses.attempt_number = 2
    cross join lateral (
      select extractions.*
      from public.course_extractions as extractions
      join public.course_import_targets as source_targets
        on source_targets.id = extractions.target_id
      where source_targets.course_code = 'PIPE1000'
    ) as paid
    where targets.course_code = 'PIPE1001'
  $$,
  '23503',
  'cached course extractions must reference a direct response with the same fingerprint',
  'a cached response cannot claim unrelated fingerprint lineage'
);

select extensions.throws_ok(
  $$
    update public.course_import_artifacts
    set storage_path = storage_path || '.changed'
    where artifact_kind = 'model_request'
  $$,
  '55000',
  'course_import_artifacts records are immutable; create a new record instead',
  'stored artefact metadata is immutable'
);

select extensions.throws_ok(
  $$
    update public.course_import_stages
    set
      status = 'running',
      started_at = statement_timestamp(),
      attempt_count = 1
    where target_id = (
      select id
      from public.course_import_targets
      where course_code = 'PIPE1000'
    )
      and position = 2
  $$,
  '55000',
  'earlier course import stages must finish first',
  'pipeline stages cannot run out of order'
);

do $complete_stages$
declare
  selected_stage record;
begin
  for selected_stage in
    select stages.id
    from public.course_import_stages as stages
    join public.course_import_targets as targets
      on targets.id = stages.target_id
    where targets.course_code = 'PIPE1000'
    order by stages.position
  loop
    update public.course_import_stages
    set status = 'running', started_at = statement_timestamp()
    where id = selected_stage.id;

    update public.course_import_stages
    set status = 'succeeded', completed_at = statement_timestamp()
    where id = selected_stage.id;
  end loop;
end;
$complete_stages$;

insert into public.course_source_pages (
  source_id,
  academic_year_id,
  page_kind,
  external_key,
  canonical_url,
  media_type,
  content_sha256,
  http_status,
  byte_size,
  storage_bucket,
  storage_path
)
select
  targets.source_id,
  targets.academic_year_id,
  'course_page',
  targets.course_code,
  'https://pipeline.example.test/2030/course/PIPE1000',
  'text/html',
  repeat('d', 64),
  200,
  500,
  'course-import-artifacts',
  'sources/2030/PIPE1000/' || repeat('d', 64) || '.html'
from public.course_import_targets as targets
where targets.course_code = 'PIPE1000';

insert into public.course_snapshots (
  course_year_id,
  academic_year_id,
  snapshot_number,
  origin,
  based_on_snapshot_id,
  source_page_id,
  projection_sha256,
  validation_status,
  overall_confidence,
  has_critical_uncertainty,
  title,
  unit_value_kind,
  minimum_units,
  maximum_units,
  level,
  subject_code,
  offering_status
)
select
  targets.course_year_id,
  targets.academic_year_id,
  2,
  'import',
  targets.baseline_draft_snapshot_id,
  documents.id,
  repeat('e', 64),
  'valid_with_warnings',
  0.95,
  false,
  'Imported PIPE1000',
  'variable',
  6,
  12,
  1000,
  'PIPE',
  'offered'
from public.course_import_targets as targets
join public.course_source_pages as documents
  on documents.academic_year_id = targets.academic_year_id
 and documents.external_key = targets.course_code
 and documents.page_kind = 'course_page'
where targets.course_code = 'PIPE1000';

create temporary table pipeline_test_candidate on commit drop as
select snapshots.id, snapshots.course_year_id, snapshots.source_page_id
from public.course_snapshots as snapshots
join public.course_years as course_years
  on course_years.id = snapshots.course_year_id
join public.courses on courses.id = course_years.course_id
where courses.code = 'PIPE1000'
  and snapshots.snapshot_number = 2;

grant select on pipeline_test_candidate to authenticated;

select extensions.throws_ok(
  format(
    $sql$
      select private.finish_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1000-attempt-1',
        '62000000-0000-4000-8000-000000000001'::uuid,
        %s,
        'ready_for_review',
        'changed',
        %s,
        %s,
        %s,
        %s,
        null,
        null
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select lock_version from public.course_import_targets where course_code = 'PIPE1000'),
    (select course_id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select course_year_id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select source_page_id from pipeline_test_candidate),
    (select id from pipeline_test_candidate)
  ),
  '55000',
  'Every changed candidate requires manual review.',
  'a changed candidate cannot finish without mandatory manual review'
);

select extensions.lives_ok(
  $$
    insert into public.course_review_items (
      target_id,
      course_snapshot_id,
      entity_kind,
      field_path,
      issue_code,
      importance,
      is_blocking,
      summary
    )
    select
      targets.id,
      candidates.id,
      'course',
      'course',
      'MANUAL_REVIEW_REQUIRED',
      'high',
      true,
      'Review every imported course before accepting it.'
    from public.course_import_targets as targets
    cross join pipeline_test_candidate as candidates
    where targets.course_code = 'PIPE1000'
  $$,
  'the mandatory overall review item may omit old and new JSON evidence'
);

select extensions.throws_ok(
  $$
    insert into public.course_review_items (
      target_id,
      course_snapshot_id,
      entity_kind,
      field_path,
      issue_code,
      summary
    )
    select
      targets.id,
      candidates.id,
      'course',
      'title',
      'FIELD_CHANGED',
      'No values'
    from public.course_import_targets as targets
    cross join pipeline_test_candidate as candidates
    where targets.course_code = 'PIPE1000'
  $$,
  '23514',
  null,
  'field-level review evidence must describe a real value change'
);

insert into public.course_review_items (
  target_id,
  course_snapshot_id,
  entity_kind,
  field_path,
  issue_code,
  summary,
  old_value,
  new_value,
  source_locator,
  source_excerpt
)
select
  targets.id,
  candidates.id,
  'course',
  'title',
  'FIELD_CHANGED',
  'Title changed',
  to_jsonb('Baseline PIPE1000'::text),
  to_jsonb('Imported PIPE1000'::text),
  'main h1',
  'Imported PIPE1000'
from public.course_import_targets as targets
cross join pipeline_test_candidate as candidates
where targets.course_code = 'PIPE1000';

insert into public.course_attributes (
  course_snapshot_id,
  position,
  attribute_kind,
  value,
  source_text
)
select id, 1, 'stem', 'STEM-designated', 'STEM course classification'
from pipeline_test_candidate;

insert into public.course_unit_options (
  course_snapshot_id,
  position,
  units,
  label,
  source_text
)
select id, 1, 6, 'Standard project', '6 units'
from pipeline_test_candidate
union all
select id, 2, 12, 'Extended project', '12 units'
from pipeline_test_candidate;

select extensions.ok(
  exists (
    select 1
    from public.course_attributes
    where course_snapshot_id = (select id from pipeline_test_candidate)
      and attribute_kind = 'stem'
      and source_text = 'STEM course classification'
  )
  and (
    select array_agg(units order by position)
    from public.course_unit_options
    where course_snapshot_id = (select id from pipeline_test_candidate)
  ) = array[6, 12]::numeric[],
  'STEM attributes and variable-unit choices are stored relationally with source text'
);

insert into public.course_offerings (
  course_snapshot_id,
  academic_year_id,
  course_source_page_id,
  delivery_mode,
  location
)
select
  candidates.id,
  targets.academic_year_id,
  candidates.source_page_id,
  'In person',
  'Acton'
from pipeline_test_candidate as candidates
join public.course_import_targets as targets
  on targets.course_year_id = candidates.course_year_id;

insert into public.offering_sessions (
  course_offering_id,
  academic_period_id,
  course_snapshot_id,
  academic_year_id,
  course_source_page_id,
  position,
  source_text,
  academic_period_code,
  academic_period_name,
  class_number,
  delivery_mode,
  location
)
select
  offerings.id,
  periods.id,
  offerings.course_snapshot_id,
  offerings.academic_year_id,
  offerings.course_source_page_id,
  1,
  'Semester 1, class 1234, Acton',
  periods.code,
  periods.name,
  1234,
  'In person',
  'Acton'
from public.course_offerings as offerings
cross join public.academic_periods as periods
where offerings.course_snapshot_id = (select id from pipeline_test_candidate)
  and periods.calendar_year = 2030
  and periods.code = 'PIPE-S1';

insert into public.offering_sessions (
  course_offering_id,
  academic_period_id,
  course_snapshot_id,
  academic_year_id,
  course_source_page_id,
  position,
  source_text,
  academic_period_code,
  academic_period_name,
  class_number,
  delivery_mode,
  location
)
select
  offerings.id,
  null,
  offerings.course_snapshot_id,
  offerings.academic_year_id,
  offerings.course_source_page_id,
  2,
  'Teaching period 2, dates not published',
  'PIPE-T2',
  'Teaching period 2',
  2345,
  'In person',
  'Acton'
from public.course_offerings as offerings
where offerings.course_snapshot_id = (select id from pipeline_test_candidate);

select extensions.ok(
  exists (
    select 1
    from public.offering_sessions
    where course_snapshot_id = (select id from pipeline_test_candidate)
      and position = 1
      and source_text = 'Semester 1, class 1234, Acton'
      and academic_period_code = 'PIPE-S1'
      and academic_period_name = 'Pipeline Semester 1'
  )
  and exists (
    select 1
    from public.offering_sessions
    where course_snapshot_id = (select id from pipeline_test_candidate)
      and position = 2
      and academic_period_id is null
      and academic_period_code = 'PIPE-T2'
      and academic_period_name = 'Teaching period 2'
  ),
  'snapshot-owned sessions preserve source periods without inventing missing dates'
);

insert into public.course_learning_outcomes (
  course_snapshot_id,
  position,
  body
)
select id, 1, 'Apply pipeline design principles.'
from pipeline_test_candidate;

insert into public.course_assessment_items (
  course_snapshot_id,
  position,
  title,
  weight,
  learning_outcomes,
  source_text,
  hurdle,
  due_text
)
select
  id,
  1,
  'Pipeline project',
  60,
  array[1]::smallint[],
  'Pipeline project (60%, hurdle), due Week 10',
  true,
  'Week 10'
from pipeline_test_candidate;

insert into public.course_assessment_outcomes (
  course_snapshot_id,
  assessment_item_id,
  learning_outcome_id
)
select
  assessments.course_snapshot_id,
  assessments.id,
  outcomes.id
from public.course_assessment_items as assessments
join public.course_learning_outcomes as outcomes
  on outcomes.course_snapshot_id = assessments.course_snapshot_id
 and outcomes.position = 1
where assessments.course_snapshot_id = (select id from pipeline_test_candidate);

select extensions.ok(
  exists (
    select 1
    from public.course_assessment_items
    where course_snapshot_id = (select id from pipeline_test_candidate)
      and hurdle
      and due_text = 'Week 10'
  ),
  'assessment hurdle and due text survive relational projection'
);

insert into public.course_rules (
  course_snapshot_id,
  academic_year_id,
  course_source_page_id,
  rule_kind,
  hardness,
  source_text,
  review_state,
  confidence
)
select
  candidates.id,
  targets.academic_year_id,
  candidates.source_page_id,
  'prerequisite',
  'hard',
  'Prerequisite rule source',
  'review',
  0.9
from pipeline_test_candidate as candidates
join public.course_import_targets as targets
  on targets.course_year_id = candidates.course_year_id;

insert into public.course_rule_groups (
  course_rule_id,
  course_snapshot_id,
  projection_key,
  parent_group_id,
  operator,
  position
)
select id, course_snapshot_id, 'prerequisite:group:root', null, 'all_of', 0
from public.course_rules
where course_snapshot_id = (select id from pipeline_test_candidate);

insert into public.course_rule_conditions (
  course_rule_id,
  course_snapshot_id,
  projection_key,
  group_id,
  condition_kind,
  required_course_id,
  course_requirement_mode,
  minimum_mark,
  hardness,
  source_text,
  confidence,
  review_state,
  position
)
select
  rules.id,
  rules.course_snapshot_id,
  'prerequisite:condition:course',
  groups.id,
  'course',
  courses.id,
  'completed_or_concurrent',
  65,
  'hard',
  'PIPE1001 may be completed concurrently',
  0.95,
  'review',
  0
from public.course_rules as rules
join public.course_rule_groups as groups on groups.course_rule_id = rules.id
join public.courses on courses.code = 'PIPE1001'
where rules.course_snapshot_id = (select id from pipeline_test_candidate);

insert into public.course_rule_conditions (
  course_rule_id,
  course_snapshot_id,
  projection_key,
  group_id,
  condition_kind,
  minimum_units,
  hardness,
  source_text,
  confidence,
  review_state,
  position
)
select
  rules.id,
  rules.course_snapshot_id,
  'prerequisite:condition:set',
  groups.id,
  'course_set_units',
  6,
  'advisory',
  '6 units from PIPE1000 or PIPE1001',
  0.9,
  'review',
  1
from public.course_rules as rules
join public.course_rule_groups as groups on groups.course_rule_id = rules.id
where rules.course_snapshot_id = (select id from pipeline_test_candidate);

insert into public.course_rule_conditions (
  course_rule_id,
  course_snapshot_id,
  projection_key,
  group_id,
  condition_kind,
  minimum_year,
  hardness,
  source_text,
  confidence,
  review_state,
  position
)
select
  rules.id,
  rules.course_snapshot_id,
  'prerequisite:condition:year',
  groups.id,
  'year_standing',
  2,
  'hard',
  'Second-year standing',
  0.98,
  'review',
  2
from public.course_rules as rules
join public.course_rule_groups as groups on groups.course_rule_id = rules.id
where rules.course_snapshot_id = (select id from pipeline_test_candidate);

insert into public.course_rule_conditions (
  course_rule_id,
  course_snapshot_id,
  projection_key,
  group_id,
  condition_kind,
  minimum_wam,
  hardness,
  source_text,
  confidence,
  review_state,
  position
)
select
  rules.id,
  rules.course_snapshot_id,
  'prerequisite:condition:wam',
  groups.id,
  'wam',
  65,
  'advisory',
  'Minimum WAM of 65',
  0.93,
  'review',
  3
from public.course_rules as rules
join public.course_rule_groups as groups on groups.course_rule_id = rules.id
where rules.course_snapshot_id = (select id from pipeline_test_candidate);

insert into public.course_rule_condition_courses (
  condition_id,
  course_snapshot_id,
  position,
  referenced_course_id,
  source_course_code,
  source_text
)
select
  conditions.id,
  conditions.course_snapshot_id,
  selected.position,
  courses.id,
  courses.code,
  courses.code
from public.course_rule_conditions as conditions
cross join (
  values (1, 'PIPE1000'::text), (2, 'PIPE1001'::text)
) as selected(position, code)
join public.courses on courses.code = selected.code
where conditions.course_snapshot_id = (select id from pipeline_test_candidate)
  and conditions.condition_kind = 'course_set_units';

insert into public.course_rule_course_references (
  course_rule_id,
  course_snapshot_id,
  referenced_course_id,
  source_text,
  confidence,
  review_state
)
select
  rules.id,
  rules.course_snapshot_id,
  courses.id,
  'PIPE1001',
  0.95,
  'review'
from public.course_rules as rules
join public.courses on courses.code = 'PIPE1001'
where rules.course_snapshot_id = (select id from pipeline_test_candidate);

select extensions.ok(
  exists (
    select 1
    from public.course_rule_conditions
    where course_snapshot_id = (select id from pipeline_test_candidate)
      and condition_kind = 'course'
      and course_requirement_mode = 'completed_or_concurrent'
      and minimum_mark = 65
      and hardness = 'hard'
  )
  and exists (
    select 1
    from public.course_rule_conditions
    where course_snapshot_id = (select id from pipeline_test_candidate)
      and condition_kind = 'year_standing'
      and minimum_year = 2
  )
  and exists (
    select 1
    from public.course_rule_conditions
    where course_snapshot_id = (select id from pipeline_test_candidate)
      and condition_kind = 'wam'
      and minimum_wam = 65
  ),
  'completion mode, minimum mark, hardness, year standing and WAM stay typed'
);

select extensions.results_eq(
  $$
    select source_course_code
    from public.course_rule_condition_courses
    where course_snapshot_id = (select id from pipeline_test_candidate)
    order by position
  $$,
  $$
    values ('PIPE1000'::text), ('PIPE1001'::text)
  $$,
  'course-set unit rules preserve every explicit source course'
);

select extensions.lives_ok(
  format(
    $sql$
      select private.finish_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1000-attempt-1',
        '62000000-0000-4000-8000-000000000001'::uuid,
        %s,
        'ready_for_review',
        'changed',
        %s,
        %s,
        %s,
        %s,
        null,
        null
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select lock_version from public.course_import_targets where course_code = 'PIPE1000'),
    (select course_id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select course_year_id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select source_page_id from pipeline_test_candidate),
    (select id from pipeline_test_candidate)
  ),
  'a complete changed target finishes as a sealed review candidate'
);

select extensions.ok(
  exists (
    select 1
    from public.course_import_targets as targets
    join public.course_snapshots as snapshots
      on snapshots.id = targets.candidate_snapshot_id
    where targets.course_code = 'PIPE1000'
      and targets.processing_status = 'ready_for_review'
      and targets.review_status = 'pending'
      and snapshots.sealed_at is not null
  ),
  'finished candidates are permanently sealed and pending review'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.ok(
  (select count(*) from public.course_offerings) > 0
  and (select count(*) from public.offering_sessions) > 0
  and (select count(*) from public.course_learning_outcomes) > 0
  and (select count(*) from public.course_assessment_items) > 0
  and (select count(*) from public.course_assessment_outcomes) > 0
  and (select count(*) from public.course_rules) > 0
  and (select count(*) from public.course_rule_groups) > 0
  and (select count(*) from public.course_rule_conditions) > 0
  and (select count(*) from public.course_rule_course_references) > 0,
  'an import administrator can inspect every snapshot-native rich child of a sealed candidate'
);

reset role;
set local role service_role;

select extensions.ok(
  exists (
    select 1
    from public.course_import_targets as targets
    join public.course_years as course_years
      on course_years.id = targets.course_year_id
    where targets.course_code = 'PIPE1000'
      and course_years.draft_snapshot_id = targets.baseline_draft_snapshot_id
      and course_years.published_snapshot_id
        is not distinct from targets.baseline_published_snapshot_id
  ),
  'finishing an import changes neither draft nor published pointers'
);

select extensions.throws_ok(
  $$
    update public.offering_sessions
    set source_text = 'changed after seal'
    where course_snapshot_id = (select id from pipeline_test_candidate)
  $$,
  '55000',
  null,
  'nested snapshot-owned rows cannot mutate after the permanent seal'
);

select extensions.throws_ok(
  $$
    insert into public.course_unit_options (
      course_snapshot_id,
      position,
      units,
      source_text
    )
    select id, 3, 18, '18 units'
    from pipeline_test_candidate
  $$,
  '55000',
  null,
  'new immutable child rows cannot be appended after the snapshot is sealed'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  format(
    $sql$
      select public.accept_course_import_target(
        %L::uuid,
        %s,
        %s,
        null
      )
    $sql$,
    (select id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select baseline_draft_snapshot_id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select baseline_draft_snapshot_id from pipeline_test_targets where course_code = 'PIPE1000')
  ),
  '42501',
  'Course import management permission is required.',
  'a student cannot accept an imported candidate'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  format(
    $sql$
      select public.accept_course_import_target(
        %L::uuid,
        %s,
        %s,
        null
      )
    $sql$,
    (select id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select baseline_draft_snapshot_id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select id from pipeline_test_candidate)
  ),
  '40001',
  'The course changed after this import began. Review against a new baseline.',
  'acceptance rejects a stale expected current draft pointer'
);

select extensions.lives_ok(
  format(
    $sql$
      select public.accept_course_import_target(
        %L::uuid,
        %s,
        %s,
        'Reviewed against the original ANU page.'
      )
    $sql$,
    (select id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select baseline_draft_snapshot_id from pipeline_test_targets where course_code = 'PIPE1000'),
    (select baseline_draft_snapshot_id from pipeline_test_targets where course_code = 'PIPE1000')
  ),
  'an administrator can accept a candidate against an unchanged baseline'
);

select extensions.ok(
  exists (
    select 1
    from public.course_import_targets as targets
    join public.course_years as course_years
      on course_years.id = targets.course_year_id
    where targets.course_code = 'PIPE1000'
      and targets.review_status = 'accepted'
      and course_years.draft_snapshot_id = targets.candidate_snapshot_id
      and course_years.published_snapshot_id
        is not distinct from targets.baseline_published_snapshot_id
      and not exists (
        select 1
        from public.course_review_items
        where target_id = targets.id
          and status = 'open'
      )
  ),
  'acceptance moves only the draft pointer and resolves all review items'
);

select extensions.ok(
  exists (
    select 1
    from public.course_import_runs as runs
    where runs.id = (select id from pipeline_test_run)
      and runs.ready_for_review_count = 0
      and runs.processed_count = 1
  ),
  'the run review total counts only candidates still awaiting a decision'
);

reset role;
set local role service_role;

insert into public.course_source_pages (
  source_id,
  academic_year_id,
  page_kind,
  external_key,
  canonical_url,
  media_type,
  content_sha256,
  http_status,
  byte_size,
  storage_bucket,
  storage_path
)
select
  targets.source_id,
  targets.academic_year_id,
  'course_page',
  targets.course_code,
  'https://pipeline.example.test/2030/course/PIPE1001',
  'text/html',
  repeat('f', 64),
  200,
  400,
  'course-import-artifacts',
  'sources/2030/PIPE1001/' || repeat('f', 64) || '.html'
from public.course_import_targets as targets
where targets.course_code = 'PIPE1001';

select extensions.lives_ok(
  format(
    $sql$
      select * from private.claim_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1001-attempt-1',
        '62000000-0000-4000-8000-000000000001'::uuid,
        600
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1001')
  ),
  'the worker can claim the second target'
);

update public.course_import_stages
set status = 'running', started_at = statement_timestamp()
where target_id = (
  select id from pipeline_test_targets where course_code = 'PIPE1001'
)
  and position = 1;

update public.course_import_stages
set status = 'succeeded', completed_at = statement_timestamp()
where target_id = (
  select id from pipeline_test_targets where course_code = 'PIPE1001'
)
  and position = 1;

update public.course_import_targets
set lease_expires_at = statement_timestamp() - interval '1 second'
where course_code = 'PIPE1001';

select extensions.lives_ok(
  format(
    $sql$
      select * from private.claim_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1001-attempt-2',
        '62000000-0000-4000-8000-000000000002'::uuid,
        600
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1001')
  ),
  'an expired lease can be reclaimed as a later target attempt'
);

update public.course_import_stages
set
  status = 'running',
  started_at = statement_timestamp(),
  completed_at = null
where target_id = (
  select id from pipeline_test_targets where course_code = 'PIPE1001'
)
  and position = 1;

select extensions.ok(
  exists (
    select 1
    from public.course_import_stages as stages
    join public.course_import_targets as targets
      on targets.id = stages.target_id
    where targets.course_code = 'PIPE1001'
      and targets.attempt_count = 2
      and stages.position = 1
      and stages.status = 'running'
      and stages.attempt_count = 2
  ),
  'completed deterministic stages can restart only on a later target attempt'
);

update public.course_import_stages
set status = 'succeeded', completed_at = statement_timestamp()
where target_id = (
  select id from pipeline_test_targets where course_code = 'PIPE1001'
)
  and position = 1;

do $complete_retry_stages$
declare
  selected_stage record;
begin
  for selected_stage in
    select stages.id
    from public.course_import_stages as stages
    join public.course_import_targets as targets
      on targets.id = stages.target_id
    where targets.course_code = 'PIPE1001'
      and stages.position > 1
    order by stages.position
  loop
    update public.course_import_stages
    set status = 'running', started_at = statement_timestamp()
    where id = selected_stage.id;

    update public.course_import_stages
    set status = 'succeeded', completed_at = statement_timestamp()
    where id = selected_stage.id;
  end loop;
end;
$complete_retry_stages$;

select extensions.lives_ok(
  format(
    $sql$
      select private.finish_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1001-attempt-2',
        '62000000-0000-4000-8000-000000000002'::uuid,
        %s,
        'unchanged',
        'unchanged',
        %s,
        %s,
        %s,
        null,
        null,
        null
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1001'),
    (select lock_version from public.course_import_targets where course_code = 'PIPE1001'),
    (select course_id from pipeline_test_targets where course_code = 'PIPE1001'),
    (select course_year_id from pipeline_test_targets where course_code = 'PIPE1001'),
    (
      select id
      from public.course_source_pages
      where external_key = 'PIPE1001'
        and page_kind = 'course_page'
    )
  ),
  'an unchanged target finishes without creating or reviewing a snapshot'
);

select extensions.ok(
  exists (
    select 1
    from public.course_import_runs
    where id = (select id from pipeline_test_run)
      and status = 'succeeded'
      and processed_count = 2
      and ready_for_review_count = 0
      and unchanged_count = 1
      and failed_count = 0
      and extraction_count = 2
      and actual_cost_usd = 0.000123
  ),
  'the run closes with accurate outcomes and extraction cost totals'
);

select extensions.throws_ok(
  format(
    $sql$
      select * from private.claim_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-after-finish',
        '62000000-0000-4000-8000-000000000003'::uuid,
        600
      )
    $sql$,
    (select id from pipeline_test_run),
    (select id from pipeline_test_targets where course_code = 'PIPE1001')
  ),
  '55000',
  null,
  'a final target cannot be claimed again'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.is(
  (select count(*) from public.course_import_runs),
  0::bigint,
  'students cannot read import workflow state'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.ok(
  (select count(*) from public.course_import_runs) = 1
  and (select count(*) from public.course_import_artifacts) = 7,
  'an import administrator can inspect workflow and private artefact metadata'
);

select extensions.lives_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1001'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  'a new import can start after the previous run reaches a final state'
);

reset role;

create temporary table pipeline_reject_run on commit drop as
select id
from public.course_import_runs
where status = 'queued'
order by created_at desc
limit 1;

create temporary table pipeline_reject_target on commit drop as
select
  id,
  course_id,
  course_year_id,
  baseline_draft_snapshot_id,
  baseline_published_snapshot_id
from public.course_import_targets
where run_id = (select id from pipeline_reject_run);

update public.course_import_targets
set created_at = clock_timestamp() + interval '1 second'
where id = (select id from pipeline_reject_target);

select extensions.ok(
  exists (
    select 1
    from public.course_directory_admin_entries as entries
    where entries.code = 'PIPE1001'
      and entries.latest_target_id = (select id from pipeline_reject_target)
      and entries.latest_processing_status = 'queued'
  ),
  'directory status comes from the latest target rather than older accepted history'
);

grant select on pipeline_reject_run, pipeline_reject_target
to service_role, authenticated;

do $claim_reject_target$
begin
  perform private.claim_course_import_target(
    (select id from pipeline_reject_run),
    (select id from pipeline_reject_target),
    'message-reject-attempt-1',
    '62000000-0000-4000-8000-000000000004'::uuid,
    600
  );
end;
$claim_reject_target$;

do $complete_reject_stages$
declare
  selected_stage record;
begin
  for selected_stage in
    select id
    from public.course_import_stages
    where target_id = (select id from pipeline_reject_target)
    order by position
  loop
    update public.course_import_stages
    set status = 'running', started_at = statement_timestamp()
    where id = selected_stage.id;

    update public.course_import_stages
    set status = 'succeeded', completed_at = statement_timestamp()
    where id = selected_stage.id;
  end loop;
end;
$complete_reject_stages$;

insert into public.course_snapshots (
  course_year_id,
  academic_year_id,
  snapshot_number,
  origin,
  based_on_snapshot_id,
  source_page_id,
  projection_sha256,
  validation_status,
  overall_confidence,
  title,
  units,
  level,
  subject_code,
  offering_status,
  created_by
)
select
  targets.course_year_id,
  targets.academic_year_id,
  2,
  'import',
  targets.baseline_draft_snapshot_id,
  documents.id,
  repeat('c', 64),
  'valid',
  0.99,
  'Rejected PIPE1001 candidate',
  6,
  1000,
  'PIPE',
  'offered',
  runs.initiated_by
from public.course_import_targets as targets
join public.course_import_runs as runs on runs.id = targets.run_id
join public.course_source_pages as documents
  on documents.academic_year_id = targets.academic_year_id
 and documents.external_key = targets.course_code
 and documents.page_kind = 'course_page'
where targets.id = (select id from pipeline_reject_target);

create temporary table pipeline_reject_candidate on commit drop as
select snapshots.id, snapshots.source_page_id
from public.course_snapshots as snapshots
where snapshots.course_year_id = (
  select course_year_id from pipeline_reject_target
)
  and snapshots.snapshot_number = 2;

grant select on pipeline_reject_candidate to service_role, authenticated;

insert into public.course_review_items (
  target_id,
  course_snapshot_id,
  entity_kind,
  field_path,
  issue_code,
  importance,
  is_blocking,
  summary
)
select
  targets.id,
  candidates.id,
  'course',
  'course',
  'MANUAL_REVIEW_REQUIRED',
  'high',
  true,
  'Review the repeated projection with its new provenance.'
from pipeline_reject_target as targets
cross join pipeline_reject_candidate as candidates;

do $finish_reject_target$
begin
  perform private.finish_course_import_target(
    (select id from pipeline_reject_run),
    (select id from pipeline_reject_target),
    'message-reject-attempt-1',
    '62000000-0000-4000-8000-000000000004'::uuid,
    (
      select lock_version
      from public.course_import_targets
      where id = (select id from pipeline_reject_target)
    ),
    'ready_for_review',
    'changed',
    (select course_id from pipeline_reject_target),
    (select course_year_id from pipeline_reject_target),
    (select source_page_id from pipeline_reject_candidate),
    (select id from pipeline_reject_candidate),
    null,
    null
  );
end;
$finish_reject_target$;

insert into public.course_snapshots (
  course_year_id,
  academic_year_id,
  snapshot_number,
  origin,
  based_on_snapshot_id,
  source_page_id,
  projection_sha256,
  validation_status,
  title,
  units,
  level,
  subject_code,
  offering_status,
  created_by
)
select
  snapshots.course_year_id,
  snapshots.academic_year_id,
  3,
  'manual_edit',
  snapshots.id,
  snapshots.source_page_id,
  repeat('e', 64),
  'valid',
  'Concurrent manual PIPE1001 draft',
  snapshots.units,
  snapshots.level,
  snapshots.subject_code,
  snapshots.offering_status,
  '61000000-0000-4000-8000-000000000001'::uuid
from public.course_snapshots as snapshots
where snapshots.id = (
  select baseline_draft_snapshot_id from pipeline_reject_target
);

create temporary table pipeline_reject_changed_draft on commit drop as
select snapshots.id
from public.course_snapshots as snapshots
where snapshots.course_year_id = (
  select course_year_id from pipeline_reject_target
)
  and snapshots.snapshot_number = 3;

grant select on pipeline_reject_changed_draft to authenticated;

update public.course_years
set draft_snapshot_id = (select id from pipeline_reject_changed_draft)
where id = (select course_year_id from pipeline_reject_target);

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  format(
    $sql$
      select public.reject_course_import_target(
        %L::uuid,
        'The source evidence was not sufficient.'
      )
    $sql$,
    (select id from pipeline_reject_target)
  ),
  'an administrator can reject a sealed candidate after the course draft changes'
);

select extensions.ok(
  exists (
    select 1
    from public.course_import_targets as targets
    join public.course_years as course_years
      on course_years.id = targets.course_year_id
    where targets.id = (select id from pipeline_reject_target)
      and targets.review_status = 'rejected'
      and course_years.draft_snapshot_id = (
        select id from pipeline_reject_changed_draft
      )
      and course_years.published_snapshot_id
        is not distinct from targets.baseline_published_snapshot_id
      and not exists (
        select 1
        from public.course_review_items
        where target_id = targets.id
          and status <> 'rejected'
      )
  ),
  'rejection resolves review items and leaves newer draft and published pointers untouched'
);

reset role;

insert into public.courses (code) values ('PIPE1002');

insert into public.course_directory_entries (
  academic_year_id,
  code,
  title,
  units,
  source_page_id
)
select
  years.id,
  'PIPE1002',
  'Directory PIPE1002',
  6,
  documents.id
from public.academic_years as years
join public.course_source_pages as documents
  on documents.academic_year_id = years.id
 and documents.page_kind = 'course_directory'
where years.year = 2030
  and documents.source_id = (
    select id
    from public.course_sources
    where kind = 'course_import_pipeline_test'
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1002'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  'an unlinked directory course can start its first durable import'
);

reset role;

create temporary table pipeline_unlinked_run on commit drop as
select runs.id
from public.course_import_runs as runs
join public.course_import_targets as targets on targets.run_id = runs.id
where targets.course_code = 'PIPE1002';

create temporary table pipeline_unlinked_target on commit drop as
select targets.id
from public.course_import_targets as targets
where targets.run_id = (select id from pipeline_unlinked_run);

grant select on pipeline_unlinked_run, pipeline_unlinked_target to service_role;

set local role service_role;

select extensions.lives_ok(
  format(
    $sql$
      select * from private.claim_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1002-attempt-1',
        '62000000-0000-4000-8000-000000000005'::uuid,
        600
      )
    $sql$,
    (select id from pipeline_unlinked_run),
    (select id from pipeline_unlinked_target)
  ),
  'a worker can claim a first import before the directory has a course identity'
);

select extensions.throws_ok(
  $$
    update public.course_import_targets
    set course_id = (
      select id from public.courses where code = 'PIPE1000'
    )
    where id = (select id from pipeline_unlinked_target)
  $$,
  '23503',
  'course import target course identity does not match its code',
  'an unlinked directory cannot be used to attach the wrong course identity'
);

update public.course_directory_entries
set
  course_id = (select id from public.courses where code = 'PIPE1002'),
  is_current = false
where academic_year_id = (
    select id from public.academic_years where year = 2030
  )
  and code = 'PIPE1002';

select extensions.lives_ok(
  format(
    $sql$
      select * from private.heartbeat_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1002-attempt-1',
        '62000000-0000-4000-8000-000000000005'::uuid,
        1,
        600
      )
    $sql$,
    (select id from pipeline_unlinked_run),
    (select id from pipeline_unlinked_target)
  ),
  'a claimed target stays retryable after persistence links and refresh retires its directory row'
);

select extensions.lives_ok(
  format(
    $sql$
      select private.finish_course_import_target(
        %L::uuid,
        %L::uuid,
        'message-pipe-1002-attempt-1',
        '62000000-0000-4000-8000-000000000005'::uuid,
        2,
        'failed',
        null,
        null,
        null,
        null,
        null,
        'TEST_FAILURE',
        'Intentional first-import retry regression completion.'
      )
    $sql$,
    (select id from pipeline_unlinked_run),
    (select id from pipeline_unlinked_target)
  ),
  'a target with null identity can still finish after its directory row is linked'
);

select extensions.lives_ok(
  $$
    with inserted_course as (
      insert into public.courses (code)
      values ('PIPE1003F')
      returning id, code
    )
    insert into public.course_directory_entries (
      academic_year_id,
      course_id,
      code,
      title,
      units,
      source_page_id
    )
    select
      years.id,
      courses.id,
      courses.code,
      'Directory PIPE1003F',
      6,
      documents.id
    from inserted_course as courses
    cross join public.academic_years as years
    join public.course_source_pages as documents
      on documents.academic_year_id = years.id
     and documents.page_kind = 'course_directory'
    where years.year = 2030
      and documents.source_id = (
        select id
        from public.course_sources
        where kind = 'course_import_pipeline_test'
      )
  $$,
  'course identities and directory rows accept an ANU variant suffix'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    select public.start_course_import(
      2030::smallint,
      array['PIPE1003F'],
      'google/gemini-test',
      'parser.v1',
      'prompt.v1',
      'course-snapshot.v1'
    )
  $$,
  'an administrator can start an import for an ANU variant course code'
);

reset role;

select * from extensions.finish();

rollback;
