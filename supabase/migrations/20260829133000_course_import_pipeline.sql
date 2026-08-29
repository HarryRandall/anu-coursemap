-- Durable, review-first course imports. The database owns workflow state while
-- an external worker performs fetching, parsing and model calls. Canonical
-- course data remains relational and publication always remains explicit.

-- The foundation migration used "document" terminology while the agreed
-- course model calls these immutable fetches source pages. Rename the table,
-- its course-only foreign-key columns and every inherited database object
-- before the durable pipeline is added. The generic catalogue source document
-- table remains unchanged for the university calendar and future programmes.
alter table public.course_source_documents
  rename to course_source_pages;

alter sequence public.course_source_documents_id_seq
  rename to course_source_pages_id_seq;

alter table public.course_source_pages
  rename column document_kind to page_kind;

alter table public.course_source_pages
  rename constraint course_source_documents_pkey
    to course_source_pages_pkey;
alter table public.course_source_pages
  rename constraint course_source_documents_source_id_fkey
    to course_source_pages_source_id_fkey;
alter table public.course_source_pages
  rename constraint course_source_documents_academic_year_id_fkey
    to course_source_pages_academic_year_id_fkey;
alter table public.course_source_pages
  rename constraint course_source_documents_id_year_unique
    to course_source_pages_id_year_unique;
alter table public.course_source_pages
  rename constraint course_source_documents_snapshot_unique
    to course_source_pages_snapshot_unique;
alter table public.course_source_pages
  rename constraint course_source_documents_document_kind_check
    to course_source_pages_page_kind_check;
alter table public.course_source_pages
  rename constraint course_source_documents_external_key_not_blank_check
    to course_source_pages_external_key_not_blank_check;
alter table public.course_source_pages
  rename constraint course_source_documents_canonical_url_check
    to course_source_pages_canonical_url_check;
alter table public.course_source_pages
  rename constraint course_source_documents_media_type_not_blank_check
    to course_source_pages_media_type_not_blank_check;
alter table public.course_source_pages
  rename constraint course_source_documents_content_sha256_check
    to course_source_pages_content_sha256_check;
alter table public.course_source_pages
  rename constraint course_source_documents_http_status_check
    to course_source_pages_http_status_check;
alter table public.course_source_pages
  rename constraint course_source_documents_byte_size_check
    to course_source_pages_byte_size_check;
alter table public.course_source_pages
  rename constraint course_source_documents_storage_check
    to course_source_pages_storage_check;

alter index public.course_source_documents_academic_year_id_idx
  rename to course_source_pages_academic_year_id_idx;
alter trigger course_source_documents_reject_mutation
  on public.course_source_pages rename to course_source_pages_reject_mutation;
alter policy course_source_documents_import_admin_read
  on public.course_source_pages rename to course_source_pages_import_admin_read;
alter policy course_source_documents_import_admin_insert
  on public.course_source_pages rename to course_source_pages_import_admin_insert;

alter table public.course_directory_entries
  rename column source_document_id to source_page_id;
alter table public.course_directory_entries
  rename constraint course_directory_entries_source_document_year_fkey
    to course_directory_entries_source_page_year_fkey;
alter index public.course_directory_entries_source_document_year_idx
  rename to course_directory_entries_source_page_year_idx;

alter table public.course_snapshots
  rename column source_document_id to source_page_id;
alter table public.course_snapshots
  rename constraint course_snapshots_source_document_year_fkey
    to course_snapshots_source_page_year_fkey;
alter index public.course_snapshots_source_document_year_idx
  rename to course_snapshots_source_page_year_idx;

alter table public.course_snapshot_field_evidence
  rename column source_document_id to source_page_id;
alter table public.course_snapshot_field_evidence
  rename constraint course_snapshot_field_evidence_source_document_year_fkey
    to course_snapshot_field_evidence_source_page_year_fkey;
alter index public.course_snapshot_field_evidence_source_document_year_idx
  rename to course_snapshot_field_evidence_source_page_year_idx;

-- ANU course identities may carry one uppercase variant suffix, for example
-- COMP8900F or COMP8900P. Keep every live identity and source-code constraint
-- aligned before the import pipeline starts writing suffixed courses.
alter table public.courses
  drop constraint courses_code_format_check,
  add constraint courses_code_format_check check (
    code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  );

alter table public.catalogue_directory_courses
  drop constraint catalogue_directory_courses_code_check,
  add constraint catalogue_directory_courses_code_check check (
    code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  );

alter table public.course_directory_entries
  drop constraint course_directory_entries_code_check,
  add constraint course_directory_entries_code_check check (
    code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  );

alter table public.course_related_courses
  drop constraint course_related_courses_source_course_code_check,
  add constraint course_related_courses_source_course_code_check check (
    source_course_code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  );

create table public.course_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id bigint not null,
  academic_year_id bigint not null,
  status text not null default 'queued',
  requested_model text not null,
  parser_version text not null,
  prompt_version text not null,
  schema_version text not null,
  initiated_by uuid,
  target_count smallint not null,
  processed_count smallint not null default 0,
  ready_for_review_count smallint not null default 0,
  unchanged_count smallint not null default 0,
  failed_count smallint not null default 0,
  extraction_count integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  actual_cost_usd numeric(12, 6) not null default 0,
  started_at timestamptz,
  heartbeat_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_import_runs_source_id_fkey
    foreign key (source_id) references public.course_sources (id),
  constraint course_import_runs_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years (id),
  constraint course_import_runs_initiated_by_fkey
    foreign key (initiated_by) references auth.users (id) on delete set null,
  constraint course_import_runs_id_provenance_unique unique (
    id,
    source_id,
    academic_year_id
  ),
  constraint course_import_runs_status_check check (
    status in (
      'queued',
      'running',
      'succeeded',
      'partially_succeeded',
      'failed',
      'cancelled'
    )
  ),
  constraint course_import_runs_requested_model_not_blank_check check (
    btrim(requested_model) <> ''
  ),
  constraint course_import_runs_versions_not_blank_check check (
    btrim(parser_version) <> ''
    and btrim(prompt_version) <> ''
    and btrim(schema_version) <> ''
  ),
  constraint course_import_runs_target_count_check check (
    target_count between 1 and 10
  ),
  constraint course_import_runs_counts_check check (
    processed_count between 0 and target_count
    and ready_for_review_count between 0 and target_count
    and unchanged_count between 0 and target_count
    and failed_count between 0 and target_count
    and ready_for_review_count + unchanged_count + failed_count
      <= processed_count
    and extraction_count >= 0
    and input_tokens >= 0
    and output_tokens >= 0
    and actual_cost_usd >= 0
  ),
  constraint course_import_runs_lifecycle_check check (
    (
      status = 'queued'
      and started_at is null
      and completed_at is null
    )
    or (
      status = 'running'
      and started_at is not null
      and completed_at is null
    )
    or (
      status in (
        'succeeded',
        'partially_succeeded',
        'failed',
        'cancelled'
      )
      and completed_at is not null
    )
  ),
  constraint course_import_runs_error_summary_check check (
    error_summary is null or btrim(error_summary) <> ''
  )
);

create unique index course_import_runs_one_active_idx
  on public.course_import_runs ((true))
  where status in ('queued', 'running');

-- A projection hash is a comparison aid, not identity. The same canonical
-- content may legitimately recur with new provenance after intervening edits.
drop index public.course_snapshots_projection_sha256_idx;

create index course_snapshots_projection_sha256_idx
  on public.course_snapshots (course_year_id, projection_sha256)
  where projection_sha256 is not null;

alter table public.course_directory_entries
  add constraint course_directory_entries_id_year_code_unique
    unique (id, academic_year_id, code);

alter table public.course_years
  add constraint course_years_id_course_year_unique
    unique (id, course_id, academic_year_id);

create table public.course_import_targets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  source_id bigint not null,
  academic_year_id bigint not null,
  directory_entry_id bigint not null,
  position smallint not null,
  course_code text not null,
  course_id bigint,
  course_year_id bigint,
  source_page_id bigint,
  baseline_draft_snapshot_id bigint,
  baseline_published_snapshot_id bigint,
  candidate_snapshot_id bigint,
  processing_status text not null default 'queued',
  review_status text not null default 'not_ready',
  change_kind text,
  worker_id uuid,
  queue_message_id text,
  dispatched_at timestamptz,
  dispatch_error text,
  lease_expires_at timestamptz,
  lock_version integer not null default 0,
  attempt_count smallint not null default 0,
  error_code text,
  error_summary text,
  claimed_at timestamptz,
  heartbeat_at timestamptz,
  finished_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_import_targets_run_provenance_fkey
    foreign key (run_id, source_id, academic_year_id)
    references public.course_import_runs (id, source_id, academic_year_id)
    on delete cascade,
  constraint course_import_targets_directory_provenance_fkey
    foreign key (directory_entry_id, academic_year_id, course_code)
    references public.course_directory_entries (id, academic_year_id, code),
  constraint course_import_targets_directory_year_code_fkey
    foreign key (academic_year_id, course_code)
    references public.course_directory_entries (academic_year_id, code),
  constraint course_import_targets_course_id_fkey
    foreign key (course_id) references public.courses (id),
  constraint course_import_targets_course_year_provenance_fkey
    foreign key (course_year_id, course_id, academic_year_id)
    references public.course_years (id, course_id, academic_year_id),
  constraint course_import_targets_source_page_year_fkey
    foreign key (source_page_id, academic_year_id)
    references public.course_source_pages (id, academic_year_id),
  constraint course_import_targets_baseline_draft_fkey
    foreign key (baseline_draft_snapshot_id, course_year_id)
    references public.course_snapshots (id, course_year_id),
  constraint course_import_targets_baseline_published_fkey
    foreign key (baseline_published_snapshot_id, course_year_id)
    references public.course_snapshots (id, course_year_id),
  constraint course_import_targets_candidate_snapshot_fkey
    foreign key (candidate_snapshot_id, course_year_id)
    references public.course_snapshots (id, course_year_id),
  constraint course_import_targets_reviewed_by_fkey
    foreign key (reviewed_by) references auth.users (id) on delete set null,
  constraint course_import_targets_run_code_unique unique (
    run_id,
    course_code
  ),
  constraint course_import_targets_run_position_unique unique (
    run_id,
    position
  ),
  constraint course_import_targets_id_run_unique unique (id, run_id),
  constraint course_import_targets_id_year_unique unique (
    id,
    academic_year_id
  ),
  constraint course_import_targets_code_check check (
    course_code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  ),
  constraint course_import_targets_position_check check (
    position between 1 and 10
  ),
  constraint course_import_targets_processing_status_check check (
    processing_status in (
      'queued',
      'processing',
      'ready_for_review',
      'unchanged',
      'failed',
      'cancelled'
    )
  ),
  constraint course_import_targets_review_status_check check (
    review_status in (
      'not_ready',
      'pending',
      'accepted',
      'rejected',
      'not_required'
    )
  ),
  constraint course_import_targets_change_kind_check check (
    change_kind is null or change_kind in ('new', 'changed', 'unchanged')
  ),
  constraint course_import_targets_course_year_path_check check (
    course_year_id is null or course_id is not null
  ),
  constraint course_import_targets_candidate_path_check check (
    candidate_snapshot_id is null or course_year_id is not null
  ),
  constraint course_import_targets_lock_version_check check (lock_version >= 0),
  constraint course_import_targets_attempt_count_check check (attempt_count >= 0),
  constraint course_import_targets_queue_message_id_check check (
    queue_message_id is null or btrim(queue_message_id) <> ''
  ),
  constraint course_import_targets_dispatch_error_check check (
    dispatch_error is null or btrim(dispatch_error) <> ''
  ),
  constraint course_import_targets_error_check check (
    (error_code is null or btrim(error_code) <> '')
    and (error_summary is null or btrim(error_summary) <> '')
  ),
  constraint course_import_targets_processing_state_check check (
    (
      processing_status = 'queued'
      and review_status = 'not_ready'
      and change_kind is null
      and finished_at is null
    )
    or (
      processing_status = 'processing'
      and review_status = 'not_ready'
      and change_kind is null
      and worker_id is not null
      and queue_message_id is not null
      and lease_expires_at is not null
      and claimed_at is not null
      and heartbeat_at is not null
      and finished_at is null
    )
    or (
      processing_status = 'ready_for_review'
      and review_status in ('pending', 'accepted', 'rejected')
      and change_kind in ('new', 'changed')
      and candidate_snapshot_id is not null
      and finished_at is not null
    )
    or (
      processing_status = 'unchanged'
      and review_status = 'not_required'
      and change_kind = 'unchanged'
      and candidate_snapshot_id is null
      and finished_at is not null
    )
    or (
      processing_status in ('failed', 'cancelled')
      and review_status = 'not_required'
      and change_kind is null
      and candidate_snapshot_id is null
      and finished_at is not null
    )
  ),
  constraint course_import_targets_review_resolution_check check (
    (
      review_status in ('not_ready', 'pending', 'not_required')
      and reviewed_by is null
      and reviewed_at is null
    )
    or (
      review_status in ('accepted', 'rejected')
      and reviewed_by is not null
      and reviewed_at is not null
    )
  )
);

