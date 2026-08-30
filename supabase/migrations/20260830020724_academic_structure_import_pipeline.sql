-- Snapshot-native academic structure imports.
--
-- Courses keep their established pipeline. Programmes, majors, minors and
-- specialisations share this structure-specific pipeline because their
-- requirement trees and publication lifecycle are materially different from
-- course requisites.

create table public.academic_structure_sources (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null,
  base_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_sources_kind_url_unique unique (kind, base_url),
  constraint academic_structure_sources_name_check check (btrim(name) <> ''),
  constraint academic_structure_sources_kind_check check (btrim(kind) <> ''),
  constraint academic_structure_sources_url_check check (
    base_url ~ '^https://[^[:space:]]+$'
  )
);

insert into public.academic_structure_sources (name, kind, base_url)
values (
  'ANU Programs and Courses',
  'anu_programs_and_courses',
  'https://programsandcourses.anu.edu.au'
)
on conflict (kind, base_url) do update
set name = excluded.name, is_active = true, updated_at = now();

create table public.academic_structure_source_pages (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.academic_structure_sources (id),
  academic_year_id bigint not null references public.academic_years (id),
  page_kind text not null,
  structure_kind text,
  external_key text not null,
  canonical_url text not null,
  media_type text not null,
  content_sha256 text not null,
  byte_size integer not null,
  http_status smallint not null,
  http_etag text,
  source_last_modified timestamptz,
  fetched_at timestamptz not null default now(),
  storage_bucket text,
  storage_path text,
  created_at timestamptz not null default now(),
  constraint academic_structure_source_pages_snapshot_unique unique (
    source_id,
    academic_year_id,
    page_kind,
    external_key,
    content_sha256
  ),
  constraint academic_structure_source_pages_id_year_unique unique (
    id,
    academic_year_id
  ),
  constraint academic_structure_source_pages_page_kind_check check (
    page_kind in ('directory', 'structure')
  ),
  constraint academic_structure_source_pages_structure_kind_check check (
    structure_kind is null
    or structure_kind in ('programme', 'major', 'minor', 'specialisation')
  ),
  constraint academic_structure_source_pages_kind_pair_check check (
    (page_kind = 'directory' and structure_kind is not null)
    or (page_kind = 'structure' and structure_kind is not null)
  ),
  constraint academic_structure_source_pages_external_key_check check (
    btrim(external_key) <> ''
  ),
  constraint academic_structure_source_pages_url_check check (
    canonical_url ~ '^https://programsandcourses\.anu\.edu\.au/'
  ),
  constraint academic_structure_source_pages_media_type_check check (
    btrim(media_type) <> ''
  ),
  constraint academic_structure_source_pages_hash_check check (
    content_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint academic_structure_source_pages_byte_size_check check (byte_size >= 0),
  constraint academic_structure_source_pages_http_status_check check (
    http_status between 100 and 599
  ),
  constraint academic_structure_source_pages_storage_check check (
    num_nonnulls(storage_bucket, storage_path) in (0, 2)
  )
);

create table public.academic_structure_directory_entries (
  id bigint generated always as identity primary key,
  academic_year_id bigint not null references public.academic_years (id),
  source_id bigint not null references public.academic_structure_sources (id),
  source_page_id bigint not null,
  structure_kind text not null,
  code text not null,
  title text not null,
  short_title text,
  academic_career text,
  duration_years numeric(4, 1),
  units numeric(7, 2),
  mode_of_delivery text,
  selection_rank numeric(5, 2),
  source_url text not null,
  is_available boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_directory_entries_source_page_fkey
    foreign key (source_page_id, academic_year_id)
    references public.academic_structure_source_pages (id, academic_year_id),
  constraint academic_structure_directory_entries_year_kind_code_unique unique (
    academic_year_id,
    structure_kind,
    code
  ),
  constraint academic_structure_directory_entries_kind_check check (
    structure_kind in ('programme', 'major', 'minor', 'specialisation')
  ),
  constraint academic_structure_directory_entries_code_check check (
    code ~ '^[A-Z0-9][A-Z0-9-]{1,31}$'
  ),
  constraint academic_structure_directory_entries_title_check check (
    btrim(title) <> ''
  ),
  constraint academic_structure_directory_entries_duration_check check (
    duration_years is null or duration_years > 0
  ),
  constraint academic_structure_directory_entries_units_check check (
    units is null or units > 0
  ),
  constraint academic_structure_directory_entries_url_check check (
    source_url ~ '^https://programsandcourses\.anu\.edu\.au/'
  )
);

create table public.academic_structure_directory_statuses (
  academic_year_id bigint not null references public.academic_years (id),
  structure_kind text not null,
  source_availability text not null default 'unknown',
  availability_checked_at timestamptz,
  directory_refreshed_at timestamptz,
  availability_note text,
  received_count integer,
  unique_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (academic_year_id, structure_kind),
  constraint academic_structure_directory_statuses_kind_check check (
    structure_kind in ('programme', 'major', 'minor', 'specialisation')
  ),
  constraint academic_structure_directory_statuses_availability_check check (
    source_availability in ('unknown', 'available', 'unavailable')
  ),
  constraint academic_structure_directory_statuses_counts_check check (
    (received_count is null or received_count >= 0)
    and (unique_count is null or unique_count >= 0)
    and (received_count is null or unique_count is null or unique_count <= received_count)
  ),
  constraint academic_structure_directory_statuses_note_check check (
    availability_note is null or btrim(availability_note) <> ''
  )
);

alter table public.academic_structures
  drop constraint academic_structures_kind_check;
alter table public.academic_structures
  add constraint academic_structures_kind_check check (
    kind in ('degree', 'programme', 'major', 'minor', 'specialisation')
  );
create table public.academic_structure_years (
  id bigint generated always as identity primary key,
  structure_id bigint not null references public.academic_structures (id) on delete cascade,
  academic_year_id bigint not null references public.academic_years (id),
  draft_snapshot_id bigint,
  published_snapshot_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_years_structure_year_unique unique (
    structure_id,
    academic_year_id
  ),
  constraint academic_structure_years_id_year_unique unique (id, academic_year_id),
  constraint academic_structure_years_id_structure_unique unique (id, structure_id)
);

-- Student plans now point to the same year-specific structure identities that
-- imports and publication use. Development plan data is intentionally reset;
-- carrying the legacy version foreign keys forward would preserve a second
-- source of truth.
delete from public.plans;

alter table public.plan_structures
  drop constraint plan_structures_plan_owner_year_fkey,
  drop constraint plan_structures_structure_year_fkey,
  drop constraint plan_structures_plan_structure_unique;
drop index public.plan_structures_plan_owner_year_idx;
drop index public.plan_structures_structure_year_idx;

alter table public.plan_structures
  drop column catalogue_year_id,
  drop column structure_version_id,
  add column academic_year_id bigint not null,
  add column structure_year_id bigint not null;

alter table public.plans
  drop constraint plans_catalogue_year_id_fkey,
  drop constraint plans_id_owner_year_unique;
drop index public.plans_catalogue_year_id_idx;

alter table public.plans
  drop column catalogue_year_id,
  add column academic_year_id bigint not null references public.academic_years (id),
  add constraint plans_id_owner_academic_year_unique unique (
    id,
    owner_id,
    academic_year_id
  );

alter table public.plan_structures
  add constraint plan_structures_plan_owner_academic_year_fkey
    foreign key (plan_id, owner_id, academic_year_id)
    references public.plans (id, owner_id, academic_year_id) on delete cascade,
  add constraint plan_structures_structure_academic_year_fkey
    foreign key (structure_year_id, academic_year_id)
    references public.academic_structure_years (id, academic_year_id),
  add constraint plan_structures_plan_structure_year_unique unique (
    plan_id,
    structure_year_id
  );

create index plans_academic_year_id_idx
  on public.plans (academic_year_id);
create index plan_structures_plan_owner_academic_year_idx
  on public.plan_structures (plan_id, owner_id, academic_year_id, position);
create index plan_structures_structure_academic_year_idx
  on public.plan_structures (structure_year_id, academic_year_id);

create table public.academic_structure_import_runs (
  id uuid primary key default gen_random_uuid(),
  run_number bigint generated always as identity,
  source_id bigint not null references public.academic_structure_sources (id),
  academic_year_id bigint not null references public.academic_years (id),
  structure_kind text not null,
  requested_model text not null,
  parser_version text not null,
  prompt_version text not null,
  schema_version text not null,
  status text not null default 'queued',
  initiated_by uuid references auth.users (id) on delete set null,
  target_count smallint not null,
  queued_count smallint not null default 0,
  running_count smallint not null default 0,
  succeeded_count smallint not null default 0,
  failed_count smallint not null default 0,
  cancelled_count smallint not null default 0,
  accepted_count smallint not null default 0,
  rejected_count smallint not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  error_summary text,
  heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_import_runs_run_number_unique unique (run_number),
  constraint academic_structure_import_runs_kind_check check (
    structure_kind in ('programme', 'major', 'minor', 'specialisation')
  ),
  constraint academic_structure_import_runs_status_check check (
    status in (
      'queued',
      'running',
      'succeeded',
      'partially_succeeded',
      'failed',
      'cancelled'
    )
  ),
  constraint academic_structure_import_runs_target_count_check check (
    target_count between 1 and 10
  ),
  constraint academic_structure_import_runs_counts_check check (
    queued_count >= 0
    and running_count >= 0
    and succeeded_count >= 0
    and failed_count >= 0
    and cancelled_count >= 0
    and accepted_count >= 0
    and rejected_count >= 0
    and queued_count + running_count + succeeded_count + failed_count + cancelled_count = target_count
    and accepted_count + rejected_count <= succeeded_count
  ),
  constraint academic_structure_import_runs_usage_check check (
    input_tokens >= 0 and output_tokens >= 0 and cost_usd >= 0
  ),
  constraint academic_structure_import_runs_versions_check check (
    btrim(requested_model) <> ''
    and btrim(parser_version) <> ''
    and btrim(prompt_version) <> ''
    and btrim(schema_version) <> ''
  )
);

create unique index academic_structure_import_runs_one_active_idx
  on public.academic_structure_import_runs ((true))
  where status in ('queued', 'running');

create table public.academic_structure_import_targets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.academic_structure_import_runs (id) on delete cascade,
  academic_year_id bigint not null references public.academic_years (id),
  directory_entry_id bigint not null references public.academic_structure_directory_entries (id),
  position smallint not null,
  structure_kind text not null,
  structure_code text not null,
  structure_id bigint references public.academic_structures (id),
  structure_year_id bigint references public.academic_structure_years (id),
  baseline_draft_snapshot_id bigint,
  baseline_published_snapshot_id bigint,
  candidate_snapshot_id bigint,
  processing_status text not null default 'queued',
  review_status text not null default 'pending',
  requested_model text not null,
  source_page_id bigint,
  change_kind text,
  worker_id uuid,
  queue_message_id text,
  dispatched_at timestamptz,
  dispatch_error text,
  claimed_at timestamptz,
  heartbeat_at timestamptz,
  lease_expires_at timestamptz,
  attempt_count smallint not null default 0,
  lock_version integer not null default 0,
  error_code text,
  error_summary text,
  started_at timestamptz,
  finished_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_import_targets_run_position_unique unique (run_id, position),
  constraint academic_structure_import_targets_run_code_unique unique (run_id, structure_code),
  constraint academic_structure_import_targets_kind_check check (
    structure_kind in ('programme', 'major', 'minor', 'specialisation')
  ),
  constraint academic_structure_import_targets_code_check check (
    structure_code ~ '^[A-Z0-9][A-Z0-9-]{1,31}$'
  ),
  constraint academic_structure_import_targets_position_check check (
    position between 0 and 9
  ),
  constraint academic_structure_import_targets_processing_check check (
    processing_status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  constraint academic_structure_import_targets_review_check check (
    review_status in ('pending', 'needs_review', 'unchanged', 'accepted', 'rejected', 'not_required')
  ),
  constraint academic_structure_import_targets_attempt_check check (
    attempt_count between 0 and 5 and lock_version >= 0
  ),
  constraint academic_structure_import_targets_source_page_fkey
    foreign key (source_page_id, academic_year_id)
    references public.academic_structure_source_pages (id, academic_year_id),
  constraint academic_structure_import_targets_change_kind_check check (
    change_kind is null or change_kind in ('new', 'changed', 'unchanged')
  ),
  constraint academic_structure_import_targets_dispatch_error_check check (
    dispatch_error is null or btrim(dispatch_error) <> ''
  )
);

create table public.academic_structure_snapshots (
  id bigint generated always as identity primary key,
  structure_year_id bigint not null,
  academic_year_id bigint not null,
  source_page_id bigint,
  import_target_id uuid,
  parent_snapshot_id bigint references public.academic_structure_snapshots (id),
  origin text not null,
  schema_version text not null,
  semantic_hash text not null,
  name text not null,
  acronym text,
  short_name text,
  introduction text,
  description text,
  units numeric(7, 2),
  duration_years numeric(4, 1),
  academic_career text,
  college text,
  mode_of_delivery text,
  selection_rank numeric(5, 2),
  atar numeric(5, 2),
  can_combine boolean,
  can_combine_vertical boolean,
  study_as text,
  contact_text text,
  overall_confidence numeric(5, 4),
  critical_uncertainty boolean not null default false,
  confirmation_status text not null default 'not_required',
  confirmation_note text,
  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  sealed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint academic_structure_snapshots_structure_year_fkey
    foreign key (structure_year_id, academic_year_id)
    references public.academic_structure_years (id, academic_year_id) on delete cascade,
  constraint academic_structure_snapshots_source_page_fkey
    foreign key (source_page_id, academic_year_id)
    references public.academic_structure_source_pages (id, academic_year_id),
  constraint academic_structure_snapshots_import_target_fkey
    foreign key (import_target_id)
    references public.academic_structure_import_targets (id),
  constraint academic_structure_snapshots_year_hash_unique unique (
    structure_year_id,
    semantic_hash
  ),
  constraint academic_structure_snapshots_origin_check check (
    origin in ('imported', 'manual')
  ),
  constraint academic_structure_snapshots_hash_check check (
    semantic_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint academic_structure_snapshots_name_check check (btrim(name) <> ''),
  constraint academic_structure_snapshots_units_check check (
    units is null or units > 0
  ),
  constraint academic_structure_snapshots_duration_check check (
    duration_years is null or duration_years > 0
  ),
  constraint academic_structure_snapshots_confidence_check check (
    overall_confidence is null or overall_confidence between 0 and 1
  ),
  constraint academic_structure_snapshots_confirmation_check check (
    confirmation_status in ('not_required', 'required', 'confirmed')
  ),
  constraint academic_structure_snapshots_confirmation_fields_check check (
    (confirmation_status = 'confirmed' and confirmed_by is not null and confirmed_at is not null)
    or (confirmation_status <> 'confirmed' and confirmed_by is null and confirmed_at is null)
  )
);

create table private.academic_structure_snapshot_assemblies (
  snapshot_id bigint primary key
    references public.academic_structure_snapshots (id) on delete cascade,
  transaction_id xid8 not null
);

revoke all on table private.academic_structure_snapshot_assemblies
from public, anon, authenticated, service_role;

alter table public.academic_structure_years
  add constraint academic_structure_years_draft_snapshot_fkey
  foreign key (draft_snapshot_id) references public.academic_structure_snapshots (id);
alter table public.academic_structure_years
  add constraint academic_structure_years_published_snapshot_fkey
  foreign key (published_snapshot_id) references public.academic_structure_snapshots (id);
alter table public.academic_structure_import_targets
  add constraint academic_structure_import_targets_baseline_draft_fkey
  foreign key (baseline_draft_snapshot_id) references public.academic_structure_snapshots (id);
alter table public.academic_structure_import_targets
  add constraint academic_structure_import_targets_baseline_published_fkey
  foreign key (baseline_published_snapshot_id) references public.academic_structure_snapshots (id);
alter table public.academic_structure_import_targets
  add constraint academic_structure_import_targets_candidate_fkey
  foreign key (candidate_snapshot_id) references public.academic_structure_snapshots (id);

create table public.academic_structure_snapshot_sections (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  section_key text not null,
  heading text not null,
  markdown text not null,
  source_text text not null,
  source_locator text not null,
  position integer not null,
  constraint academic_structure_snapshot_sections_key_unique unique (snapshot_id, section_key),
  constraint academic_structure_snapshot_sections_position_unique unique (snapshot_id, position),
  constraint academic_structure_snapshot_sections_values_check check (
    btrim(section_key) <> ''
    and btrim(heading) <> ''
    and btrim(source_text) <> ''
    and btrim(source_locator) <> ''
    and position >= 0
  )
);

create table public.academic_structure_summary_fields (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  position integer not null,
  field_key text not null,
  label text not null,
  value_position integer not null,
  field_value text not null,
  source_text text not null,
  constraint academic_structure_summary_fields_position_unique unique (
    snapshot_id,
    position,
    value_position
  ),
  constraint academic_structure_summary_fields_values_check check (
    btrim(field_key) <> ''
    and btrim(label) <> ''
    and btrim(field_value) <> ''
    and btrim(source_text) <> ''
    and position > 0
    and value_position > 0
  )
);

create table public.academic_structure_learning_outcomes (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  position integer not null,
  outcome_text text not null,
  source_text text not null,
  source_locator text not null,
  constraint academic_structure_learning_outcomes_position_unique unique (snapshot_id, position),
  constraint academic_structure_learning_outcomes_values_check check (
    btrim(outcome_text) <> ''
    and btrim(source_text) <> ''
    and btrim(source_locator) <> ''
    and position >= 0
  )
);

create table public.academic_structure_fees (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  position integer not null,
  fee_year smallint,
  audience text not null,
  fee_type text not null,
  amount numeric(12, 2),
  currency char(3),
  basis text not null,
  source_label text,
  source_text text not null,
  source_locator text not null,
  constraint academic_structure_fees_position_unique unique (snapshot_id, position),
  constraint academic_structure_fees_year_check check (
    fee_year is null or fee_year between 2000 and 2200
  ),
  constraint academic_structure_fees_amount_check check (amount is null or amount >= 0),
  constraint academic_structure_fees_audience_check check (
    audience in ('domestic', 'international', 'commonwealth_supported', 'other')
  ),
  constraint academic_structure_fees_type_check check (
    fee_type in ('student_contribution', 'tuition', 'indicative', 'other')
  ),
  constraint academic_structure_fees_basis_check check (
    basis in ('programme', 'unit', 'eftsl', 'annual', 'unknown')
  ),
  constraint academic_structure_fees_source_check check (
    (source_label is null or btrim(source_label) <> '')
    and btrim(source_text) <> ''
    and btrim(source_locator) <> ''
  )
);

create table public.academic_structure_snapshot_relationships (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  position integer not null,
  relationship_kind text not null,
  target_kind text not null,
  target_code text not null,
  target_title text,
  source_text text not null,
  source_locator text not null,
  constraint academic_structure_snapshot_relationships_unique unique (
    snapshot_id,
    relationship_kind,
    target_kind,
    target_code
  ),
  constraint academic_structure_snapshot_relationships_position_unique unique (snapshot_id, position),
  constraint academic_structure_snapshot_relationships_kind_check check (
    relationship_kind in ('source_reference', 'relevant', 'option', 'required', 'incompatible', 'other')
  ),
  constraint academic_structure_snapshot_relationships_target_kind_check check (
    target_kind in ('programme', 'major', 'minor', 'specialisation', 'course')
  ),
  constraint academic_structure_snapshot_relationships_code_check check (
    target_code ~ '^[A-Z0-9][A-Z0-9-]{1,31}$'
  ),
  constraint academic_structure_snapshot_relationships_values_check check (
    btrim(source_text) <> '' and btrim(source_locator) <> '' and position >= 0
  )
);

create table public.academic_structure_requirement_groups (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  parent_group_id bigint,
  group_key text not null,
  title text,
  description text,
  operator text not null,
  minimum_count smallint,
  minimum_units numeric(7, 2),
  maximum_units numeric(7, 2),
  source_text text not null,
  source_locator text not null,
  position integer not null,
  constraint academic_structure_requirement_groups_id_snapshot_unique unique (id, snapshot_id),
  constraint academic_structure_requirement_groups_parent_fkey
    foreign key (parent_group_id, snapshot_id)
    references public.academic_structure_requirement_groups (id, snapshot_id) on delete cascade,
  constraint academic_structure_requirement_groups_key_unique unique (snapshot_id, group_key),
  constraint academic_structure_requirement_groups_operator_check check (
    operator in ('all_of', 'any_of', 'minimum_count')
  ),
  constraint academic_structure_requirement_groups_values_check check (
    btrim(group_key) <> ''
    and (title is null or btrim(title) <> '')
    and btrim(source_text) <> ''
    and btrim(source_locator) <> ''
    and position >= 0
    and (minimum_count is null or minimum_count > 0)
    and (minimum_units is null or minimum_units > 0)
    and (maximum_units is null or maximum_units > 0)
    and (minimum_units is null or maximum_units is null or minimum_units <= maximum_units)
  )
);

create unique index academic_structure_requirement_groups_one_root_idx
  on public.academic_structure_requirement_groups (snapshot_id)
  where parent_group_id is null;

create table public.academic_structure_requirement_conditions (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  requirement_group_id bigint not null,
  position integer not null,
  projection_key text not null,
  condition_kind text not null,
  structure_kind text,
  subject_code text,
  minimum_level smallint,
  maximum_level smallint,
  minimum_units numeric(7, 2),
  maximum_units numeric(7, 2),
  minimum_courses smallint,
  tag text,
  free_text text,
  source_text text not null,
  source_locator text not null,
  constraint academic_structure_requirement_conditions_group_fkey
    foreign key (requirement_group_id, snapshot_id)
    references public.academic_structure_requirement_groups (id, snapshot_id) on delete cascade,
  constraint academic_structure_requirement_conditions_id_snapshot_unique unique (
    id,
    snapshot_id
  ),
  constraint academic_structure_requirement_conditions_position_unique unique (
    requirement_group_id,
    position
  ),
  constraint academic_structure_requirement_conditions_key_unique unique (
    snapshot_id,
    projection_key
  ),
  constraint academic_structure_requirement_conditions_kind_check check (
    condition_kind in (
      'course_list',
      'structure_list',
      'unit_total',
      'level',
      'subject',
      'tag',
      'unrestricted',
      'free_text'
    )
  ),
  constraint academic_structure_requirement_conditions_structure_kind_check check (
    structure_kind is null
    or structure_kind in ('programme', 'major', 'minor', 'specialisation')
  ),
  constraint academic_structure_requirement_conditions_subject_check check (
    subject_code is null or subject_code ~ '^[A-Z]{4}$'
  ),
  constraint academic_structure_requirement_conditions_levels_check check (
    (minimum_level is null or minimum_level between 0 and 9999)
    and (maximum_level is null or maximum_level between 0 and 9999)
    and (minimum_level is null or maximum_level is null or minimum_level <= maximum_level)
  ),
  constraint academic_structure_requirement_conditions_units_check check (
    (minimum_units is null or minimum_units > 0)
    and (maximum_units is null or maximum_units > 0)
    and (minimum_units is null or maximum_units is null or minimum_units <= maximum_units)
  ),
  constraint academic_structure_requirement_conditions_values_check check (
    btrim(projection_key) <> ''
    and btrim(source_text) <> ''
    and btrim(source_locator) <> ''
    and position >= 0
    and (minimum_courses is null or minimum_courses > 0)
    and (tag is null or btrim(tag) <> '')
    and (free_text is null or btrim(free_text) <> '')
  )
);

create table public.academic_structure_requirement_options (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  requirement_condition_id bigint not null,
  position integer not null,
  option_kind text not null,
  option_code text not null,
  structure_kind text,
  constraint academic_structure_requirement_options_condition_fkey
    foreign key (requirement_condition_id, snapshot_id)
    references public.academic_structure_requirement_conditions (id, snapshot_id) on delete cascade,
  constraint academic_structure_requirement_options_position_unique unique (
    requirement_condition_id,
    position
  ),
  constraint academic_structure_requirement_options_code_unique unique (
    requirement_condition_id,
    option_code
  ),
  constraint academic_structure_requirement_options_kind_check check (
    option_kind in ('course', 'structure')
  ),
  constraint academic_structure_requirement_options_structure_kind_check check (
    (option_kind = 'course' and structure_kind is null and option_code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$')
    or (
      option_kind = 'structure'
      and structure_kind in ('programme', 'major', 'minor', 'specialisation')
      and option_code ~ '^[A-Z0-9][A-Z0-9-]{1,31}$'
    )
  ),
  constraint academic_structure_requirement_options_position_check check (position > 0)
);

create table public.academic_structure_unmodelled_requirements (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  position integer not null,
  source_text text not null,
  source_locator text,
  constraint academic_structure_unmodelled_requirements_position_unique unique (snapshot_id, position),
  constraint academic_structure_unmodelled_requirements_values_check check (
    btrim(source_text) <> ''
    and (source_locator is null or btrim(source_locator) <> '')
    and position > 0
  )
);

create table public.academic_structure_snapshot_evidence (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.academic_structure_snapshots (id) on delete cascade,
  position integer not null,
  field_key text not null,
  source_locator text not null,
  evidence_excerpt text not null,
  confidence numeric(5, 4) not null,
  method text not null,
  constraint academic_structure_snapshot_evidence_position_unique unique (snapshot_id, position),
  constraint academic_structure_snapshot_evidence_values_check check (
    btrim(field_key) <> ''
    and btrim(source_locator) <> ''
    and btrim(evidence_excerpt) <> ''
    and confidence between 0 and 1
    and method in ('deterministic', 'model')
    and position > 0
  )
);

create table public.academic_structure_import_stages (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.academic_structure_import_targets (id) on delete cascade,
  stage_name text not null,
  position smallint not null,
  status text not null default 'pending',
  attempt_count smallint not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_import_stages_target_name_unique unique (target_id, stage_name),
  constraint academic_structure_import_stages_target_position_unique unique (target_id, position),
  constraint academic_structure_import_stages_name_check check (
    stage_name in (
      'source_fetch',
      'html_capture',
      'markdown_normalise',
      'model_input_prepare',
      'deterministic_extract',
      'model_extract',
      'schema_validate',
      'domain_validate',
      'database_project',
      'snapshot_persist'
    )
  ),
  constraint academic_structure_import_stages_status_check check (
    status in ('pending', 'running', 'succeeded', 'failed', 'skipped')
  ),
  constraint academic_structure_import_stages_position_check check (position between 0 and 9),
  constraint academic_structure_import_stages_attempt_check check (attempt_count >= 0)
);

create table public.academic_structure_import_artifacts (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.academic_structure_import_targets (id) on delete cascade,
  stage_id uuid references public.academic_structure_import_stages (id) on delete set null,
  artifact_kind text not null,
  attempt_number smallint not null,
  media_type text not null,
  content_sha256 text not null,
  byte_size integer not null,
  storage_bucket text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint academic_structure_import_artifacts_target_kind_attempt_unique unique (
    target_id,
    artifact_kind,
    attempt_number
  ),
  constraint academic_structure_import_artifacts_kind_check check (
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
  constraint academic_structure_import_artifacts_attempt_check check (attempt_number > 0),
  constraint academic_structure_import_artifacts_media_check check (btrim(media_type) <> ''),
  constraint academic_structure_import_artifacts_hash_check check (
    content_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint academic_structure_import_artifacts_size_check check (byte_size >= 0),
  constraint academic_structure_import_artifacts_storage_check check (
    btrim(storage_bucket) <> '' and btrim(storage_path) <> ''
  )
);

create table public.academic_structure_extractions (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.academic_structure_import_targets (id) on delete cascade,
  extraction_number smallint not null,
  requested_model text not null,
  resolved_model text,
  generation_id text,
  prompt_version text not null,
  schema_version text not null,
  request_artifact_id uuid not null references public.academic_structure_import_artifacts (id),
  response_artifact_id uuid references public.academic_structure_import_artifacts (id),
  finish_reason text,
  input_tokens integer,
  output_tokens integer,
  cached_input_tokens integer,
  reasoning_tokens integer,
  cost_usd numeric(12, 6),
  latency_milliseconds integer,
  validation_status text not null default 'pending',
  validation_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint academic_structure_extractions_target_number_unique unique (target_id, extraction_number),
  constraint academic_structure_extractions_models_check check (
    btrim(requested_model) <> ''
    and (resolved_model is null or btrim(resolved_model) <> '')
    and btrim(prompt_version) <> ''
    and btrim(schema_version) <> ''
  ),
  constraint academic_structure_extractions_usage_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
    and (cached_input_tokens is null or cached_input_tokens >= 0)
    and (reasoning_tokens is null or reasoning_tokens >= 0)
    and (cost_usd is null or cost_usd >= 0)
    and (latency_milliseconds is null or latency_milliseconds >= 0)
  ),
  constraint academic_structure_extractions_validation_check check (
    validation_status in ('pending', 'valid', 'invalid')
  )
);

create table public.academic_structure_review_items (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.academic_structure_import_targets (id) on delete cascade,
  snapshot_id bigint references public.academic_structure_snapshots (id) on delete cascade,
  field_key text not null,
  item_kind text not null,
  severity text not null,
  message text not null,
  source_text text,
  status text not null default 'open',
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_review_items_values_check check (
    btrim(field_key) <> '' and btrim(message) <> ''
  ),
  constraint academic_structure_review_items_kind_check check (
    item_kind in ('missing', 'ambiguous', 'conflict', 'unsupported', 'invalid', 'evidence_missing', 'manual_review')
  ),
  constraint academic_structure_review_items_severity_check check (
    severity in ('info', 'warning', 'error')
  ),
  constraint academic_structure_review_items_status_check check (
    status in ('open', 'resolved', 'dismissed', 'abandoned')
  ),
  constraint academic_structure_review_items_resolution_check check (
    (status = 'open' and resolved_by is null and resolved_at is null)
    or (
      status in ('resolved', 'dismissed')
      and resolved_by is not null
      and resolved_at is not null
    )
    or (
      status = 'abandoned'
      and resolved_by is null
      and resolved_at is not null
    )
  )
);

create index academic_structure_directory_entries_search_idx
  on public.academic_structure_directory_entries (academic_year_id, structure_kind, is_available, title);
create index academic_structure_source_pages_year_kind_idx
  on public.academic_structure_source_pages (academic_year_id, structure_kind, fetched_at desc);
create index academic_structure_years_year_idx
  on public.academic_structure_years (academic_year_id);
create index academic_structure_snapshots_year_idx
  on public.academic_structure_snapshots (academic_year_id, structure_year_id, created_at desc);
create index academic_structure_import_runs_recent_idx
  on public.academic_structure_import_runs (created_at desc);
create index academic_structure_import_targets_run_idx
  on public.academic_structure_import_targets (run_id, position);
create index academic_structure_import_stages_target_idx
  on public.academic_structure_import_stages (target_id, position);
create index academic_structure_import_artifacts_target_idx
  on public.academic_structure_import_artifacts (target_id, created_at);
create index academic_structure_review_items_target_idx
  on public.academic_structure_review_items (target_id, status, severity);

create or replace function private.reject_academic_structure_snapshot_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'Academic structure snapshots and their projected rows are immutable.';
end;
$$;

create trigger academic_structure_snapshots_reject_update_delete
before update or delete on public.academic_structure_snapshots
for each row execute function private.reject_academic_structure_snapshot_mutation();

create trigger academic_structure_source_pages_reject_update_delete
before update or delete on public.academic_structure_source_pages
for each row execute function private.reject_academic_structure_snapshot_mutation();

create or replace function private.validate_academic_structure_year_snapshot_pointers()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.draft_snapshot_id is not null and not exists (
    select 1
    from public.academic_structure_snapshots as snapshots
    where snapshots.id = new.draft_snapshot_id
      and snapshots.structure_year_id = new.id
      and snapshots.academic_year_id = new.academic_year_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'The draft snapshot must belong to this academic structure year.';
  end if;

  if new.published_snapshot_id is not null and not exists (
    select 1
    from public.academic_structure_snapshots as snapshots
    where snapshots.id = new.published_snapshot_id
      and snapshots.structure_year_id = new.id
      and snapshots.academic_year_id = new.academic_year_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'The published snapshot must belong to this academic structure year.';
  end if;

  return new;
end;
$$;

create trigger academic_structure_years_validate_snapshot_pointers
before insert or update of draft_snapshot_id, published_snapshot_id, academic_year_id
on public.academic_structure_years
for each row execute function private.validate_academic_structure_year_snapshot_pointers();

create or replace function private.register_academic_structure_snapshot_assembly()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.academic_structure_snapshot_assemblies (
    snapshot_id,
    transaction_id
  ) values (
    new.id,
    pg_current_xact_id()
  );

  return new;
end;
$$;

create trigger academic_structure_snapshots_register_assembly
after insert on public.academic_structure_snapshots
for each row execute function private.register_academic_structure_snapshot_assembly();

create or replace function private.guard_academic_structure_snapshot_child_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assembly_transaction_id xid8;
  draft_snapshot_id bigint;
  published_snapshot_id bigint;
  current_transaction_id xid8 := pg_current_xact_id();
begin
  -- A snapshot and all of its projected rows are assembled atomically. The
  -- private registration records the top-level transaction ID at parent
  -- creation, so the capability remains valid inside nested savepoints but
  -- cannot be resumed by a later transaction.
  select
    assemblies.transaction_id,
    structure_years.draft_snapshot_id,
    structure_years.published_snapshot_id
  into assembly_transaction_id, draft_snapshot_id, published_snapshot_id
  from public.academic_structure_snapshots as snapshots
  join public.academic_structure_years as structure_years
    on structure_years.id = snapshots.structure_year_id
  left join private.academic_structure_snapshot_assemblies as assemblies
    on assemblies.snapshot_id = snapshots.id
  where snapshots.id = new.snapshot_id
  for share of snapshots, structure_years;

  if not found then
    -- Preserve the child table's normal foreign-key error for a missing
    -- snapshot instead of replacing it with an immutability error.
    return new;
  end if;

  if assembly_transaction_id is null
     or assembly_transaction_id <> current_transaction_id
     or draft_snapshot_id is not distinct from new.snapshot_id
     or published_snapshot_id is not distinct from new.snapshot_id then
    raise exception using
      errcode = '55000',
      message = 'Academic structure projected rows may only be inserted while their snapshot is being assembled.';
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'academic_structure_summary_fields',
    'academic_structure_snapshot_sections',
    'academic_structure_learning_outcomes',
    'academic_structure_fees',
    'academic_structure_snapshot_relationships',
    'academic_structure_requirement_groups',
    'academic_structure_requirement_conditions',
    'academic_structure_requirement_options',
    'academic_structure_unmodelled_requirements',
    'academic_structure_snapshot_evidence'
  ]
  loop
    execute format(
      'create trigger %I_guard_insert before insert on public.%I for each row execute function private.guard_academic_structure_snapshot_child_insert()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'academic_structure_summary_fields',
    'academic_structure_snapshot_sections',
    'academic_structure_learning_outcomes',
    'academic_structure_fees',
    'academic_structure_snapshot_relationships',
    'academic_structure_requirement_groups',
    'academic_structure_requirement_conditions',
    'academic_structure_requirement_options',
    'academic_structure_unmodelled_requirements',
    'academic_structure_snapshot_evidence',
    'academic_structure_import_artifacts',
    'academic_structure_extractions'
  ]
  loop
    execute format(
      'create trigger %I_reject_update_delete before update or delete on public.%I for each row execute function private.reject_academic_structure_snapshot_mutation()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create or replace function private.refresh_academic_structure_import_run(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  counts record;
begin
  -- Serialise aggregate refreshes for a run. Review decisions can arrive in
  -- parallel after processing has finished, so counting before taking this
  -- lock can otherwise let the last committer overwrite a newer count.
  perform 1
  from public.academic_structure_import_runs
  where id = p_run_id
  for update;
  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The academic structure import run was not found.';
  end if;

  select
    count(*) filter (where processing_status = 'queued')::smallint as queued_count,
    count(*) filter (where processing_status = 'running')::smallint as running_count,
    count(*) filter (where processing_status = 'succeeded')::smallint as succeeded_count,
    count(*) filter (where processing_status = 'failed')::smallint as failed_count,
    count(*) filter (where processing_status = 'cancelled')::smallint as cancelled_count,
    count(*) filter (where review_status = 'accepted')::smallint as accepted_count,
    count(*) filter (where review_status = 'rejected')::smallint as rejected_count
  into counts
  from public.academic_structure_import_targets
  where run_id = p_run_id;

  update public.academic_structure_import_runs
  set
    queued_count = counts.queued_count,
    running_count = counts.running_count,
    succeeded_count = counts.succeeded_count,
    failed_count = counts.failed_count,
    cancelled_count = counts.cancelled_count,
    accepted_count = counts.accepted_count,
    rejected_count = counts.rejected_count,
    status = case
      when counts.running_count > 0 then 'running'
      when counts.queued_count > 0 then 'queued'
      when counts.succeeded_count > 0
        and counts.failed_count + counts.cancelled_count > 0
        then 'partially_succeeded'
      when counts.succeeded_count > 0 then 'succeeded'
      when counts.failed_count > 0 then 'failed'
      else 'cancelled'
    end,
    started_at = case
      when counts.running_count > 0
        or counts.succeeded_count > 0
        or counts.failed_count > 0
        or counts.cancelled_count > 0
        then coalesce(started_at, now())
      else started_at
    end,
    completed_at = case
      when counts.queued_count = 0 and counts.running_count = 0 then coalesce(completed_at, now())
      else null
    end,
    updated_at = now()
  where id = p_run_id;
end;
$$;

create or replace function private.abandon_academic_structure_import_review_items(
  p_target_id uuid,
  p_resolution_note text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.academic_structure_review_items
  set
    status = 'abandoned',
    resolved_by = null,
    resolved_at = statement_timestamp(),
    resolution_note = coalesce(
      nullif(btrim(p_resolution_note), ''),
      'The import target failed after creating this review item.'
    ),
    updated_at = now()
  where target_id = p_target_id
    and status = 'open';
$$;

create or replace function private.claim_academic_structure_import_target(
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
  structure_kind text,
  structure_code text,
  requested_model text,
  initiated_by uuid,
  parser_version text,
  prompt_version text,
  schema_version text,
  source_id bigint,
  source_base_url text,
  directory_entry_id bigint,
  structure_id bigint,
  structure_year_id bigint,
  baseline_draft_snapshot_id bigint,
  baseline_published_snapshot_id bigint,
  attempt_count smallint,
  lock_version integer,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_run public.academic_structure_import_runs%rowtype;
  selected_target public.academic_structure_import_targets%rowtype;
begin
  if p_worker_id is null or nullif(btrim(p_message_id), '') is null then
    raise exception using errcode = '22023', message = 'Worker and queue message identifiers are required.';
  end if;
  if p_lease_seconds not between 30 and 3600 then
    raise exception using errcode = '22023', message = 'Lease duration must be between 30 and 3600 seconds.';
  end if;

  select * into selected_run
  from public.academic_structure_import_runs
  where id = p_run_id
  for update;
  if selected_run.id is null or selected_run.status not in ('queued', 'running') then
    raise exception using errcode = '55000', message = 'The academic structure import run is not active.';
  end if;

  select targets.* into selected_target
  from public.academic_structure_import_targets as targets
  where targets.id = p_target_id and targets.run_id = p_run_id
  for update;
  if selected_target.id is null then
    raise exception using errcode = 'P0002', message = 'The academic structure import target was not found.';
  end if;

  if selected_target.processing_status = 'running'
     and selected_target.worker_id = p_worker_id
     and selected_target.queue_message_id = btrim(p_message_id) then
    update public.academic_structure_import_targets as targets
    set
      heartbeat_at = statement_timestamp(),
      lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
      lock_version = targets.lock_version + 1,
      updated_at = now()
    where targets.id = p_target_id
    returning targets.* into selected_target;
  elsif selected_target.processing_status = 'queued'
     or (
       selected_target.processing_status = 'running'
       and selected_target.lease_expires_at <= statement_timestamp()
     ) then
    update public.academic_structure_import_targets as targets
    set
      processing_status = 'running',
      worker_id = p_worker_id,
      queue_message_id = btrim(p_message_id),
      dispatched_at = coalesce(dispatched_at, statement_timestamp()),
      dispatch_error = null,
      claimed_at = statement_timestamp(),
      heartbeat_at = statement_timestamp(),
      lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
      attempt_count = targets.attempt_count + 1,
      lock_version = targets.lock_version + 1,
      error_code = null,
      error_summary = null,
      updated_at = now()
    where targets.id = p_target_id
    returning targets.* into selected_target;
  else
    raise exception using errcode = '55000', message = 'The academic structure import target is not claimable.';
  end if;

  update public.academic_structure_import_runs
  set
    status = 'running',
    started_at = coalesce(started_at, statement_timestamp()),
    heartbeat_at = statement_timestamp(),
    updated_at = now()
  where id = p_run_id;
  perform private.refresh_academic_structure_import_run(p_run_id);

  return query
  select
    runs.id,
    targets.id,
    years.year,
    targets.academic_year_id,
    targets.structure_kind,
    targets.structure_code,
    runs.requested_model,
    runs.initiated_by,
    runs.parser_version,
    runs.prompt_version,
    runs.schema_version,
    runs.source_id,
    sources.base_url,
    targets.directory_entry_id,
    targets.structure_id,
    targets.structure_year_id,
    targets.baseline_draft_snapshot_id,
    targets.baseline_published_snapshot_id,
    targets.attempt_count,
    targets.lock_version,
    targets.lease_expires_at
  from public.academic_structure_import_targets as targets
  join public.academic_structure_import_runs as runs on runs.id = targets.run_id
  join public.academic_years as years on years.id = targets.academic_year_id
  join public.academic_structure_sources as sources on sources.id = runs.source_id
  where targets.id = p_target_id;
end;
$$;

create or replace function private.recover_stale_academic_structure_import_target(
  p_run_id uuid,
  p_target_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_target public.academic_structure_import_targets%rowtype;
  failed_stage public.academic_structure_import_stages%rowtype;
begin
  perform 1
  from public.academic_structure_import_runs
  where id = p_run_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'The academic structure import run was not found.';
  end if;

  select * into selected_target
  from public.academic_structure_import_targets
  where id = p_target_id and run_id = p_run_id
  for update;
  if selected_target.id is null then
    raise exception using errcode = 'P0002', message = 'The academic structure import target was not found.';
  end if;
  if selected_target.processing_status in ('succeeded', 'failed', 'cancelled') then
    return true;
  end if;

  if selected_target.processing_status = 'running' then
    select * into failed_stage
    from public.academic_structure_import_stages
    where target_id = p_target_id and status = 'failed'
    order by completed_at desc nulls last, position desc
    limit 1;
    if failed_stage.id is not null then
      update public.academic_structure_import_targets
      set
        processing_status = 'failed',
        review_status = 'not_required',
        candidate_snapshot_id = null,
        change_kind = null,
        lease_expires_at = null,
        lock_version = lock_version + 1,
        error_code = coalesce(nullif(btrim(failed_stage.error_code), ''), 'IMPORT_STAGE_FAILED'),
        error_summary = coalesce(nullif(btrim(failed_stage.error_summary), ''), 'An import stage failed.'),
        finished_at = statement_timestamp(),
        updated_at = now()
      where id = p_target_id;
      perform private.abandon_academic_structure_import_review_items(
        p_target_id,
        coalesce(
          nullif(btrim(failed_stage.error_summary), ''),
          'The import stage failed.'
        )
      );
      perform private.refresh_academic_structure_import_run(p_run_id);
      return true;
    end if;
  end if;

  if not (
    (selected_target.processing_status = 'running'
      and selected_target.lease_expires_at <= statement_timestamp()
      and (
        selected_target.error_code is null
        or selected_target.heartbeat_at <= statement_timestamp() - interval '30 minutes'
      ))
    or (selected_target.processing_status = 'queued'
      and selected_target.created_at <= statement_timestamp() - interval '30 minutes')
  ) then
    return false;
  end if;

  update public.academic_structure_import_targets
  set
    processing_status = 'failed',
    review_status = 'not_required',
    candidate_snapshot_id = null,
    change_kind = null,
    lease_expires_at = null,
    lock_version = lock_version + 1,
    error_code = case
      when selected_target.processing_status = 'running' then coalesce(selected_target.error_code, 'WORKER_LEASE_EXPIRED')
      when selected_target.queue_message_id is null then 'QUEUE_DISPATCH_STALE'
      else 'QUEUE_DELIVERY_STALE'
    end,
    error_summary = coalesce(
      selected_target.error_summary,
      'The background import did not complete within its recovery window.'
    ),
    finished_at = statement_timestamp(),
    updated_at = now()
  where id = p_target_id;
  perform private.abandon_academic_structure_import_review_items(
    p_target_id,
    coalesce(
      selected_target.error_summary,
      'The background import did not complete within its recovery window.'
    )
  );
  perform private.refresh_academic_structure_import_run(p_run_id);
  return true;
end;
$$;

create or replace function private.finish_academic_structure_import_target(
  p_run_id uuid,
  p_target_id uuid,
  p_message_id text,
  p_worker_id uuid,
  p_expected_lock_version integer,
  p_processing_status text,
  p_change_kind text,
  p_structure_id bigint,
  p_structure_year_id bigint,
  p_source_page_id bigint,
  p_candidate_snapshot_id bigint,
  p_error_code text default null,
  p_error_summary text default null
)
returns public.academic_structure_import_targets
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_target public.academic_structure_import_targets%rowtype;
begin
  if p_processing_status not in ('succeeded', 'failed', 'cancelled') then
    raise exception using errcode = '22023', message = 'Choose a terminal academic structure import status.';
  end if;
  perform 1
  from public.academic_structure_import_runs
  where id = p_run_id and status = 'running'
  for update;
  if not found then
    raise exception using errcode = '55000', message = 'The academic structure import run is not running.';
  end if;

  select * into selected_target
  from public.academic_structure_import_targets
  where id = p_target_id and run_id = p_run_id
  for update;
  if selected_target.id is null
     or selected_target.processing_status <> 'running'
     or selected_target.worker_id is distinct from p_worker_id
     or selected_target.queue_message_id is distinct from btrim(p_message_id)
     or selected_target.lock_version <> p_expected_lock_version
     or selected_target.lease_expires_at is null
     or selected_target.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '55000', message = 'The import target lease or lock version no longer matches.';
  end if;

  if p_processing_status = 'succeeded' then
    if p_change_kind not in ('new', 'changed', 'unchanged')
       or p_structure_id is null
       or p_structure_year_id is null
       or p_source_page_id is null
       or (p_change_kind in ('new', 'changed') and p_candidate_snapshot_id is null)
       or (p_change_kind = 'unchanged' and p_candidate_snapshot_id is not null) then
      raise exception using errcode = '22023', message = 'Successful imports require complete candidate provenance.';
    end if;
    if exists (
      select 1 from public.academic_structure_import_stages
      where target_id = p_target_id and status not in ('succeeded', 'skipped')
    ) then
      raise exception using errcode = '55000', message = 'Every import stage must finish before successful completion.';
    end if;
    if p_candidate_snapshot_id is not null and not exists (
      select 1 from public.academic_structure_review_items
      where target_id = p_target_id
        and snapshot_id = p_candidate_snapshot_id
        and item_kind = 'manual_review'
        and status = 'open'
    ) then
      raise exception using errcode = '55000', message = 'Every changed candidate requires manual review.';
    end if;
  elsif p_change_kind is not null or p_candidate_snapshot_id is not null
     or nullif(btrim(p_error_summary), '') is null then
    raise exception using errcode = '22023', message = 'Failed imports require an error and cannot carry a candidate.';
  end if;

  update public.academic_structure_import_targets
  set
    structure_id = coalesce(p_structure_id, structure_id),
    structure_year_id = coalesce(p_structure_year_id, structure_year_id),
    source_page_id = coalesce(p_source_page_id, source_page_id),
    candidate_snapshot_id = p_candidate_snapshot_id,
    processing_status = p_processing_status,
    review_status = case
      when p_processing_status = 'succeeded' and p_change_kind in ('new', 'changed') then 'needs_review'
      when p_processing_status = 'succeeded' then 'unchanged'
      else 'not_required'
    end,
    change_kind = p_change_kind,
    lease_expires_at = null,
    lock_version = lock_version + 1,
    error_code = nullif(btrim(p_error_code), ''),
    error_summary = nullif(btrim(p_error_summary), ''),
    finished_at = statement_timestamp(),
    updated_at = now()
  where id = p_target_id and lock_version = p_expected_lock_version
  returning * into selected_target;
  if selected_target.id is null then
    raise exception using errcode = '55000', message = 'The import target lock changed during completion.';
  end if;
  if p_processing_status <> 'succeeded' then
    perform private.abandon_academic_structure_import_review_items(
      p_target_id,
      p_error_summary
    );
  end if;
  perform private.refresh_academic_structure_import_run(p_run_id);
  return selected_target;
end;
$$;

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

create or replace function public.reconcile_academic_structure_import_dispatch(
  p_run_id uuid
)
returns table (
  reconciled_target_count integer,
  run_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  selected_run public.academic_structure_import_runs%rowtype;
  reconciled_count integer := 0;
  refreshed_status text;
begin
  if actor is null or not private.has_permission('imports.manage') then
    raise exception using errcode = '42501', message = 'Import permission is required.';
  end if;

  select * into selected_run
  from public.academic_structure_import_runs
  where id = p_run_id
  for update;
  if selected_run.id is null then
    raise exception using errcode = 'P0002', message = 'Import run not found.';
  end if;

  if selected_run.status in (
    'succeeded',
    'partially_succeeded',
    'failed',
    'cancelled'
  ) then
    return query select 0, selected_run.status;
    return;
  end if;

  -- A queue delivery can race the producer's dispatch metadata update. Wait a
  -- bounded period, then fail only targets that remain both undispatched and
  -- unclaimed. A late queue callback sees the terminal target and becomes a
  -- no-op, so reconciliation cannot start a second paid extraction.
  update public.academic_structure_import_targets
  set
    processing_status = 'failed',
    review_status = 'not_required',
    dispatch_error = 'The queue dispatch was not durably recorded.',
    error_code = 'QUEUE_DISPATCH_STALE',
    error_summary = 'The queue dispatch was not durably recorded within five minutes.',
    finished_at = statement_timestamp(),
    lock_version = lock_version + 1,
    updated_at = now()
  where run_id = p_run_id
    and processing_status = 'queued'
    and dispatched_at is null
    and queue_message_id is null
    and created_at <= statement_timestamp() - interval '5 minutes';
  get diagnostics reconciled_count = row_count;

  perform private.refresh_academic_structure_import_run(p_run_id);
  select status into refreshed_status
  from public.academic_structure_import_runs
  where id = p_run_id;

  return query select reconciled_count, refreshed_status;
end;
$$;

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

  -- Match the worker lock order so an administrator review cannot deadlock a
  -- stale-delivery recovery that locks the run before its target.
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
      or item_kind = 'manual_review'
    );

  perform private.refresh_academic_structure_import_run(target_row.run_id);
end;
$$;

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
  if selected_year.id is null or selected_year.draft_snapshot_id <> p_snapshot_id then
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
       where snapshot_id = p_snapshot_id and status = 'open' and severity = 'error'
     ) then
    raise exception using errcode = '55000', message = 'Resolve blocking review items before publication.';
  end if;
  update public.academic_structure_years
  set published_snapshot_id = p_snapshot_id, updated_at = now()
  where id = p_structure_year_id;
end;
$$;

drop function public.save_current_user_primary_plan(
  text,
  text,
  smallint,
  smallint,
  text,
  text,
  text
);

create function public.save_current_user_primary_plan(
  p_display_name text,
  p_student_number text,
  p_academic_year smallint,
  p_commencement_year smallint,
  p_study_load text,
  p_programme_code text,
  p_major_code text default null
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
  selected_major_year_id bigint;
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;
  if nullif(btrim(p_display_name), '') is null then
    raise exception using errcode = '22023', message = 'Display name is required.';
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

  if nullif(btrim(p_major_code), '') is not null then
    select structure_years.id
    into selected_major_year_id
    from public.academic_structure_years as structure_years
    join public.academic_structures as structures
      on structures.id = structure_years.structure_id
    where structures.code = upper(btrim(p_major_code))
      and structures.kind = 'major'
      and structure_years.academic_year_id = selected_academic_year_id
      and structure_years.published_snapshot_id is not null
    limit 1;
    if selected_major_year_id is null then
      raise exception using
        errcode = 'P0002',
        message = 'The selected major is not published for that academic year.';
    end if;

    if not exists (
      select 1
      from public.academic_structure_snapshot_relationships as relationships
      where relationships.snapshot_id = selected_programme_snapshot_id
        and relationships.relationship_kind in ('required', 'option')
        and relationships.target_kind = 'major'
        and relationships.target_code = upper(btrim(p_major_code))
    ) and not exists (
      select 1
      from public.academic_structure_requirement_options as options
      join public.academic_structure_requirement_conditions as conditions
        on conditions.id = options.requirement_condition_id
       and conditions.snapshot_id = options.snapshot_id
      where options.snapshot_id = selected_programme_snapshot_id
        and conditions.condition_kind = 'structure_list'
        and conditions.structure_kind = 'major'
        and options.option_kind = 'structure'
        and options.structure_kind = 'major'
        and options.option_code = upper(btrim(p_major_code))
    ) then
      raise exception using
        errcode = '22023',
        message = 'The selected major is not an explicit option for that programme.';
    end if;
  end if;

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

  if selected_major_year_id is not null then
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
      selected_major_year_id,
      'major',
      1
    );
  end if;

  return selected_plan_id;
end;
$$;

create or replace function private.is_published_academic_structure_snapshot(
  p_snapshot_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.academic_structure_years
    where published_snapshot_id = p_snapshot_id
  );
$$;

create or replace function private.can_read_academic_structure_snapshot(
  p_snapshot_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_permission('catalogue.read')
    or private.has_permission('catalogue.write')
    or private.has_permission('imports.manage')
    or private.is_published_academic_structure_snapshot(p_snapshot_id);
$$;

alter table public.academic_structure_sources enable row level security;
alter table public.academic_structure_source_pages enable row level security;
alter table public.academic_structure_directory_entries enable row level security;
alter table public.academic_structure_directory_statuses enable row level security;
alter table public.academic_structures enable row level security;
alter table public.academic_structure_years enable row level security;
alter table public.academic_structure_snapshots enable row level security;
alter table public.academic_structure_summary_fields enable row level security;
alter table public.academic_structure_snapshot_sections enable row level security;
alter table public.academic_structure_learning_outcomes enable row level security;
alter table public.academic_structure_fees enable row level security;
alter table public.academic_structure_snapshot_relationships enable row level security;
alter table public.academic_structure_requirement_groups enable row level security;
alter table public.academic_structure_requirement_conditions enable row level security;
alter table public.academic_structure_requirement_options enable row level security;
alter table public.academic_structure_unmodelled_requirements enable row level security;
alter table public.academic_structure_snapshot_evidence enable row level security;
alter table public.academic_structure_import_runs enable row level security;
alter table public.academic_structure_import_targets enable row level security;
alter table public.academic_structure_import_stages enable row level security;
alter table public.academic_structure_import_artifacts enable row level security;
alter table public.academic_structure_extractions enable row level security;
alter table public.academic_structure_review_items enable row level security;
alter table public.plan_structures enable row level security;

create policy academic_structure_sources_admin_read
on public.academic_structure_sources for select to authenticated
using (private.has_permission('imports.manage') or private.has_permission('catalogue.read'));
create policy academic_structure_source_pages_admin_read
on public.academic_structure_source_pages for select to authenticated
using (private.has_permission('imports.manage') or private.has_permission('catalogue.read'));
create policy academic_structure_directory_entries_admin_read
on public.academic_structure_directory_entries for select to authenticated
using (private.has_permission('imports.manage') or private.has_permission('catalogue.read'));
create policy academic_structure_directory_statuses_admin_read
on public.academic_structure_directory_statuses for select to authenticated
using (private.has_permission('imports.manage') or private.has_permission('catalogue.read'));

drop policy academic_structures_read_published on public.academic_structures;
drop policy if exists academic_structures_read_drafts on public.academic_structures;
drop policy if exists academic_structures_admin_all on public.academic_structures;
revoke insert, update, delete on table public.academic_structures from authenticated;

create policy academic_structures_public_read
on public.academic_structures for select to anon
using (
  exists (
    select 1 from public.academic_structure_years
    where structure_id = academic_structures.id and published_snapshot_id is not null
  )
);

create policy academic_structures_authenticated_read
on public.academic_structures for select to authenticated
using (
  (select private.has_permission('catalogue.read'))
  or (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
  or exists (
    select 1 from public.academic_structure_years
    where structure_id = academic_structures.id and published_snapshot_id is not null
  )
);

-- Every application path below now uses structure years and immutable
-- snapshots. Remove the empty development-only version family instead of
-- preserving duplicate relational projections.
drop function public.publish_catalogue_structure_version(text, smallint);
drop table public.requirement_conditions;
drop table public.requirement_groups;
drop table public.academic_structure_relationships;
drop table public.academic_structure_versions;
drop table public.catalogue_directory_programmes;
drop function private.validate_requirement_tree();
drop function private.require_imported_programme_course_reference();

update public.academic_structures
set kind = 'programme', updated_at = now()
where kind = 'degree';

alter table public.academic_structures
  drop constraint academic_structures_kind_check;
alter table public.academic_structures
  add constraint academic_structures_kind_check check (
    kind in ('programme', 'major', 'minor', 'specialisation')
  );

create policy academic_structure_years_public_read
on public.academic_structure_years for select to anon
using (published_snapshot_id is not null);
create policy academic_structure_years_authenticated_read
on public.academic_structure_years for select to authenticated
using (
  published_snapshot_id is not null
  or (select private.has_permission('catalogue.read'))
  or (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);
create policy academic_structure_snapshots_public_read
on public.academic_structure_snapshots for select to anon
using (private.is_published_academic_structure_snapshot(id));
create policy academic_structure_snapshots_authenticated_read
on public.academic_structure_snapshots for select to authenticated
using (private.can_read_academic_structure_snapshot(id));

create policy academic_structure_summary_fields_public_read
on public.academic_structure_summary_fields for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_summary_fields_authenticated_read
on public.academic_structure_summary_fields for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_snapshot_sections_public_read
on public.academic_structure_snapshot_sections for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_snapshot_sections_authenticated_read
on public.academic_structure_snapshot_sections for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_learning_outcomes_public_read
on public.academic_structure_learning_outcomes for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_learning_outcomes_authenticated_read
on public.academic_structure_learning_outcomes for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_fees_public_read
on public.academic_structure_fees for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_fees_authenticated_read
on public.academic_structure_fees for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_snapshot_relationships_public_read
on public.academic_structure_snapshot_relationships for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_snapshot_relationships_authenticated_read
on public.academic_structure_snapshot_relationships for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_requirement_groups_public_read
on public.academic_structure_requirement_groups for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_requirement_groups_authenticated_read
on public.academic_structure_requirement_groups for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_requirement_conditions_public_read
on public.academic_structure_requirement_conditions for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_requirement_conditions_authenticated_read
on public.academic_structure_requirement_conditions for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_requirement_options_public_read
on public.academic_structure_requirement_options for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_requirement_options_authenticated_read
on public.academic_structure_requirement_options for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_unmodelled_requirements_public_read
on public.academic_structure_unmodelled_requirements for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_unmodelled_requirements_authenticated_read
on public.academic_structure_unmodelled_requirements for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));
create policy academic_structure_snapshot_evidence_public_read
on public.academic_structure_snapshot_evidence for select to anon
using (private.is_published_academic_structure_snapshot(snapshot_id));
create policy academic_structure_snapshot_evidence_authenticated_read
on public.academic_structure_snapshot_evidence for select to authenticated
using (private.can_read_academic_structure_snapshot(snapshot_id));

create policy academic_structure_import_runs_admin_read
on public.academic_structure_import_runs for select to authenticated
using (private.has_permission('imports.manage'));
create policy academic_structure_import_targets_admin_read
on public.academic_structure_import_targets for select to authenticated
using (private.has_permission('imports.manage'));
create policy academic_structure_import_stages_admin_read
on public.academic_structure_import_stages for select to authenticated
using (private.has_permission('imports.manage'));
create policy academic_structure_import_artifacts_admin_read
on public.academic_structure_import_artifacts for select to authenticated
using (private.has_permission('imports.manage'));
create policy academic_structure_extractions_admin_read
on public.academic_structure_extractions for select to authenticated
using (private.has_permission('imports.manage'));
create policy academic_structure_review_items_admin_read
on public.academic_structure_review_items for select to authenticated
using (private.has_permission('imports.manage'));

revoke all on function private.reject_academic_structure_snapshot_mutation()
from public, anon, authenticated, service_role;
revoke all on function private.register_academic_structure_snapshot_assembly()
from public, anon, authenticated, service_role;
revoke all on function private.guard_academic_structure_snapshot_child_insert()
from public, anon, authenticated, service_role;
revoke all on function private.validate_academic_structure_year_snapshot_pointers()
from public, anon, authenticated, service_role;
revoke all on function private.refresh_academic_structure_import_run(uuid)
from public, anon, authenticated, service_role;
revoke all on function private.abandon_academic_structure_import_review_items(uuid, text)
from public, anon, authenticated, service_role;
revoke all on function private.claim_academic_structure_import_target(uuid, uuid, text, uuid, integer)
from public, anon, authenticated, service_role;
revoke all on function private.recover_stale_academic_structure_import_target(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function private.finish_academic_structure_import_target(uuid, uuid, text, uuid, integer, text, text, bigint, bigint, bigint, bigint, text, text)
from public, anon, authenticated, service_role;
revoke all on function private.is_published_academic_structure_snapshot(bigint)
from public, anon, authenticated, service_role;
revoke all on function private.can_read_academic_structure_snapshot(bigint)
from public, anon, authenticated, service_role;
revoke all on function public.start_academic_structure_import(smallint, text, text[], text, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.reconcile_academic_structure_import_dispatch(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.review_academic_structure_import_target(uuid, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.publish_academic_structure_snapshot(bigint, bigint)
from public, anon, authenticated, service_role;
revoke all on function public.save_current_user_primary_plan(text, text, smallint, smallint, text, text, text)
from public, anon, authenticated, service_role;

grant execute on function public.start_academic_structure_import(smallint, text, text[], text, text, text, text) to authenticated;
grant execute on function public.reconcile_academic_structure_import_dispatch(uuid) to authenticated;
grant execute on function public.review_academic_structure_import_target(uuid, text, text) to authenticated;
grant execute on function public.publish_academic_structure_snapshot(bigint, bigint) to authenticated;
grant execute on function public.save_current_user_primary_plan(text, text, smallint, smallint, text, text, text) to authenticated;
grant execute on function private.refresh_academic_structure_import_run(uuid) to service_role;
grant execute on function private.claim_academic_structure_import_target(uuid, uuid, text, uuid, integer) to service_role;
grant execute on function private.recover_stale_academic_structure_import_target(uuid, uuid) to service_role;
grant execute on function private.finish_academic_structure_import_target(uuid, uuid, text, uuid, integer, text, text, bigint, bigint, bigint, bigint, text, text) to service_role;
grant execute on function private.is_published_academic_structure_snapshot(bigint) to anon, authenticated;
grant execute on function private.can_read_academic_structure_snapshot(bigint) to authenticated;

grant select on table
  public.academic_structures,
  public.academic_structure_years,
  public.academic_structure_snapshots,
  public.academic_structure_summary_fields,
  public.academic_structure_snapshot_sections,
  public.academic_structure_learning_outcomes,
  public.academic_structure_fees,
  public.academic_structure_snapshot_relationships,
  public.academic_structure_requirement_groups,
  public.academic_structure_requirement_conditions,
  public.academic_structure_requirement_options,
  public.academic_structure_unmodelled_requirements,
  public.academic_structure_snapshot_evidence
to anon;

grant select on table
  public.academic_structure_sources,
  public.academic_structure_source_pages,
  public.academic_structure_directory_entries,
  public.academic_structure_directory_statuses,
  public.academic_structures,
  public.academic_structure_years,
  public.academic_structure_snapshots,
  public.academic_structure_summary_fields,
  public.academic_structure_snapshot_sections,
  public.academic_structure_learning_outcomes,
  public.academic_structure_fees,
  public.academic_structure_snapshot_relationships,
  public.academic_structure_requirement_groups,
  public.academic_structure_requirement_conditions,
  public.academic_structure_requirement_options,
  public.academic_structure_unmodelled_requirements,
  public.academic_structure_snapshot_evidence,
  public.academic_structure_import_runs,
  public.academic_structure_import_targets,
  public.academic_structure_import_stages,
  public.academic_structure_import_artifacts,
  public.academic_structure_extractions,
  public.academic_structure_review_items,
  public.plan_structures
to authenticated;

grant insert, update, delete on table public.plan_structures to authenticated;

grant all on table
  public.academic_structure_sources,
  public.academic_structure_source_pages,
  public.academic_structure_directory_entries,
  public.academic_structure_directory_statuses,
  public.academic_structures,
  public.academic_structure_years,
  public.academic_structure_snapshots,
  public.academic_structure_summary_fields,
  public.academic_structure_snapshot_sections,
  public.academic_structure_learning_outcomes,
  public.academic_structure_fees,
  public.academic_structure_snapshot_relationships,
  public.academic_structure_requirement_groups,
  public.academic_structure_requirement_conditions,
  public.academic_structure_requirement_options,
  public.academic_structure_unmodelled_requirements,
  public.academic_structure_snapshot_evidence,
  public.academic_structure_import_runs,
  public.academic_structure_import_targets,
  public.academic_structure_import_stages,
  public.academic_structure_import_artifacts,
  public.academic_structure_extractions,
  public.academic_structure_review_items,
  public.plan_structures
to service_role;

grant usage, select on all sequences in schema public to service_role;
grant usage, select on sequence public.academic_structure_import_runs_run_number_seq to authenticated;