create unique index course_import_targets_queue_message_idx
  on public.course_import_targets (queue_message_id)
  where queue_message_id is not null;

-- The directory workspace always reflects the newest target for each
-- course/year row. Keeping this selection in Postgres avoids both historical
-- status matches and application-side result caps.
create view public.course_directory_latest_import_targets
with (security_invoker = true)
as
select distinct on (targets.directory_entry_id)
  targets.id,
  targets.run_id,
  targets.academic_year_id,
  targets.directory_entry_id,
  targets.processing_status,
  targets.review_status,
  targets.change_kind,
  targets.error_summary,
  targets.created_at
from public.course_import_targets as targets
order by
  targets.directory_entry_id,
  targets.created_at desc,
  targets.id desc;

create view public.course_directory_admin_entries
with (security_invoker = true)
as
select
  entries.id,
  entries.academic_year_id,
  entries.code,
  entries.title,
  entries.units,
  entries.academic_career,
  entries.session,
  entries.mode_of_delivery,
  entries.first_seen_at,
  entries.last_seen_at,
  entries.is_current,
  entries.course_id,
  course_years.id as course_year_id,
  course_years.draft_snapshot_id,
  course_years.published_snapshot_id,
  latest.id as latest_target_id,
  latest.run_id as latest_run_id,
  latest.processing_status as latest_processing_status,
  latest.review_status as latest_review_status,
  latest.change_kind as latest_change_kind,
  latest.error_summary as latest_error_summary,
  latest.created_at as latest_created_at
from public.course_directory_entries as entries
left join public.course_years as course_years
  on course_years.course_id = entries.course_id
 and course_years.academic_year_id = entries.academic_year_id
left join public.course_directory_latest_import_targets as latest
  on latest.directory_entry_id = entries.id;

create table public.course_import_stages (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null,
  stage_name text not null,
  position smallint not null,
  status text not null default 'queued',
  attempt_count smallint not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_import_stages_target_id_fkey
    foreign key (target_id)
    references public.course_import_targets (id) on delete cascade,
  constraint course_import_stages_target_name_unique unique (
    target_id,
    stage_name
  ),
  constraint course_import_stages_id_target_unique unique (id, target_id),
  constraint course_import_stages_name_position_check check (
    (stage_name = 'source_fetch' and position = 1)
    or (stage_name = 'html_capture' and position = 2)
    or (stage_name = 'markdown_normalise' and position = 3)
    or (stage_name = 'model_input_prepare' and position = 4)
    or (stage_name = 'deterministic_extract' and position = 5)
    or (stage_name = 'model_extract' and position = 6)
    or (stage_name = 'schema_validate' and position = 7)
    or (stage_name = 'domain_validate' and position = 8)
    or (stage_name = 'database_project' and position = 9)
    or (stage_name = 'snapshot_persist' and position = 10)
  ),
  constraint course_import_stages_status_check check (
    status in ('queued', 'running', 'succeeded', 'failed', 'skipped')
  ),
  constraint course_import_stages_attempt_count_check check (
    attempt_count >= 0
  ),
  constraint course_import_stages_lifecycle_check check (
    (
      status = 'queued'
      and started_at is null
      and completed_at is null
    )
    or (
      status = 'running'
      and started_at is not null
      and completed_at is null
    )
    or (
      status in ('succeeded', 'failed', 'skipped')
      and completed_at is not null
    )
  ),
  constraint course_import_stages_error_check check (
    (error_code is null or btrim(error_code) <> '')
    and (error_summary is null or btrim(error_summary) <> '')
    and (status <> 'failed' or error_summary is not null)
  )
);

create table public.course_import_artifacts (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null,
  stage_id uuid,
  artifact_kind text not null,
  attempt_number smallint not null default 1,
  media_type text not null,
  content_sha256 text not null,
  byte_size bigint not null,
  storage_bucket text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint course_import_artifacts_target_id_fkey
    foreign key (target_id)
    references public.course_import_targets (id) on delete cascade,
  constraint course_import_artifacts_stage_target_fkey
    foreign key (stage_id, target_id)
    references public.course_import_stages (id, target_id),
  constraint course_import_artifacts_id_target_unique unique (id, target_id),
  constraint course_import_artifacts_target_kind_attempt_unique unique (
    target_id,
    artifact_kind,
    attempt_number
  ),
  constraint course_import_artifacts_kind_check check (
    artifact_kind in (
      'raw_html',
      'normalised_markdown',
      'model_input',
      'deterministic_output',
      'model_request',
      'model_response',
      'validated_json',
      'validation_report',
      'database_projection',
      'change_set'
    )
  ),
  constraint course_import_artifacts_attempt_number_check check (
    attempt_number > 0
  ),
  constraint course_import_artifacts_media_type_not_blank_check check (
    btrim(media_type) <> ''
  ),
  constraint course_import_artifacts_content_sha256_check check (
    content_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint course_import_artifacts_byte_size_check check (byte_size >= 0),
  constraint course_import_artifacts_content_location_check check (
    btrim(storage_bucket) <> '' and btrim(storage_path) <> ''
  )
);

create table public.course_extractions (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null,
  extraction_number smallint not null,
  provider text not null default 'openrouter',
  requested_model text not null,
  resolved_model text,
  extraction_fingerprint text not null,
  reused_from_extraction_id uuid,
  prompt_version text not null,
  schema_version text not null,
  request_artifact_id uuid not null,
  response_artifact_id uuid,
  validated_artifact_id uuid,
  provider_request_id text,
  finish_reason text,
  validation_status text not null default 'pending',
  schema_valid boolean,
  domain_valid boolean,
  warning_count integer not null default 0,
  error_count integer not null default 0,
  input_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  reasoning_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  cost_source text not null default 'unknown',
  latency_ms integer,
  started_at timestamptz not null,
  completed_at timestamptz,
  error_summary text,
  created_at timestamptz not null default now(),
  constraint course_extractions_target_id_fkey
    foreign key (target_id)
    references public.course_import_targets (id) on delete cascade,
  constraint course_extractions_reused_from_extraction_id_fkey
    foreign key (reused_from_extraction_id)
    references public.course_extractions (id),
  constraint course_extractions_request_artifact_fkey
    foreign key (request_artifact_id, target_id)
    references public.course_import_artifacts (id, target_id),
  constraint course_extractions_response_artifact_fkey
    foreign key (response_artifact_id, target_id)
    references public.course_import_artifacts (id, target_id),
  constraint course_extractions_validated_artifact_fkey
    foreign key (validated_artifact_id, target_id)
    references public.course_import_artifacts (id, target_id),
  constraint course_extractions_target_number_unique unique (
    target_id,
    extraction_number
  ),
  constraint course_extractions_target_fingerprint_unique unique (
    target_id,
    extraction_fingerprint
  ),
  constraint course_extractions_number_check check (extraction_number > 0),
  constraint course_extractions_provider_check check (provider = 'openrouter'),
  constraint course_extractions_requested_model_not_blank_check check (
    btrim(requested_model) <> ''
  ),
  constraint course_extractions_resolved_model_not_blank_check check (
    resolved_model is null or btrim(resolved_model) <> ''
  ),
  constraint course_extractions_fingerprint_check check (
    extraction_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint course_extractions_versions_not_blank_check check (
    btrim(prompt_version) <> '' and btrim(schema_version) <> ''
  ),
  constraint course_extractions_provider_request_id_check check (
    provider_request_id is null or btrim(provider_request_id) <> ''
  ),
  constraint course_extractions_finish_reason_check check (
    finish_reason is null or btrim(finish_reason) <> ''
  ),
  constraint course_extractions_validation_status_check check (
    validation_status in ('pending', 'valid', 'invalid')
  ),
  constraint course_extractions_validation_details_check check (
    (
      validation_status = 'pending'
      and schema_valid is null
      and domain_valid is null
      and warning_count = 0
      and error_count = 0
      and error_summary is null
    )
    or (
      validation_status = 'valid'
      and schema_valid
      and domain_valid
      and error_count = 0
    )
    or (
      validation_status = 'invalid'
      and schema_valid is not null
      and domain_valid is not null
      and (not schema_valid or not domain_valid or error_count > 0)
    )
  ),
  constraint course_extractions_usage_check check (
    warning_count >= 0
    and error_count >= 0
    and input_tokens >= 0
    and cached_input_tokens >= 0
    and cached_input_tokens <= input_tokens
    and output_tokens >= 0
    and reasoning_tokens >= 0
    and cost_usd >= 0
  ),
  constraint course_extractions_cost_source_check check (
    cost_source in ('provider', 'calculated', 'cache', 'unknown')
  ),
  constraint course_extractions_cache_lineage_check check (
    (
      cost_source = 'cache'
      and cost_usd = 0
      and reused_from_extraction_id is not null
    )
    or (
      cost_source <> 'cache'
      and reused_from_extraction_id is null
    )
  ),
  constraint course_extractions_latency_check check (
    latency_ms is null or latency_ms >= 0
  ),
  constraint course_extractions_lifecycle_check check (
    (
      validation_status = 'pending'
      and validated_artifact_id is null
      and completed_at is null
      and (
        response_artifact_id is not null
        or (
          resolved_model is null
          and reused_from_extraction_id is null
          and provider_request_id is null
          and finish_reason is null
          and input_tokens = 0
          and cached_input_tokens = 0
          and output_tokens = 0
          and reasoning_tokens = 0
          and cost_usd = 0
          and cost_source = 'unknown'
          and latency_ms is null
        )
      )
    )
    or (
      validation_status in ('valid', 'invalid')
      and response_artifact_id is not null
      and validated_artifact_id is not null
      and completed_at is not null
      and completed_at >= started_at
    )
  ),
  constraint course_extractions_error_summary_check check (
    error_summary is null or btrim(error_summary) <> ''
  )
);

create table public.course_review_items (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null,
  course_snapshot_id bigint not null,
  entity_kind text not null,
  entity_key text not null default 'root',
  field_path text not null,
  issue_code text not null,
  importance text not null default 'normal',
  is_blocking boolean not null default false,
  confidence numeric(5, 4),
  summary text not null,
  old_value jsonb,
  new_value jsonb,
  source_locator text,
  source_excerpt text,
  status text not null default 'open',
  assigned_to uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_review_items_target_id_fkey
    foreign key (target_id)
    references public.course_import_targets (id) on delete cascade,
  constraint course_review_items_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id),
  constraint course_review_items_assigned_to_fkey
    foreign key (assigned_to) references auth.users (id) on delete set null,
  constraint course_review_items_resolved_by_fkey
    foreign key (resolved_by) references auth.users (id) on delete set null,
  constraint course_review_items_change_unique unique (
    target_id,
    entity_kind,
    entity_key,
    field_path,
    issue_code
  ),
  constraint course_review_items_entity_kind_not_blank_check check (
    btrim(entity_kind) <> ''
  ),
  constraint course_review_items_entity_key_not_blank_check check (
    btrim(entity_key) <> ''
  ),
  constraint course_review_items_field_path_not_blank_check check (
    btrim(field_path) <> ''
  ),
  constraint course_review_items_issue_code_not_blank_check check (
    btrim(issue_code) <> ''
  ),
  constraint course_review_items_importance_check check (
    importance in ('critical', 'high', 'normal', 'low')
  ),
  constraint course_review_items_confidence_check check (
    confidence is null or confidence between 0 and 1
  ),
  constraint course_review_items_summary_not_blank_check check (
    btrim(summary) <> ''
  ),
  constraint course_review_items_real_change_check check (
    issue_code = 'MANUAL_REVIEW_REQUIRED'
    or (
      num_nonnulls(old_value, new_value) > 0
      and old_value is distinct from new_value
    )
  ),
  constraint course_review_items_source_text_check check (
    (source_locator is null or btrim(source_locator) <> '')
    and (source_excerpt is null or btrim(source_excerpt) <> '')
  ),
  constraint course_review_items_resolution_note_check check (
    resolution_note is null or btrim(resolution_note) <> ''
  ),
  constraint course_review_items_status_check check (
    status in ('open', 'accepted', 'rejected', 'dismissed')
  ),
  constraint course_review_items_resolution_check check (
    (
      status = 'open'
      and resolved_by is null
      and resolved_at is null
      and resolution_note is null
    )
    or (
      status <> 'open'
      and resolved_by is not null
      and resolved_at is not null
    )
  )
);

-- Course attributes are snapshot-owned canonical data, not extraction JSON.
-- This is deliberately generic enough for STEM classifications and graduate
-- attributes without committing later feature work to today's parser shape.
create table public.course_attributes (
  id bigint generated always as identity primary key,
  course_snapshot_id bigint not null,
  position integer not null,
  attribute_kind text not null,
  value text not null,
  source_text text not null,
  created_at timestamptz not null default now(),
  constraint course_attributes_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade,
  constraint course_attributes_snapshot_position_unique unique (
    course_snapshot_id,
    position
  ),
  constraint course_attributes_snapshot_value_unique unique (
    course_snapshot_id,
    attribute_kind,
    value
  ),
  constraint course_attributes_position_check check (position > 0),
  constraint course_attributes_kind_check check (
    attribute_kind in ('stem', 'graduate_attribute', 'other')
  ),
  constraint course_attributes_value_not_blank_check check (btrim(value) <> ''),
  constraint course_attributes_source_text_not_blank_check check (
    btrim(source_text) <> ''
  )
);

create table public.course_unit_options (
  id bigint generated always as identity primary key,
  course_snapshot_id bigint not null,
  position integer not null,
  units numeric(6, 2) not null,
  label text,
  source_text text not null,
  created_at timestamptz not null default now(),
  constraint course_unit_options_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade,
  constraint course_unit_options_snapshot_position_unique unique (
    course_snapshot_id,
    position
  ),
  constraint course_unit_options_snapshot_units_unique unique (
    course_snapshot_id,
    units
  ),
  constraint course_unit_options_position_check check (position > 0),
  constraint course_unit_options_units_check check (units > 0),
  constraint course_unit_options_label_check check (
    label is null or btrim(label) <> ''
  ),
  constraint course_unit_options_source_text_not_blank_check check (
    btrim(source_text) <> ''
  )
);

-- The dual-write bridge below is temporary. Legacy columns remain readable and
-- writable while application code moves to snapshots. A later contract
-- migration may remove them only after all readers and writers use snapshot
-- lineage and production reconciliation proves there are no legacy-only rows.

alter table public.course_offerings
  alter column course_version_id drop not null,
  alter column catalogue_year_id drop not null,
  alter column source_document_id drop not null,
  add column academic_year_id bigint,
  add column course_source_page_id bigint,
  add constraint course_offerings_snapshot_year_fkey
    foreign key (course_snapshot_id, academic_year_id)
    references public.course_snapshots (id, academic_year_id) on delete cascade,
  add constraint course_offerings_source_page_year_fkey
    foreign key (course_source_page_id, academic_year_id)
    references public.course_source_pages (id, academic_year_id),
  add constraint course_offerings_id_snapshot_unique
    unique (id, course_snapshot_id),
  add constraint course_offerings_storage_path_check check (
    (
      course_version_id is not null
      and catalogue_year_id is not null
      and source_document_id is not null
      and academic_year_id is null
      and course_source_page_id is null
    )
    or (
      course_version_id is null
      and catalogue_year_id is null
      and source_document_id is null
      and course_snapshot_id is not null
      and academic_year_id is not null
      and course_source_page_id is not null
    )
  );

alter table public.course_offerings
  drop constraint course_offerings_course_version_unique;

create unique index course_offerings_legacy_version_idx
  on public.course_offerings (course_version_id)
  where course_version_id is not null;

alter table public.offering_sessions
  alter column catalogue_year_id drop not null,
  alter column source_document_id drop not null,
  alter column academic_period_id drop not null,
  add column course_snapshot_id bigint,
  add column academic_year_id bigint,
  add column course_source_page_id bigint,
  add column position integer,
  add column source_text text,
  add column academic_period_code text,
  add column academic_period_name text;

update public.offering_sessions as sessions
set course_snapshot_id = offerings.course_snapshot_id
from public.course_offerings as offerings
where offerings.id = sessions.course_offering_id
  and sessions.course_snapshot_id is null;

update public.offering_sessions as sessions
set
  academic_period_code = periods.code,
  academic_period_name = periods.name
from public.academic_periods as periods
where periods.id = sessions.academic_period_id
  and sessions.academic_period_code is null;

with session_positions as (
  select
    sessions.id,
    row_number() over (
      partition by sessions.course_offering_id
      order by
        periods.sort_order,
        sessions.class_number nulls last,
        sessions.id
    )::integer as position
  from public.offering_sessions as sessions
  join public.academic_periods as periods
    on periods.id = sessions.academic_period_id
)
update public.offering_sessions as sessions
set position = session_positions.position
from session_positions
where session_positions.id = sessions.id
  and sessions.position is null;

alter table public.offering_sessions
  add constraint offering_sessions_offering_snapshot_fkey
    foreign key (course_offering_id, course_snapshot_id)
    references public.course_offerings (id, course_snapshot_id)
    on delete cascade,
  add constraint offering_sessions_snapshot_year_fkey
    foreign key (course_snapshot_id, academic_year_id)
    references public.course_snapshots (id, academic_year_id) on delete cascade,
  add constraint offering_sessions_source_page_year_fkey
    foreign key (course_source_page_id, academic_year_id)
    references public.course_source_pages (id, academic_year_id),
  add constraint offering_sessions_storage_path_check check (
    (
      catalogue_year_id is not null
      and source_document_id is not null
      and academic_period_id is not null
      and academic_year_id is null
      and course_source_page_id is null
    )
    or (
      catalogue_year_id is null
      and source_document_id is null
      and course_snapshot_id is not null
      and academic_year_id is not null
      and course_source_page_id is not null
      and academic_period_code is not null
      and academic_period_name is not null
    )
  ),
  add constraint offering_sessions_position_check check (
    position is null or position > 0
  ),
  add constraint offering_sessions_source_text_check check (
    source_text is null or btrim(source_text) <> ''
  ),
  add constraint offering_sessions_period_source_check check (
    (academic_period_code is null or btrim(academic_period_code) <> '')
    and (academic_period_name is null or btrim(academic_period_name) <> '')
  );

alter table public.offering_sessions
  drop constraint offering_sessions_offering_period_class_unique;

create unique index offering_sessions_legacy_period_class_idx
  on public.offering_sessions (
    course_offering_id,
    academic_period_id,
    class_number
  ) nulls not distinct
  where catalogue_year_id is not null;

create unique index offering_sessions_snapshot_period_class_idx
  on public.offering_sessions (
    course_snapshot_id,
    academic_period_code,
    class_number
  ) nulls not distinct
  where catalogue_year_id is null;

create unique index offering_sessions_snapshot_position_idx
  on public.offering_sessions (course_snapshot_id, position)
  where course_snapshot_id is not null and position is not null;

alter table public.course_learning_outcomes
  alter column course_version_id drop not null,
  add constraint course_learning_outcomes_storage_path_check check (
    course_version_id is not null or course_snapshot_id is not null
  );

alter table public.course_learning_outcomes
  drop constraint course_learning_outcomes_course_version_id_position_key;

create unique index course_learning_outcomes_legacy_position_idx
  on public.course_learning_outcomes (course_version_id, position)
  where course_version_id is not null;

alter table public.course_assessment_items
  alter column course_version_id drop not null,
  add column hurdle boolean,
  add column due_text text,
  add constraint course_assessment_items_storage_path_check check (
    course_version_id is not null or course_snapshot_id is not null
  ),
  add constraint course_assessment_items_due_text_check check (
    due_text is null or btrim(due_text) <> ''
  );

alter table public.course_assessment_items
  drop constraint course_assessment_items_course_version_id_position_key;

create unique index course_assessment_items_legacy_position_idx
  on public.course_assessment_items (course_version_id, position)
  where course_version_id is not null;

alter table public.course_rules
  alter column course_version_id drop not null,
  alter column catalogue_year_id drop not null,
  alter column source_document_id drop not null,
  add column academic_year_id bigint,
  add column course_source_page_id bigint,
  add constraint course_rules_snapshot_year_fkey
    foreign key (course_snapshot_id, academic_year_id)
    references public.course_snapshots (id, academic_year_id) on delete cascade,
  add constraint course_rules_source_page_year_fkey
    foreign key (course_source_page_id, academic_year_id)
    references public.course_source_pages (id, academic_year_id),
  add constraint course_rules_id_snapshot_unique unique (id, course_snapshot_id),
  add constraint course_rules_storage_path_check check (
    (
      course_version_id is not null
      and catalogue_year_id is not null
      and source_document_id is not null
      and academic_year_id is null
      and course_source_page_id is null
    )
    or (
      course_version_id is null
      and catalogue_year_id is null
      and source_document_id is null
      and course_snapshot_id is not null
      and academic_year_id is not null
      and course_source_page_id is not null
    )
  );

alter table public.course_rules
  drop constraint course_rules_version_kind_unique;

create unique index course_rules_legacy_kind_idx
  on public.course_rules (course_version_id, rule_kind)
  where course_version_id is not null;

alter table public.course_rule_groups
  add column course_snapshot_id bigint;

update public.course_rule_groups as groups
set course_snapshot_id = rules.course_snapshot_id
from public.course_rules as rules
where rules.id = groups.course_rule_id
  and groups.course_snapshot_id is null;

alter table public.course_rule_groups
  add constraint course_rule_groups_rule_snapshot_fkey
    foreign key (course_rule_id, course_snapshot_id)
    references public.course_rules (id, course_snapshot_id)
    on delete cascade;

alter table public.course_rule_conditions
  add column course_snapshot_id bigint,
  add column course_requirement_mode text,
  add column hardness text,
  add column minimum_year smallint,
  add column minimum_wam numeric(5, 2),
  add constraint course_rule_conditions_requirement_mode_check check (
    course_requirement_mode is null
    or course_requirement_mode in ('completed', 'completed_or_concurrent')
  ),
  add constraint course_rule_conditions_hardness_check check (
    hardness is null or hardness in ('hard', 'advisory')
  ),
  add constraint course_rule_conditions_minimum_year_check check (
    minimum_year is null or minimum_year between 1 and 10
  ),
  add constraint course_rule_conditions_minimum_wam_check check (
    minimum_wam is null or minimum_wam between 0 and 100
  );

alter table public.course_rule_conditions
  drop constraint course_rule_conditions_kind_check,
  drop constraint course_rule_conditions_typed_value_check;

alter table public.course_rule_conditions
  add constraint course_rule_conditions_kind_check check (
    condition_kind in (
      'course',
      'incompatible',
      'course_set_units',
      'units_total',
      'subject_units',
      'level_units',
      'year_standing',
      'wam',
      'permission',
      'admission',
      'other',
      'gpa'
    )
  ),
  add constraint course_rule_conditions_typed_value_check check (
    (
      condition_kind = 'course'
      and required_course_id is not null
      and num_nonnulls(
        required_structure_id,
        minimum_units,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'incompatible'
      and required_course_id is not null
      and num_nonnulls(
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'course_set_units'
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'units_total'
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'subject_units'
      and subject_code is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'level_units'
      and minimum_course_level is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        subject_code,
        free_text,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'year_standing'
      and minimum_year is not null
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'wam'
      and minimum_wam is not null
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa,
        minimum_year
      ) = 0
    )
    or (
      condition_kind = 'permission'
      and free_text is not null
      and btrim(free_text) <> ''
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'admission'
      and num_nonnulls(required_structure_id, free_text) = 1
      and (free_text is null or btrim(free_text) <> '')
      and num_nonnulls(
        required_course_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'other'
      and free_text is not null
      and btrim(free_text) <> ''
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa,
        minimum_year,
        minimum_wam
      ) = 0
    )
    or (
      condition_kind = 'gpa'
      and minimum_gpa is not null
      and minimum_gpa between 0 and 7
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_year,
        minimum_wam
      ) = 0
    )
  ),
  add constraint course_rule_conditions_id_snapshot_unique
    unique (id, course_snapshot_id);

update public.course_rule_conditions as conditions
set course_snapshot_id = rules.course_snapshot_id
from public.course_rules as rules
where rules.id = conditions.course_rule_id
  and conditions.course_snapshot_id is null;

alter table public.course_rule_conditions
  add constraint course_rule_conditions_rule_snapshot_fkey
    foreign key (course_rule_id, course_snapshot_id)
    references public.course_rules (id, course_snapshot_id)
    on delete cascade;

alter table public.course_rule_course_references
  add column course_snapshot_id bigint;

update public.course_rule_course_references as rule_references
set course_snapshot_id = rules.course_snapshot_id
from public.course_rules as rules
where rules.id = rule_references.course_rule_id
  and rule_references.course_snapshot_id is null;

alter table public.course_rule_course_references
  add constraint course_rule_course_references_rule_snapshot_fkey
    foreign key (course_rule_id, course_snapshot_id)
    references public.course_rules (id, course_snapshot_id)
    on delete cascade;

create table public.course_rule_condition_courses (
  id bigint generated always as identity primary key,
  condition_id bigint not null,
  course_snapshot_id bigint not null,
  position integer not null,
  referenced_course_id bigint,
  source_course_code text not null,
  source_text text not null,
  created_at timestamptz not null default now(),
  constraint course_rule_condition_courses_condition_snapshot_fkey
    foreign key (condition_id, course_snapshot_id)
    references public.course_rule_conditions (id, course_snapshot_id)
    on delete cascade,
  constraint course_rule_condition_courses_referenced_course_id_fkey
    foreign key (referenced_course_id) references public.courses (id),
  constraint course_rule_condition_courses_condition_position_unique unique (
    condition_id,
    position
  ),
  constraint course_rule_condition_courses_condition_code_unique unique (
    condition_id,
    source_course_code
  ),
  constraint course_rule_condition_courses_position_check check (position > 0),
  constraint course_rule_condition_courses_source_course_code_check check (
    source_course_code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  ),
  constraint course_rule_condition_courses_source_text_not_blank_check check (
    btrim(source_text) <> ''
  )
);

create index course_import_runs_source_year_created_idx
  on public.course_import_runs (source_id, academic_year_id, created_at desc);

create index course_import_runs_status_created_idx
  on public.course_import_runs (status, created_at desc);

create index course_import_runs_initiated_by_idx
  on public.course_import_runs (initiated_by);

create index course_import_targets_source_id_idx
  on public.course_import_targets (source_id);

create index course_import_runs_academic_year_fk_idx
  on public.course_import_runs (academic_year_id);

create index course_import_targets_academic_year_id_idx
  on public.course_import_targets (academic_year_id);

create index course_import_targets_directory_entry_id_idx
  on public.course_import_targets (directory_entry_id);

create index course_import_targets_course_id_idx
  on public.course_import_targets (course_id);

create index course_import_targets_course_year_id_idx
  on public.course_import_targets (course_year_id);

create index course_import_targets_run_provenance_idx
  on public.course_import_targets (run_id, source_id, academic_year_id);

create index course_import_targets_directory_provenance_idx
  on public.course_import_targets (
    directory_entry_id,
    academic_year_id,
    course_code
  );

create index course_import_targets_directory_year_code_idx
  on public.course_import_targets (academic_year_id, course_code);

create index course_import_targets_course_year_provenance_idx
  on public.course_import_targets (
    course_year_id,
    course_id,
    academic_year_id
  );

create index course_import_targets_source_page_year_idx
  on public.course_import_targets (source_page_id, academic_year_id);

create index course_import_targets_baseline_draft_idx
  on public.course_import_targets (baseline_draft_snapshot_id, course_year_id);

create index course_import_targets_baseline_published_idx
  on public.course_import_targets (
    baseline_published_snapshot_id,
    course_year_id
  );

create index course_import_targets_candidate_snapshot_idx
  on public.course_import_targets (candidate_snapshot_id, course_year_id);

create index course_import_targets_reviewed_by_idx
  on public.course_import_targets (reviewed_by);

create index course_import_targets_claim_idx
  on public.course_import_targets (
    processing_status,
    lease_expires_at,
    created_at
  )
  where processing_status in ('queued', 'processing');

create index course_import_artifacts_stage_target_idx
  on public.course_import_artifacts (stage_id, target_id);

create index course_extractions_request_artifact_idx
  on public.course_extractions (request_artifact_id, target_id);

create index course_extractions_response_artifact_idx
  on public.course_extractions (response_artifact_id, target_id);

create index course_extractions_validated_artifact_idx
  on public.course_extractions (validated_artifact_id, target_id);

create index course_extractions_reused_from_extraction_id_idx
  on public.course_extractions (reused_from_extraction_id);

create index course_review_items_snapshot_id_idx
  on public.course_review_items (course_snapshot_id);

create index course_review_items_assigned_to_idx
  on public.course_review_items (assigned_to);

create index course_review_items_resolved_by_idx
  on public.course_review_items (resolved_by);

create index course_review_items_open_idx
  on public.course_review_items (target_id, importance, created_at)
  where status = 'open';

create index course_offerings_academic_year_id_idx
  on public.course_offerings (academic_year_id);

create index course_offerings_snapshot_year_idx
  on public.course_offerings (course_snapshot_id, academic_year_id);

create index course_offerings_source_page_year_idx
  on public.course_offerings (course_source_page_id, academic_year_id);

create index offering_sessions_course_snapshot_id_idx
  on public.offering_sessions (course_snapshot_id);

create index offering_sessions_offering_snapshot_idx
  on public.offering_sessions (course_offering_id, course_snapshot_id);

create index offering_sessions_snapshot_year_idx
  on public.offering_sessions (course_snapshot_id, academic_year_id);

create index offering_sessions_academic_year_id_idx
  on public.offering_sessions (academic_year_id);

create index offering_sessions_source_page_year_idx
  on public.offering_sessions (course_source_page_id, academic_year_id);

create index course_rules_academic_year_id_idx
  on public.course_rules (academic_year_id);

create index course_rules_snapshot_year_idx
  on public.course_rules (course_snapshot_id, academic_year_id);

create index course_rules_source_page_year_idx
  on public.course_rules (course_source_page_id, academic_year_id);

create index course_rule_groups_course_snapshot_id_idx
  on public.course_rule_groups (course_snapshot_id);

create index course_rule_groups_rule_snapshot_idx
  on public.course_rule_groups (course_rule_id, course_snapshot_id);

create index course_rule_conditions_course_snapshot_id_idx
  on public.course_rule_conditions (course_snapshot_id);

create index course_rule_conditions_rule_snapshot_idx
  on public.course_rule_conditions (course_rule_id, course_snapshot_id);

create index course_rule_course_references_course_snapshot_id_idx
  on public.course_rule_course_references (course_snapshot_id);

create index course_rule_course_references_rule_snapshot_idx
  on public.course_rule_course_references (
    course_rule_id,
    course_snapshot_id
  );

create index course_rule_condition_courses_snapshot_id_idx
  on public.course_rule_condition_courses (course_snapshot_id);

create index course_rule_condition_courses_condition_snapshot_idx
  on public.course_rule_condition_courses (condition_id, course_snapshot_id);

create index course_rule_condition_courses_referenced_course_id_idx
  on public.course_rule_condition_courses (referenced_course_id);

create index course_learning_outcomes_course_version_id_idx
  on public.course_learning_outcomes (course_version_id);

create index course_assessment_items_course_version_id_idx
  on public.course_assessment_items (course_version_id);

create trigger course_import_runs_set_updated_at
before update on public.course_import_runs
for each row execute function private.set_updated_at();

create trigger course_import_targets_set_updated_at
before update on public.course_import_targets
for each row execute function private.set_updated_at();

create trigger course_import_stages_set_updated_at
before update on public.course_import_stages
for each row execute function private.set_updated_at();

create trigger course_review_items_set_updated_at
before update on public.course_review_items
for each row execute function private.set_updated_at();

create trigger course_import_artifacts_reject_mutation
before update or delete on public.course_import_artifacts
for each row execute function private.reject_immutable_course_record_mutation();

create or replace function private.validate_course_extraction_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  request_kind text;
  request_attempt smallint;
  response_kind text;
  response_attempt smallint;
  validated_kind text;
  reused_fingerprint text;
  reused_lineage_id uuid;
begin
  if tg_op = 'DELETE' then
    raise exception
      'course_extractions records are immutable; create a new record instead'
      using errcode = '55000';
  end if;

  if tg_op = 'INSERT' and new.validation_status <> 'pending' then
    raise exception 'course extractions must be recorded as pending first'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE' then
    if old.validation_status <> 'pending' then
      raise exception
        'completed course extractions are immutable'
        using errcode = '55000';
    end if;

    if new.validation_status = 'pending' then
      -- Reserve the fingerprint before the paid request. Exactly one later
      -- update may attach its immutable response evidence. If the worker dies
      -- before that attachment, the reservation deliberately blocks another
      -- paid call with an uncertain prior outcome.
      if old.response_artifact_id is not null
        or new.response_artifact_id is null
        or (
          to_jsonb(new) - array[
            'resolved_model',
            'reused_from_extraction_id',
            'response_artifact_id',
            'provider_request_id',
            'finish_reason',
            'input_tokens',
            'cached_input_tokens',
            'output_tokens',
            'reasoning_tokens',
            'cost_usd',
            'cost_source',
            'latency_ms'
          ]::text[]
        ) is distinct from (
          to_jsonb(old) - array[
            'resolved_model',
            'reused_from_extraction_id',
            'response_artifact_id',
            'provider_request_id',
            'finish_reason',
            'input_tokens',
            'cached_input_tokens',
            'output_tokens',
            'reasoning_tokens',
            'cost_usd',
            'cost_source',
            'latency_ms'
          ]::text[]
        )
      then
        raise exception
          'course extraction response evidence can be attached exactly once'
          using errcode = '55000';
      end if;
    elsif new.validation_status in ('valid', 'invalid') then
      -- Once a response is attached, completion may add only validation
      -- output. Request, model, usage and cost evidence remain immutable.
      if old.response_artifact_id is null or (
        to_jsonb(new) - array[
          'validated_artifact_id',
          'validation_status',
          'schema_valid',
          'domain_valid',
          'warning_count',
          'error_count',
          'completed_at',
          'error_summary'
        ]::text[]
      ) is distinct from (
        to_jsonb(old) - array[
          'validated_artifact_id',
          'validation_status',
          'schema_valid',
          'domain_valid',
          'warning_count',
          'error_count',
          'completed_at',
          'error_summary'
        ]::text[]
      ) then
        raise exception
          'pending course extraction request, response, usage and cost evidence is immutable'
          using errcode = '55000';
      end if;
    else
      raise exception
        'completed course extractions are immutable'
        using errcode = '55000';
    end if;
  end if;

  if new.reused_from_extraction_id is not null then
    if new.reused_from_extraction_id = new.id then
      raise exception 'a course extraction cannot reuse itself'
        using errcode = '23514';
    end if;

    select
      extractions.extraction_fingerprint,
      extractions.reused_from_extraction_id
    into reused_fingerprint, reused_lineage_id
    from public.course_extractions as extractions
    where extractions.id = new.reused_from_extraction_id;

    if not found
      or reused_lineage_id is not null
      or reused_fingerprint is distinct from new.extraction_fingerprint
    then
      raise exception
        'cached course extractions must reference a direct response with the same fingerprint'
        using errcode = '23503';
    end if;
  end if;

  select artifacts.artifact_kind, artifacts.attempt_number
  into request_kind, request_attempt
  from public.course_import_artifacts as artifacts
  where artifacts.id = new.request_artifact_id
    and artifacts.target_id = new.target_id;

  if new.response_artifact_id is not null then
    select artifacts.artifact_kind, artifacts.attempt_number
    into response_kind, response_attempt
    from public.course_import_artifacts as artifacts
    where artifacts.id = new.response_artifact_id
      and artifacts.target_id = new.target_id;
  end if;

  if request_kind is distinct from 'model_request'
    or request_attempt is distinct from new.extraction_number
    or (
      new.response_artifact_id is not null
      and (
        response_kind is distinct from 'model_response'
        or response_attempt is distinct from new.extraction_number
      )
    )
  then
    raise exception
      'course extraction request and any response artefact must match its target and extraction number'
      using errcode = '23503';
  end if;

  if new.validated_artifact_id is not null then
    select artifacts.artifact_kind
    into validated_kind
    from public.course_import_artifacts as artifacts
    where artifacts.id = new.validated_artifact_id
      and artifacts.target_id = new.target_id;

    -- Validation may finish during a later target attempt after reusing the
    -- paid response, so only its target and semantic artefact kind must match.
    if validated_kind is distinct from 'validated_json' then
      raise exception
        'course extraction validation artefact must match its target and validated_json kind'
        using errcode = '23503';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_course_extraction_lifecycle()
from public, anon, authenticated;

create trigger course_extractions_validate_lifecycle
before insert or update or delete on public.course_extractions
for each row execute function private.validate_course_extraction_lifecycle();

create trigger course_attributes_reject_mutation
before update or delete on public.course_attributes
for each row execute function private.reject_immutable_course_record_mutation();

create trigger course_attributes_reject_sealed_insert
before insert on public.course_attributes
for each row execute function private.reject_sealed_course_snapshot_child_insert();

create trigger course_unit_options_reject_mutation
before update or delete on public.course_unit_options
for each row execute function private.reject_immutable_course_record_mutation();

create trigger course_unit_options_reject_sealed_insert
before insert on public.course_unit_options
for each row execute function private.reject_sealed_course_snapshot_child_insert();

create trigger course_rule_condition_courses_reject_mutation
before update or delete on public.course_rule_condition_courses
for each row execute function private.reject_immutable_course_record_mutation();

create trigger course_rule_condition_courses_reject_sealed_insert
before insert on public.course_rule_condition_courses
for each row execute function private.reject_sealed_course_snapshot_child_insert();

create or replace function private.validate_course_rule_condition_course()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.course_rule_conditions as conditions
    where conditions.id = new.condition_id
      and conditions.course_snapshot_id = new.course_snapshot_id
      and conditions.condition_kind = 'course_set_units'
  ) then
    raise exception 'course-set members require a course_set_units condition'
      using errcode = '23503';
  end if;

  if new.referenced_course_id is not null
    and not exists (
      select 1
      from public.courses
      where id = new.referenced_course_id
        and code = new.source_course_code
    )
  then
    raise exception 'referenced course does not match its source code'
      using errcode = '23503';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_course_rule_condition_course()
from public, anon, authenticated;

create trigger course_rule_condition_courses_validate
before insert on public.course_rule_condition_courses
for each row execute function private.validate_course_rule_condition_course();

create or replace function private.check_course_import_target_count()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  selected_run_id uuid;
  declared_count integer;
  actual_count integer;
begin
  -- A polymorphic trigger record exposes only the fields of its actual table.
  -- Keep the table branches separate so a run event never tries to resolve a
  -- target-only `run_id` field when deferred constraints fire at commit.
  if tg_table_name = 'course_import_runs' then
    selected_run_id := new.id;
  elsif tg_op = 'DELETE' then
    selected_run_id := old.run_id;
  else
    selected_run_id := new.run_id;
  end if;

  select runs.target_count
  into declared_count
  from public.course_import_runs as runs
  where runs.id = selected_run_id;

  if not found then
    return null;
  end if;

  select count(*)
  into actual_count
  from public.course_import_targets as targets
  where targets.run_id = selected_run_id;

  if actual_count <> declared_count then
    raise exception
      'course import run % declares % targets but has %',
      selected_run_id,
      declared_count,
      actual_count
      using errcode = '23514';
  end if;

  return null;
end;
$function$;

revoke all on function private.check_course_import_target_count()
from public, anon, authenticated;

create constraint trigger course_import_runs_check_target_count
after insert or update on public.course_import_runs
deferrable initially deferred
for each row execute function private.check_course_import_target_count();

create constraint trigger course_import_targets_check_target_count
after insert or update or delete on public.course_import_targets
deferrable initially deferred
for each row execute function private.check_course_import_target_count();

create or replace function private.validate_course_import_target()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  declared_count integer;
  existing_count integer;
  directory_course_id bigint;
  directory_source_id bigint;
  candidate_is_sealed boolean;
  candidate_source_page_id bigint;
  candidate_is_published boolean;
begin
  if tg_op = 'INSERT' then
    select runs.target_count
    into declared_count
    from public.course_import_runs as runs
    where runs.id = new.run_id
    for update;

    if not found then
      raise exception 'course import run % does not exist', new.run_id
        using errcode = '23503';
    end if;

    select count(*)
    into existing_count
    from public.course_import_targets as targets
    where targets.run_id = new.run_id;

    if existing_count >= declared_count or existing_count >= 10 then
      raise exception 'course import run % cannot contain more targets', new.run_id
        using errcode = '23514';
    end if;
  else
    if new.run_id is distinct from old.run_id
      or new.source_id is distinct from old.source_id
      or new.academic_year_id is distinct from old.academic_year_id
      or new.directory_entry_id is distinct from old.directory_entry_id
      or new.position is distinct from old.position
      or new.course_code is distinct from old.course_code
      or new.baseline_draft_snapshot_id
        is distinct from old.baseline_draft_snapshot_id
      or new.baseline_published_snapshot_id
        is distinct from old.baseline_published_snapshot_id
    then
      raise exception 'course import target identity and baseline are immutable'
        using errcode = '55000';
    end if;

    if not (
      (old.processing_status = 'queued'
        and new.processing_status in (
          'queued',
          'processing',
          'failed',
          'cancelled'
        ))
      or (old.processing_status = 'processing'
        and new.processing_status in (
          'processing',
          'ready_for_review',
          'unchanged',
          'failed',
          'cancelled'
        ))
      or (old.processing_status = 'ready_for_review'
        and new.processing_status = 'ready_for_review')
      or (old.processing_status in ('unchanged', 'failed', 'cancelled')
        and new.processing_status = old.processing_status)
    ) then
      raise exception 'invalid course import target status transition: % to %',
        old.processing_status,
        new.processing_status
        using errcode = '55000';
    end if;
  end if;

  select entries.course_id, documents.source_id
  into directory_course_id, directory_source_id
  from public.course_directory_entries as entries
  join public.course_source_pages as documents
    on documents.id = entries.source_page_id
   and documents.academic_year_id = entries.academic_year_id
  where entries.id = new.directory_entry_id
    and entries.academic_year_id = new.academic_year_id
    and entries.code = new.course_code
    and (tg_op <> 'INSERT' or entries.is_current);

  if not found or directory_source_id <> new.source_id then
    raise exception
      'course import target directory provenance does not match its run'
      using errcode = '23503';
  end if;

  -- Linking a previously unknown directory entry is committed by the snapshot
  -- writer before the target itself is completed. Keep the null target value
  -- retryable across that narrow boundary, but never permit a non-null target
  -- identity to disagree with either the directory or the selected code.
  if directory_course_id is not null
    and new.course_id is not null
    and new.course_id <> directory_course_id
  then
    raise exception 'course import target course does not match its directory row'
      using errcode = '23503';
  end if;

  if new.course_id is not null
    and not exists (
      select 1
      from public.courses as courses
      where courses.id = new.course_id
        and courses.code = new.course_code
    )
  then
    raise exception 'course import target course identity does not match its code'
      using errcode = '23503';
  end if;

  if new.source_page_id is not null
    and not exists (
      select 1
      from public.course_source_pages as documents
      where documents.id = new.source_page_id
        and documents.source_id = new.source_id
        and documents.academic_year_id = new.academic_year_id
        and documents.page_kind = 'course_page'
        and documents.external_key = new.course_code
    )
  then
    raise exception 'course import target source page provenance is invalid'
      using errcode = '23503';
  end if;

  if new.candidate_snapshot_id is not null then
    select
      snapshots.sealed_at is not null,
      snapshots.source_page_id,
      course_years.published_snapshot_id = snapshots.id
    into
      candidate_is_sealed,
      candidate_source_page_id,
      candidate_is_published
    from public.course_snapshots as snapshots
    join public.course_years as course_years
      on course_years.id = snapshots.course_year_id
    where snapshots.id = new.candidate_snapshot_id
      and snapshots.course_year_id = new.course_year_id
      and snapshots.academic_year_id = new.academic_year_id
      and snapshots.origin = 'import';

    if not found
      or candidate_source_page_id is distinct from new.source_page_id
    then
      raise exception 'course import candidate snapshot provenance is invalid'
        using errcode = '23503';
    end if;

    if coalesce(candidate_is_published, false) then
      raise exception 'course imports cannot select or move a published snapshot'
        using errcode = '55000';
    end if;
  end if;

  if new.processing_status = 'ready_for_review' then
    if not coalesce(candidate_is_sealed, false) then
      raise exception 'a review candidate snapshot must be permanently sealed'
        using errcode = '55000';
    end if;

    if not exists (
      select 1
      from public.course_review_items as reviews
      where reviews.target_id = new.id
        and reviews.course_snapshot_id = new.candidate_snapshot_id
        and reviews.issue_code = 'MANUAL_REVIEW_REQUIRED'
        and reviews.status = 'open'
    ) then
      raise exception 'every changed import candidate requires manual review'
        using errcode = '55000';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_course_import_target()
from public, anon, authenticated;

create trigger course_import_targets_validate
before insert or update on public.course_import_targets
for each row execute function private.validate_course_import_target();

create or replace function private.validate_course_import_stage_transition()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  target_processing_status text;
  target_attempt_count smallint;
begin
  if tg_op = 'UPDATE' then
    if new.target_id is distinct from old.target_id
      or new.stage_name is distinct from old.stage_name
      or new.position is distinct from old.position
    then
      raise exception 'course import stage identity is immutable'
        using errcode = '55000';
    end if;

    if not (
      (old.status = 'queued' and new.status in ('queued', 'running', 'skipped'))
      or (old.status = 'running'
        and new.status in ('running', 'succeeded', 'failed'))
      or (old.status = 'failed' and new.status in ('failed', 'running'))
      or (old.status in ('succeeded', 'skipped')
        and new.status in (old.status, 'running'))
    ) then
      raise exception 'invalid course import stage status transition: % to %',
        old.status,
        new.status
        using errcode = '55000';
    end if;
  end if;

  if new.status = 'running' then
    select targets.processing_status, targets.attempt_count
    into target_processing_status, target_attempt_count
    from public.course_import_targets as targets
    where targets.id = new.target_id;

    if target_processing_status <> 'processing' then
      raise exception 'course import stages run only while their target is processing'
        using errcode = '55000';
    end if;

    if tg_op = 'UPDATE'
      and target_attempt_count <= old.attempt_count
    then
      raise exception 'completed import stages restart only on a later target attempt'
        using errcode = '55000';
    end if;

    new.attempt_count := greatest(new.attempt_count, target_attempt_count);

    if exists (
      select 1
      from public.course_import_stages as earlier
      where earlier.target_id = new.target_id
        and earlier.position < new.position
        and earlier.status not in ('succeeded', 'skipped')
    ) then
      raise exception 'earlier course import stages must finish first'
        using errcode = '55000';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_course_import_stage_transition()
from public, anon, authenticated;

create trigger course_import_stages_validate_transition
before insert or update on public.course_import_stages
for each row execute function private.validate_course_import_stage_transition();

create or replace function private.guard_snapshot_rich_child_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  selected_snapshot_id bigint;
  selected_course_version_id bigint;
  legacy_row boolean := false;
  legacy_backfill_linkage boolean := false;
  snapshot_is_sealed boolean;
begin
  if tg_table_name = 'course_offerings' then
    selected_snapshot_id := case
      when tg_op = 'DELETE' then old.course_snapshot_id
      else new.course_snapshot_id
    end;
    selected_course_version_id := case
      when tg_op = 'DELETE' then old.course_version_id
      else new.course_version_id
    end;

    legacy_backfill_linkage := tg_op = 'UPDATE'
      and old.course_snapshot_id is null
      and new.course_snapshot_id is not null
      and new.course_version_id is not null
      and (to_jsonb(new) - 'course_snapshot_id') =
        (to_jsonb(old) - 'course_snapshot_id');

    if tg_op = 'UPDATE'
      and (
        old.course_version_id is distinct from new.course_version_id
        or (
          old.course_snapshot_id is distinct from new.course_snapshot_id
          and not legacy_backfill_linkage
        )
      )
    then
      raise exception 'course offering lineage is immutable'
        using errcode = '55000';
    end if;
  elsif tg_table_name = 'course_learning_outcomes' then
    selected_snapshot_id := case
      when tg_op = 'DELETE' then old.course_snapshot_id
      else new.course_snapshot_id
    end;
    selected_course_version_id := case
      when tg_op = 'DELETE' then old.course_version_id
      else new.course_version_id
    end;

    legacy_backfill_linkage := tg_op = 'UPDATE'
      and old.course_snapshot_id is null
      and new.course_snapshot_id is not null
      and new.course_version_id is not null
      and (to_jsonb(new) - 'course_snapshot_id') =
        (to_jsonb(old) - 'course_snapshot_id');

    if tg_op = 'UPDATE'
      and (
        old.course_version_id is distinct from new.course_version_id
        or (
          old.course_snapshot_id is distinct from new.course_snapshot_id
          and not legacy_backfill_linkage
        )
      )
    then
      raise exception 'course learning outcome lineage is immutable'
        using errcode = '55000';
    end if;
  elsif tg_table_name = 'course_assessment_items' then
    selected_snapshot_id := case
      when tg_op = 'DELETE' then old.course_snapshot_id
      else new.course_snapshot_id
    end;
    selected_course_version_id := case
      when tg_op = 'DELETE' then old.course_version_id
      else new.course_version_id
    end;

    legacy_backfill_linkage := tg_op = 'UPDATE'
      and old.course_snapshot_id is null
      and new.course_snapshot_id is not null
      and new.course_version_id is not null
      and (to_jsonb(new) - 'course_snapshot_id') =
        (to_jsonb(old) - 'course_snapshot_id');

    if tg_op = 'UPDATE'
      and (
        old.course_version_id is distinct from new.course_version_id
        or (
          old.course_snapshot_id is distinct from new.course_snapshot_id
          and not legacy_backfill_linkage
        )
      )
    then
      raise exception 'course assessment item lineage is immutable'
        using errcode = '55000';
    end if;
  elsif tg_table_name = 'course_rules' then
    selected_snapshot_id := case
      when tg_op = 'DELETE' then old.course_snapshot_id
      else new.course_snapshot_id
    end;
    selected_course_version_id := case
      when tg_op = 'DELETE' then old.course_version_id
      else new.course_version_id
    end;

    legacy_backfill_linkage := tg_op = 'UPDATE'
      and old.course_snapshot_id is null
      and new.course_snapshot_id is not null
      and new.course_version_id is not null
      and (to_jsonb(new) - 'course_snapshot_id') =
        (to_jsonb(old) - 'course_snapshot_id');

    if tg_op = 'UPDATE'
      and (
        old.course_version_id is distinct from new.course_version_id
        or (
          old.course_snapshot_id is distinct from new.course_snapshot_id
          and not legacy_backfill_linkage
        )
      )
    then
      raise exception 'course rule lineage is immutable'
        using errcode = '55000';
    end if;
  elsif tg_table_name = 'offering_sessions' then
    selected_snapshot_id := case
      when tg_op = 'DELETE' then old.course_snapshot_id
      else new.course_snapshot_id
    end;

    if tg_op = 'UPDATE'
      and (
        old.course_snapshot_id is distinct from new.course_snapshot_id
        or old.course_offering_id is distinct from new.course_offering_id
      )
    then
      raise exception 'offering session lineage is immutable'
        using errcode = '55000';
    end if;

    select offerings.course_version_id
    into selected_course_version_id
    from public.course_offerings as offerings
    where offerings.id = case
      when tg_op = 'DELETE' then old.course_offering_id
      else new.course_offering_id
    end;
  else
    selected_snapshot_id := case
      when tg_op = 'DELETE' then old.course_snapshot_id
      else new.course_snapshot_id
    end;

    if tg_op = 'UPDATE'
      and (
        old.course_snapshot_id is distinct from new.course_snapshot_id
        or old.course_rule_id is distinct from new.course_rule_id
      )
    then
      raise exception 'course rule child lineage is immutable'
        using errcode = '55000';
    end if;

    select rules.course_version_id
    into selected_course_version_id
    from public.course_rules as rules
    where rules.id = case
      when tg_op = 'DELETE' then old.course_rule_id
      else new.course_rule_id
    end;
  end if;

  legacy_row := selected_course_version_id is not null;

  -- During an ON DELETE CASCADE, PostgreSQL may no longer expose the legacy
  -- parent to this child trigger. Preserve legacy importer cleanup by using
  -- the child's null lineage, or the immutable snapshot origin, as the
  -- fallback discriminator. Snapshot-native deletes still reach the seal.
  if tg_op = 'DELETE' and not legacy_row then
    if selected_snapshot_id is null then
      legacy_row := true;
    else
      select snapshots.origin = 'legacy_backfill'
      into legacy_row
      from public.course_snapshots as snapshots
      where snapshots.id = selected_snapshot_id;
    end if;
  end if;

  -- Compatibility rows may be staged without snapshot lineage, and the
  -- private foundation backfill may perform one exact NULL-to-snapshot update.
  -- Once linked, legacy-backfill children use the same permanent seal as every
  -- snapshot-native row. A mixed row is valid only for the legacy-backfill
  -- snapshot belonging to that version, and the linkage update cannot change
  -- any other field.
  if coalesce(legacy_row, false) then
    if tg_op <> 'DELETE'
      and selected_snapshot_id is not null
      and not exists (
        select 1
        from public.course_versions as versions
        join public.catalogue_years as legacy_years
          on legacy_years.id = versions.catalogue_year_id
        join public.course_snapshots as snapshots
          on snapshots.id = selected_snapshot_id
         and snapshots.origin = 'legacy_backfill'
        join public.course_years as course_years
          on course_years.id = snapshots.course_year_id
         and course_years.course_id = versions.course_id
        join public.academic_years as academic_years
          on academic_years.id = snapshots.academic_year_id
         and academic_years.year = legacy_years.year
        where versions.id = selected_course_version_id
      )
    then
      raise exception 'legacy lineage does not match its backfilled snapshot'
        using errcode = '23503';
    end if;

    if legacy_backfill_linkage then
      return new;
    end if;

    if selected_snapshot_id is null then
      if tg_op = 'DELETE' then
        return old;
      end if;
      return new;
    end if;
  end if;

  if tg_table_name = 'offering_sessions' and tg_op <> 'DELETE' then
    if
      new.position is null
      or new.source_text is null
      or btrim(new.source_text) = ''
      or new.academic_period_code is null
      or btrim(new.academic_period_code) = ''
      or new.academic_period_name is null
      or btrim(new.academic_period_name) = ''
    then
      raise exception
        'snapshot-owned sessions require position, source text and source period'
        using errcode = '23514';
    end if;

    if new.academic_period_id is not null
      and not exists (
        select 1
        from public.academic_periods as periods
        join public.academic_years as years
          on years.year = periods.calendar_year
        where periods.id = new.academic_period_id
          and periods.code = new.academic_period_code
          and periods.name = new.academic_period_name
          and years.id = new.academic_year_id
      )
    then
      raise exception
        'linked academic period does not match the extracted source period'
        using errcode = '23503';
    end if;
  end if;

  if tg_op <> 'DELETE' and tg_table_name = 'course_rule_conditions' then
    if new.hardness is null then
      raise exception 'snapshot-owned rule conditions require hardness'
        using errcode = '23514';
    end if;

    if new.condition_kind = 'course'
      and new.course_requirement_mode is null
    then
      raise exception 'course conditions require a completion mode'
        using errcode = '23514';
    end if;

    if new.condition_kind <> 'course'
      and new.course_requirement_mode is not null
    then
      raise exception 'only course conditions have a completion mode'
        using errcode = '23514';
    end if;
  end if;

  if selected_snapshot_id is null then
    raise exception '% requires snapshot lineage', tg_table_name
      using errcode = '23514';
  end if;

  select snapshots.sealed_at is not null
  into snapshot_is_sealed
  from public.course_snapshots as snapshots
  join public.course_years as course_years
    on course_years.id = snapshots.course_year_id
  where snapshots.id = selected_snapshot_id
  for update of course_years;

  if not found then
    raise exception 'course snapshot % does not exist', selected_snapshot_id
      using errcode = '23503';
  end if;

  if snapshot_is_sealed then
    raise exception
      'course snapshot % is sealed; create a new snapshot instead',
      selected_snapshot_id
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_snapshot_rich_child_mutation()
from public, anon, authenticated;

create trigger course_offerings_guard_snapshot_mutation
before insert or update or delete on public.course_offerings
for each row execute function private.guard_snapshot_rich_child_mutation();

create trigger offering_sessions_guard_snapshot_mutation
before insert or update or delete on public.offering_sessions
for each row execute function private.guard_snapshot_rich_child_mutation();

create trigger course_learning_outcomes_guard_snapshot_mutation
before insert or update or delete on public.course_learning_outcomes
for each row execute function private.guard_snapshot_rich_child_mutation();

create trigger course_assessment_items_guard_snapshot_mutation
before insert or update or delete on public.course_assessment_items
for each row execute function private.guard_snapshot_rich_child_mutation();

create trigger course_rules_guard_snapshot_mutation
before insert or update or delete on public.course_rules
for each row execute function private.guard_snapshot_rich_child_mutation();

create trigger course_rule_groups_guard_snapshot_mutation
before insert or update or delete on public.course_rule_groups
for each row execute function private.guard_snapshot_rich_child_mutation();

create trigger course_rule_conditions_guard_snapshot_mutation
before insert or update or delete on public.course_rule_conditions
for each row execute function private.guard_snapshot_rich_child_mutation();

create trigger course_rule_course_references_guard_snapshot_mutation
before insert or update or delete on public.course_rule_course_references
for each row execute function private.guard_snapshot_rich_child_mutation();

create or replace function public.start_course_import(
  p_academic_year smallint,
  p_course_codes text[],
  p_requested_model text,
  p_parser_version text,
  p_prompt_version text,
  p_schema_version text
)
returns table (
  run_id uuid,
  target_id uuid,
  course_code text,
  target_position smallint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_year_id bigint;
  selected_source_id bigint;
  selected_run_id uuid;
  normalised_codes text[];
  matched_count integer;
  source_count integer;
  selected_user_id uuid;
  active_run_id uuid;
begin
  selected_user_id := (select auth.uid());

  if selected_user_id is null
    or not (select private.has_permission('imports.manage'))
  then
    raise exception 'Course import management permission is required.'
      using errcode = '42501';
  end if;

  select array_agg(upper(btrim(input.code)) order by input.position)
  into normalised_codes
  from unnest(p_course_codes) with ordinality as input(code, position);

  if coalesce(cardinality(normalised_codes), 0) not between 1 and 10 then
    raise exception 'Select between 1 and 10 course codes.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(normalised_codes) as codes(code)
    where codes.code !~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  ) then
    raise exception
      'Every course code must use the ABCD1234 or ABCD1234F format.'
      using errcode = '22023';
  end if;

  if (
    select count(*) <> count(distinct codes.code)
    from unnest(normalised_codes) as codes(code)
  ) then
    raise exception 'Course codes must be distinct within an import run.'
      using errcode = '22023';
  end if;

  if p_requested_model is null or btrim(p_requested_model) = ''
    or p_parser_version is null or btrim(p_parser_version) = ''
    or p_prompt_version is null or btrim(p_prompt_version) = ''
    or p_schema_version is null or btrim(p_schema_version) = ''
  then
    raise exception 'Model and pipeline version values cannot be blank.'
      using errcode = '22023';
  end if;

  select years.id
  into selected_year_id
  from public.academic_years as years
  where years.year = p_academic_year
    and years.is_import_enabled;

  if not found then
    raise exception 'Academic year % is not enabled for imports.', p_academic_year
      using errcode = '22023';
  end if;

  select
    count(*),
    count(distinct documents.source_id),
    min(documents.source_id)
  into matched_count, source_count, selected_source_id
  from unnest(normalised_codes) as codes(code)
  join public.course_directory_entries as entries
    on entries.academic_year_id = selected_year_id
   and entries.code = codes.code
   and entries.is_current
  join public.course_source_pages as documents
    on documents.id = entries.source_page_id
   and documents.academic_year_id = entries.academic_year_id;

  if matched_count <> cardinality(normalised_codes) then
    raise exception
      'Every selected code must have a current directory row for academic year %.',
      p_academic_year
      using errcode = '22023';
  end if;

  if source_count <> 1 then
    raise exception 'Selected directory rows must come from one course source.'
      using errcode = '22023';
  end if;

  -- A terminal queue delivery cannot call the worker completion path. Before
  -- the partial unique index enforces one active run, resolve only objectively
  -- stale work. Fresh and never-dispatched targets continue to block overlap.
  select runs.id
  into active_run_id
  from public.course_import_runs as runs
  where runs.status in ('queued', 'running')
  order by runs.created_at
  limit 1;

  if found then
    begin
      perform public.fail_expired_course_import_targets(active_run_id);
    exception
      when no_data_found or object_not_in_prerequisite_state then
        -- The prior run may finish after the lookup and before recovery locks
        -- it. In that case the unique index is already clear.
        null;
    end;
  end if;

  begin
    insert into public.course_import_runs (
      source_id,
      academic_year_id,
      requested_model,
      parser_version,
      prompt_version,
      schema_version,
      initiated_by,
      target_count
    )
    values (
      selected_source_id,
      selected_year_id,
      btrim(p_requested_model),
      btrim(p_parser_version),
      btrim(p_prompt_version),
      btrim(p_schema_version),
      selected_user_id,
      cardinality(normalised_codes)
    )
    returning id into selected_run_id;
  exception
    when unique_violation then
      raise exception 'Another course import run is already active.'
        using errcode = '55000';
  end;

  insert into public.course_import_targets (
    run_id,
    source_id,
    academic_year_id,
    directory_entry_id,
    position,
    course_code,
    course_id,
    course_year_id,
    baseline_draft_snapshot_id,
    baseline_published_snapshot_id
  )
  select
    selected_run_id,
    selected_source_id,
    selected_year_id,
    entries.id,
    input.position::smallint,
    input.code,
    entries.course_id,
    course_years.id,
    course_years.draft_snapshot_id,
    course_years.published_snapshot_id
  from unnest(normalised_codes) with ordinality as input(code, position)
  join public.course_directory_entries as entries
    on entries.academic_year_id = selected_year_id
   and entries.code = input.code
   and entries.is_current
  left join public.course_years as course_years
    on course_years.course_id = entries.course_id
   and course_years.academic_year_id = selected_year_id;

  insert into public.course_import_stages (
    target_id,
    stage_name,
    position
  )
  select targets.id, stage.stage_name, stage.position
  from public.course_import_targets as targets
  cross join (
    values
      ('source_fetch'::text, 1::smallint),
      ('html_capture'::text, 2::smallint),
      ('markdown_normalise'::text, 3::smallint),
      ('model_input_prepare'::text, 4::smallint),
      ('deterministic_extract'::text, 5::smallint),
      ('model_extract'::text, 6::smallint),
      ('schema_validate'::text, 7::smallint),
      ('domain_validate'::text, 8::smallint),
      ('database_project'::text, 9::smallint),
      ('snapshot_persist'::text, 10::smallint)
  ) as stage(stage_name, position)
  where targets.run_id = selected_run_id;

  return query
  select
    targets.run_id,
    targets.id,
    targets.course_code,
    targets.position
  from public.course_import_targets as targets
  where targets.run_id = selected_run_id
  order by targets.position;
end;
$function$;

revoke all on function public.start_course_import(
  smallint,
  text[],
  text,
  text,
  text,
  text
) from public, anon, service_role;

grant execute on function public.start_course_import(
  smallint,
  text[],
  text,
  text,
  text,
  text
) to authenticated;

create or replace function private.refresh_course_import_run(
  p_run_id uuid
)
returns public.course_import_runs
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_run public.course_import_runs;
  target_total integer;
  processed_total integer;
  review_total integer;
  unchanged_total integer;
  failed_total integer;
  extraction_total integer;
  input_token_total bigint;
  output_token_total bigint;
  cost_total numeric(12, 6);
  next_status text;
begin
  -- Serialise all aggregate refreshes for a run. Without this lock, two target
  -- completions can both count the other target as still processing and the
  -- final committer can leave a fully completed run stuck in `running`.
  perform 1
  from public.course_import_runs as runs
  where runs.id = p_run_id
  for update;

  if not found then
    raise exception 'Course import run % does not exist.', p_run_id
      using errcode = 'P0002';
  end if;

  select count(*),
    count(*) filter (
      where processing_status in (
        'ready_for_review',
        'unchanged',
        'failed',
        'cancelled'
      )
    ),
    count(*) filter (
      where processing_status = 'ready_for_review'
        and review_status = 'pending'
    ),
    count(*) filter (where processing_status = 'unchanged'),
    count(*) filter (where processing_status in ('failed', 'cancelled'))
  into
    target_total,
    processed_total,
    review_total,
    unchanged_total,
    failed_total
  from public.course_import_targets
  where run_id = p_run_id;

  select
    count(*),
    coalesce(sum(extractions.input_tokens), 0),
    coalesce(sum(extractions.output_tokens), 0),
    coalesce(sum(extractions.cost_usd), 0)
  into
    extraction_total,
    input_token_total,
    output_token_total,
    cost_total
  from public.course_extractions as extractions
  join public.course_import_targets as targets
    on targets.id = extractions.target_id
  where targets.run_id = p_run_id;

  if processed_total < target_total then
    next_status := 'running';
  elsif failed_total = target_total then
    next_status := 'failed';
  elsif failed_total > 0 then
    next_status := 'partially_succeeded';
  else
    next_status := 'succeeded';
  end if;

  update public.course_import_runs as runs
  set
    status = next_status,
    started_at = coalesce(runs.started_at, statement_timestamp()),
    processed_count = processed_total,
    ready_for_review_count = review_total,
    unchanged_count = unchanged_total,
    failed_count = failed_total,
    extraction_count = extraction_total,
    input_tokens = input_token_total,
    output_tokens = output_token_total,
    actual_cost_usd = cost_total,
    heartbeat_at = statement_timestamp(),
    completed_at = case
      when next_status in (
        'succeeded',
        'partially_succeeded',
        'failed',
        'cancelled'
      ) then coalesce(runs.completed_at, statement_timestamp())
      else null
    end
  where runs.id = p_run_id
  returning runs.* into selected_run;

  if not found then
    raise exception 'Course import run % does not exist.', p_run_id
      using errcode = 'P0002';
  end if;

  return selected_run;
end;
$function$;

revoke all on function private.refresh_course_import_run(uuid)
from public, anon, authenticated;

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
begin
  -- Match claim, heartbeat and finish lock order so a lease extension and a
  -- stale-delivery recovery cannot both succeed.
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

  if not (
    (
      selected_target.processing_status = 'processing'
      and selected_target.lease_expires_at <= statement_timestamp()
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
        then 'WORKER_LEASE_EXPIRED'
      when selected_target.queue_message_id is null
        then 'QUEUE_DISPATCH_STALE'
      else 'QUEUE_DELIVERY_STALE'
    end,
    error_summary = case
      when selected_target.processing_status = 'processing'
        then 'The import worker lease expired before completion.'
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

create or replace function public.fail_expired_course_import_targets(
  p_run_id uuid
)
returns table (
  run_id uuid,
  newly_failed_target_count integer,
  run_status text,
  processed_count smallint,
  failed_count smallint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_user_id uuid;
  selected_run public.course_import_runs;
  stale_target_id uuid;
  stale_target_count integer := 0;
begin
  selected_user_id := (select auth.uid());

  if selected_user_id is null
    or not (select private.has_permission('imports.manage'))
  then
    raise exception 'Course import management permission is required.'
      using errcode = '42501';
  end if;

  select runs.*
  into selected_run
  from public.course_import_runs as runs
  where runs.id = p_run_id
    and runs.status in ('queued', 'running')
  for update;

  if not found then
    if exists (
      select 1
      from public.course_import_runs as runs
      where runs.id = p_run_id
    ) then
      raise exception 'Course import run % is not active.', p_run_id
        using errcode = '55000';
    end if;

    raise exception 'Course import run % does not exist.', p_run_id
      using errcode = 'P0002';
  end if;

  for stale_target_id in
    select targets.id
    from public.course_import_targets as targets
    where targets.run_id = p_run_id
      and (
        (
          targets.processing_status = 'processing'
          and targets.lease_expires_at <= statement_timestamp()
        )
        or (
          targets.processing_status = 'queued'
          and (
            (
              targets.queue_message_id is not null
              and targets.dispatched_at
                <= statement_timestamp() - interval '30 minutes'
            )
            or (
              targets.queue_message_id is null
              and targets.dispatched_at is null
              and targets.created_at
                <= statement_timestamp() - interval '30 minutes'
            )
          )
        )
      )
    order by targets.position
  loop
    if private.recover_stale_course_import_target(
      p_run_id,
      stale_target_id
    ) then
      stale_target_count := stale_target_count + 1;
    end if;
  end loop;

  select runs.*
  into selected_run
  from public.course_import_runs as runs
  where runs.id = p_run_id;

  return query
  select
    selected_run.id,
    stale_target_count,
    selected_run.status,
    selected_run.processed_count,
    selected_run.failed_count;
end;
$function$;

revoke all on function public.fail_expired_course_import_targets(uuid)
from public, anon, service_role;

grant execute on function public.fail_expired_course_import_targets(uuid)
to authenticated;

create or replace function private.claim_course_import_target(
  p_run_id uuid,
  p_target_id uuid,
  p_message_id text,
  p_worker_id uuid,
  p_lease_seconds integer default 600
)
returns table (
  run_id uuid,
  target_id uuid,
  academic_year smallint,
  academic_year_id bigint,
  course_code text,
  requested_model text,
  initiated_by uuid,
  parser_version text,
  prompt_version text,
  schema_version text,
  source_id bigint,
  source_base_url text,
  directory_entry_id bigint,
  course_id bigint,
  course_year_id bigint,
  baseline_draft_snapshot_id bigint,
  baseline_published_snapshot_id bigint,
  attempt_count smallint,
  lock_version integer,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_target public.course_import_targets;
  selected_run public.course_import_runs;
begin
  if p_worker_id is null then
    raise exception 'Worker ID is required.' using errcode = '22023';
  end if;

  if p_message_id is null or btrim(p_message_id) = '' then
    raise exception 'Queue message ID is required.' using errcode = '22023';
  end if;

  if p_lease_seconds not between 30 and 3600 then
    raise exception 'Lease duration must be between 30 and 3600 seconds.'
      using errcode = '22023';
  end if;

  select runs.*
  into selected_run
  from public.course_import_runs as runs
  where runs.id = p_run_id
  for update;

  if not found or selected_run.status not in ('queued', 'running') then
    raise exception 'Course import run % is not active.', p_run_id
      using errcode = '55000';
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

  if selected_target.processing_status = 'processing'
    and selected_target.worker_id = p_worker_id
    and selected_target.queue_message_id = btrim(p_message_id)
  then
    update public.course_import_targets as targets
    set
      heartbeat_at = statement_timestamp(),
      lease_expires_at = statement_timestamp()
        + make_interval(secs => p_lease_seconds),
      lock_version = targets.lock_version + 1
    where targets.id = p_target_id
    returning targets.* into selected_target;
  elsif selected_target.processing_status = 'queued'
    or (
      selected_target.processing_status = 'processing'
      and selected_target.lease_expires_at <= statement_timestamp()
    )
  then
    begin
      update public.course_import_targets as targets
      set
        processing_status = 'processing',
        worker_id = p_worker_id,
        queue_message_id = btrim(p_message_id),
        dispatched_at = coalesce(targets.dispatched_at, statement_timestamp()),
        dispatch_error = null,
        lease_expires_at = statement_timestamp()
          + make_interval(secs => p_lease_seconds),
        claimed_at = statement_timestamp(),
        heartbeat_at = statement_timestamp(),
        attempt_count = targets.attempt_count + 1,
        lock_version = targets.lock_version + 1,
        error_code = null,
        error_summary = null
      where targets.id = p_target_id
      returning targets.* into selected_target;
    exception
      when unique_violation then
        raise exception 'Queue message ID % has already been claimed.', p_message_id
          using errcode = '55000';
    end;
  else
    raise exception 'Course import target % is not claimable.', p_target_id
      using errcode = '55000';
  end if;

  update public.course_import_runs as runs
  set
    status = 'running',
    started_at = coalesce(runs.started_at, statement_timestamp()),
    heartbeat_at = statement_timestamp()
  where runs.id = p_run_id;

  return query
  select
    runs.id,
    targets.id,
    years.year,
    targets.academic_year_id,
    targets.course_code,
    runs.requested_model,
    runs.initiated_by,
    runs.parser_version,
    runs.prompt_version,
    runs.schema_version,
    targets.source_id,
    sources.base_url,
    targets.directory_entry_id,
    targets.course_id,
    targets.course_year_id,
    targets.baseline_draft_snapshot_id,
    targets.baseline_published_snapshot_id,
    targets.attempt_count,
    targets.lock_version,
    targets.lease_expires_at
  from public.course_import_targets as targets
  join public.course_import_runs as runs on runs.id = targets.run_id
  join public.academic_years as years on years.id = targets.academic_year_id
  join public.course_sources as sources on sources.id = targets.source_id
  where targets.id = p_target_id;
end;
$function$;

revoke all on function private.claim_course_import_target(
  uuid,
  uuid,
  text,
  uuid,
  integer
) from public, anon, authenticated;

grant execute on function private.claim_course_import_target(
  uuid,
  uuid,
  text,
  uuid,
  integer
) to service_role;

create or replace function private.heartbeat_course_import_target(
  p_run_id uuid,
  p_target_id uuid,
  p_message_id text,
  p_worker_id uuid,
  p_expected_lock_version integer,
  p_lease_seconds integer default 600
)
returns table (
  lock_version integer,
  heartbeat_at timestamptz,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_lease_seconds not between 30 and 3600 then
    raise exception 'Lease duration must be between 30 and 3600 seconds.'
      using errcode = '22023';
  end if;

  -- Claims, heartbeats and completions all acquire run then target. A single
  -- lock order avoids a lease-reclaim deadlock between those operations.
  perform 1
  from public.course_import_runs as runs
  where runs.id = p_run_id
    and runs.status = 'running'
  for update;

  if not found then
    raise exception 'Course import run % is not running.', p_run_id
      using errcode = '55000';
  end if;

  return query
  update public.course_import_targets as targets
  set
    heartbeat_at = statement_timestamp(),
    lease_expires_at = statement_timestamp()
      + make_interval(secs => p_lease_seconds),
    lock_version = targets.lock_version + 1
  where targets.id = p_target_id
    and targets.run_id = p_run_id
    and targets.processing_status = 'processing'
    and targets.worker_id = p_worker_id
    and targets.queue_message_id = btrim(p_message_id)
    and targets.lock_version = p_expected_lock_version
  returning
    targets.lock_version,
    targets.heartbeat_at,
    targets.lease_expires_at;

  if not found then
    raise exception 'Course import target lease or lock version no longer matches.'
      using errcode = '55000';
  end if;

  update public.course_import_runs
  set heartbeat_at = statement_timestamp()
  where id = p_run_id
    and status = 'running';
end;
$function$;

revoke all on function private.heartbeat_course_import_target(
  uuid,
  uuid,
  text,
  uuid,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function private.heartbeat_course_import_target(
  uuid,
  uuid,
  text,
  uuid,
  integer,
  integer
) to service_role;

create or replace function private.finish_course_import_target(
  p_run_id uuid,
  p_target_id uuid,
  p_message_id text,
  p_worker_id uuid,
  p_expected_lock_version integer,
  p_processing_status text,
  p_change_kind text,
  p_course_id bigint,
  p_course_year_id bigint,
  p_source_page_id bigint,
  p_candidate_snapshot_id bigint,
  p_error_code text default null,
  p_error_summary text default null
)
returns public.course_import_targets
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_target public.course_import_targets;
begin
  if p_processing_status not in (
    'ready_for_review',
    'unchanged',
    'failed',
    'cancelled'
  ) then
    raise exception 'Unsupported target completion status %.', p_processing_status
      using errcode = '22023';
  end if;

  -- Match the claim path's run-then-target lock order and hold the run lock
  -- through aggregate refresh. This also makes the final run status exact when
  -- multiple targets complete together.
  perform 1
  from public.course_import_runs as runs
  where runs.id = p_run_id
    and runs.status = 'running'
  for update;

  if not found then
    raise exception 'Course import run % is not running.', p_run_id
      using errcode = '55000';
  end if;

  select targets.*
  into selected_target
  from public.course_import_targets as targets
  where targets.id = p_target_id
    and targets.run_id = p_run_id
  for update;

  if not found
    or selected_target.processing_status <> 'processing'
    or selected_target.worker_id is distinct from p_worker_id
    or selected_target.queue_message_id is distinct from btrim(p_message_id)
    or selected_target.lock_version <> p_expected_lock_version
  then
    raise exception 'Course import target lease or lock version no longer matches.'
      using errcode = '55000';
  end if;

  if p_processing_status in ('ready_for_review', 'unchanged')
    and exists (
      select 1
      from public.course_import_stages as stages
      where stages.target_id = p_target_id
        and stages.status not in ('succeeded', 'skipped')
    )
  then
    raise exception 'Every import stage must finish before successful completion.'
      using errcode = '55000';
  end if;

  if p_processing_status = 'ready_for_review' then
    if p_change_kind not in ('new', 'changed')
      or p_course_id is null
      or p_course_year_id is null
      or p_source_page_id is null
      or p_candidate_snapshot_id is null
    then
      raise exception 'Changed candidates require complete snapshot provenance.'
        using errcode = '22023';
    end if;

    -- Every snapshot child guard locks the owning course year before checking
    -- `sealed_at`. Take the same lock before sealing so no child insert can pass
    -- an unsealed check and commit after this completion.
    perform 1
    from public.course_years as course_years
    where course_years.id = p_course_year_id
      and course_years.course_id = p_course_id
      and course_years.academic_year_id = selected_target.academic_year_id
    for update;

    if not found then
      raise exception 'Candidate course year provenance does not match the target.'
        using errcode = '23503';
    end if;

    perform 1
    from public.course_snapshots as snapshots
    where snapshots.id = p_candidate_snapshot_id
      and snapshots.course_year_id = p_course_year_id
      and snapshots.academic_year_id = selected_target.academic_year_id
      and snapshots.source_page_id = p_source_page_id
      and snapshots.origin = 'import'
    for update;

    if not found then
      raise exception 'Candidate snapshot provenance does not match the target.'
        using errcode = '23503';
    end if;

    if not exists (
      select 1
      from public.course_review_items as reviews
      where reviews.target_id = p_target_id
        and reviews.course_snapshot_id = p_candidate_snapshot_id
        and reviews.issue_code = 'MANUAL_REVIEW_REQUIRED'
        and reviews.status = 'open'
    ) then
      raise exception 'Every changed candidate requires manual review.'
        using errcode = '55000';
    end if;

    update public.course_snapshots
    set sealed_at = greatest(statement_timestamp(), created_at)
    where id = p_candidate_snapshot_id
      and sealed_at is null;
  elsif p_processing_status = 'unchanged' then
    if p_change_kind <> 'unchanged'
      or p_candidate_snapshot_id is not null
      or p_course_id is null
      or p_course_year_id is null
      or p_source_page_id is null
    then
      raise exception 'Unchanged results require source provenance and no candidate.'
        using errcode = '22023';
    end if;
  else
    if p_change_kind is not null or p_candidate_snapshot_id is not null then
      raise exception 'Failed or cancelled targets cannot carry a candidate.'
        using errcode = '22023';
    end if;

    if p_processing_status = 'failed'
      and (p_error_summary is null or btrim(p_error_summary) = '')
    then
      raise exception 'Failed targets require an error summary.'
        using errcode = '22023';
    end if;
  end if;

  update public.course_import_targets as targets
  set
    course_id = coalesce(p_course_id, targets.course_id),
    course_year_id = coalesce(p_course_year_id, targets.course_year_id),
    source_page_id = coalesce(
      p_source_page_id,
      targets.source_page_id
    ),
    candidate_snapshot_id = p_candidate_snapshot_id,
    processing_status = p_processing_status,
    review_status = case
      when p_processing_status = 'ready_for_review' then 'pending'
      else 'not_required'
    end,
    change_kind = p_change_kind,
    lease_expires_at = null,
    lock_version = targets.lock_version + 1,
    error_code = nullif(btrim(p_error_code), ''),
    error_summary = nullif(btrim(p_error_summary), ''),
    finished_at = statement_timestamp()
  where targets.id = p_target_id
    and targets.lock_version = p_expected_lock_version
  returning targets.* into selected_target;

  if not found then
    raise exception 'Course import target lock version changed during completion.'
      using errcode = '55000';
  end if;

  perform private.refresh_course_import_run(p_run_id);

  return selected_target;
end;
$function$;

revoke all on function private.finish_course_import_target(
  uuid,
  uuid,
  text,
  uuid,
  integer,
  text,
  text,
  bigint,
  bigint,
  bigint,
  bigint,
  text,
  text
) from public, anon, authenticated;

grant execute on function private.finish_course_import_target(
  uuid,
  uuid,
  text,
  uuid,
  integer,
  text,
  text,
  bigint,
  bigint,
  bigint,
  bigint,
  text,
  text
) to service_role;

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
    or current_draft_snapshot_id
      is distinct from selected_target.baseline_draft_snapshot_id
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

create or replace function public.reject_course_import_target(
  p_target_id uuid,
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

  -- Rejection moves no course pointer. The locked target and its sealed
  -- candidate remain safe to resolve after either course-year pointer changes.
  -- Acceptance retains its optimistic baseline checks.

  update public.course_import_targets as targets
  set
    review_status = 'rejected',
    reviewed_by = selected_user_id,
    reviewed_at = statement_timestamp(),
    lock_version = targets.lock_version + 1
  where targets.id = p_target_id
  returning targets.* into selected_target;

  update public.course_review_items
  set
    status = 'rejected',
    resolved_by = selected_user_id,
    resolved_at = statement_timestamp(),
    resolution_note = p_resolution_note
  where target_id = p_target_id
    and status = 'open';

  perform private.refresh_course_import_run(selected_target.run_id);

  return selected_target;
end;
$function$;

revoke all on function public.reject_course_import_target(
  uuid,
  text
) from public, anon, service_role;

grant execute on function public.reject_course_import_target(
  uuid,
  text
) to authenticated;

create or replace function private.validate_course_review_item()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  target_year_id bigint;
  target_course_year_id bigint;
  snapshot_year_id bigint;
  snapshot_course_year_id bigint;
begin
  if tg_op = 'UPDATE' then
    if new.target_id is distinct from old.target_id
      or new.course_snapshot_id is distinct from old.course_snapshot_id
      or new.entity_kind is distinct from old.entity_kind
      or new.entity_key is distinct from old.entity_key
      or new.field_path is distinct from old.field_path
      or new.issue_code is distinct from old.issue_code
      or new.importance is distinct from old.importance
      or new.is_blocking is distinct from old.is_blocking
      or new.confidence is distinct from old.confidence
      or new.summary is distinct from old.summary
      or new.old_value is distinct from old.old_value
      or new.new_value is distinct from old.new_value
      or new.source_locator is distinct from old.source_locator
      or new.source_excerpt is distinct from old.source_excerpt
      or new.assigned_to is distinct from old.assigned_to
    then
      raise exception 'course review evidence is immutable'
        using errcode = '55000';
    end if;

    if old.status <> 'open' or new.status not in (
      'accepted',
      'rejected',
      'dismissed'
    ) then
      raise exception 'resolved course review items are immutable'
        using errcode = '55000';
    end if;
  end if;

  select targets.academic_year_id, targets.course_year_id
  into target_year_id, target_course_year_id
  from public.course_import_targets as targets
  where targets.id = new.target_id;

  select snapshots.academic_year_id, snapshots.course_year_id
  into snapshot_year_id, snapshot_course_year_id
  from public.course_snapshots as snapshots
  where snapshots.id = new.course_snapshot_id
    and snapshots.origin = 'import';

  if target_year_id is distinct from snapshot_year_id
    or (
      target_course_year_id is not null
      and target_course_year_id is distinct from snapshot_course_year_id
    )
  then
    raise exception 'course review item provenance does not match its target'
      using errcode = '23503';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_course_review_item()
from public, anon, authenticated;

create trigger course_review_items_validate
before insert or update on public.course_review_items
for each row execute function private.validate_course_review_item();

alter table public.course_import_runs enable row level security;
alter table public.course_import_targets enable row level security;
alter table public.course_import_stages enable row level security;
alter table public.course_import_artifacts enable row level security;
alter table public.course_extractions enable row level security;
alter table public.course_review_items enable row level security;
alter table public.course_attributes enable row level security;
alter table public.course_unit_options enable row level security;
alter table public.course_rule_condition_courses enable row level security;

create policy course_import_runs_admin_read
on public.course_import_runs
for select
to authenticated
using ((select private.has_permission('imports.manage')));

create policy course_import_targets_admin_read
on public.course_import_targets
for select
to authenticated
using ((select private.has_permission('imports.manage')));

create policy course_import_stages_admin_read
on public.course_import_stages
for select
to authenticated
using ((select private.has_permission('imports.manage')));

create policy course_import_artifacts_admin_read
on public.course_import_artifacts
for select
to authenticated
using ((select private.has_permission('imports.manage')));

create policy course_extractions_admin_read
on public.course_extractions
for select
to authenticated
using ((select private.has_permission('imports.manage')));

create policy course_review_items_admin_read
on public.course_review_items
for select
to authenticated
using ((select private.has_permission('imports.manage')));

-- Import reviewers need the complete relational candidate, including children
-- that pre-date the snapshot pipeline. Their existing draft policies only
-- recognise catalogue.read_drafts, so imports.manage receives an explicit
-- read path across every table used by the review workspace.
do $policy$
declare
  table_name text;
begin
  foreach table_name in array array[
    'course_offerings',
    'offering_sessions',
    'course_learning_outcomes',
    'course_assessment_items',
    'course_assessment_outcomes',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions',
    'course_rule_course_references'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.has_permission(''imports.manage'')))',
      table_name || '_import_admin_read',
      table_name
    );
  end loop;
end;
$policy$;

create policy course_attributes_read_published
on public.course_attributes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_years as course_years
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = course_attributes.course_snapshot_id
  )
);

create policy course_attributes_admin_read
on public.course_attributes
for select
to authenticated
using (
  (select private.has_permission('catalogue.read_drafts'))
  or (select private.has_permission('imports.manage'))
);

create policy course_attributes_admin_insert
on public.course_attributes
for insert
to authenticated
with check (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);

create policy course_unit_options_read_published
on public.course_unit_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_years as course_years
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = course_unit_options.course_snapshot_id
  )
);

create policy course_unit_options_admin_read
on public.course_unit_options
for select
to authenticated
using (
  (select private.has_permission('catalogue.read_drafts'))
  or (select private.has_permission('imports.manage'))
);

create policy course_unit_options_admin_insert
on public.course_unit_options
for insert
to authenticated
with check (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);

create policy course_rule_condition_courses_read_published
on public.course_rule_condition_courses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_years as course_years
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id =
        course_rule_condition_courses.course_snapshot_id
  )
);

create policy course_rule_condition_courses_admin_read
on public.course_rule_condition_courses
for select
to authenticated
using (
  (select private.has_permission('catalogue.read_drafts'))
  or (select private.has_permission('imports.manage'))
);

create policy course_rule_condition_courses_admin_insert
on public.course_rule_condition_courses
for insert
to authenticated
with check (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);

revoke all on table
  public.course_import_runs,
  public.course_import_targets,
  public.course_import_stages,
  public.course_import_artifacts,
  public.course_extractions,
  public.course_review_items
from anon, authenticated;

grant select on table
  public.course_import_runs,
  public.course_import_targets,
  public.course_import_stages,
  public.course_import_artifacts,
  public.course_extractions,
  public.course_review_items
to authenticated;

grant select on table
  public.course_directory_latest_import_targets,
  public.course_directory_admin_entries
to authenticated;

grant select on table public.course_attributes to anon, authenticated;
grant insert on table public.course_attributes to authenticated;
grant usage, select on sequence public.course_attributes_id_seq to authenticated;

grant select on table public.course_unit_options to anon, authenticated;
grant insert on table public.course_unit_options to authenticated;
grant usage, select on sequence public.course_unit_options_id_seq to authenticated;

grant select on table public.course_rule_condition_courses to anon, authenticated;
grant insert on table public.course_rule_condition_courses to authenticated;
grant usage, select on sequence
  public.course_rule_condition_courses_id_seq
to authenticated;

grant usage on schema private to service_role;

-- The trusted import worker records each immutable fetched page before it
-- projects a snapshot, then links the selected directory entry to the stable
-- course identity. These tables and the renamed source-page sequence predate
-- the workflow tables, so grant their worker privileges explicitly rather
-- than relying on environment-specific default privileges.
grant select, insert on table public.course_source_pages to service_role;
grant select, update on table public.course_directory_entries to service_role;
grant usage, select on sequence public.course_source_pages_id_seq
to service_role;

grant all on table
  public.course_import_runs,
  public.course_import_targets,
  public.course_import_stages,
  public.course_import_artifacts,
  public.course_extractions,
  public.course_review_items,
  public.course_attributes,
  public.course_unit_options,
  public.course_rule_condition_courses
to service_role;

grant usage, select on sequence
  public.course_attributes_id_seq,
  public.course_unit_options_id_seq,
  public.course_rule_condition_courses_id_seq
to service_role;

comment on function public.fail_expired_course_import_targets(uuid) is
  'Fails expired processing leases and queued targets without confirmed worker activity for at least 30 minutes, then refreshes the owning run.';

comment on function private.recover_stale_course_import_target(uuid, uuid) is
  'Worker-safe idempotent recovery for one terminal target, expired lease or stale queued delivery.';

comment on table public.course_import_runs is
  'One administrator-started course import containing between one and ten explicit targets.';

comment on table public.course_import_targets is
  'A durable course and academic-year target with queue lease, optimistic baseline and review state.';

comment on table public.course_import_stages is
  'The ten ordered and inspectable stages of one course import target.';

comment on table public.course_import_artifacts is
  'Immutable content-addressed import artefact metadata. Bodies live only in a private storage bucket.';

comment on table public.course_extractions is
  'Idempotent OpenRouter request and response evidence with zero-cost cache lineage and one guarded pending-to-validated transition.';

comment on table public.course_review_items is
  'Human decisions for every imported candidate and every material field or rule change.';

comment on table public.course_attributes is
  'Snapshot-owned STEM, graduate and future course attributes.';

comment on table public.course_unit_options is
  'Snapshot-owned unit choices for variable-unit courses.';

comment on table public.course_rule_condition_courses is
  'The explicit course set attached to a snapshot-owned course_set_units condition.';

comment on column public.course_import_targets.baseline_draft_snapshot_id is
  'Draft pointer captured when the run started. Acceptance fails if this baseline changed.';

comment on column public.course_import_targets.candidate_snapshot_id is
  'Sealed imported candidate. It becomes draft only after explicit acceptance and never changes publication.';
