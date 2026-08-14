begin;

create schema if not exists private;
revoke all on schema private from public;

create table private.app_roles (
  id bigint generated always as identity primary key,
  key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint app_roles_key_unique unique (key),
  constraint app_roles_key_format_check check (key ~ '^[a-z][a-z0-9_]*$')
);

create table private.app_permissions (
  id bigint generated always as identity primary key,
  key text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint app_permissions_key_unique unique (key),
  constraint app_permissions_key_format_check check (
    key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'
  )
);

create table private.role_permissions (
  role_id bigint not null,
  permission_id bigint not null,
  created_at timestamptz not null default now(),
  constraint role_permissions_pkey primary key (role_id, permission_id),
  constraint role_permissions_role_id_fkey
    foreign key (role_id) references private.app_roles (id) on delete cascade,
  constraint role_permissions_permission_id_fkey
    foreign key (permission_id) references private.app_permissions (id) on delete cascade
);

create table private.user_roles (
  user_id uuid not null,
  role_id bigint not null,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  constraint user_roles_pkey primary key (user_id, role_id),
  constraint user_roles_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_roles_role_id_fkey
    foreign key (role_id) references private.app_roles (id) on delete cascade,
  constraint user_roles_granted_by_fkey
    foreign key (granted_by) references auth.users (id) on delete set null
);

create index role_permissions_permission_id_idx
  on private.role_permissions (permission_id);
create index user_roles_role_id_idx on private.user_roles (role_id);
create index user_roles_granted_by_idx
  on private.user_roles (granted_by);

alter table private.app_roles enable row level security;
alter table private.app_permissions enable row level security;
alter table private.role_permissions enable row level security;
alter table private.user_roles enable row level security;

insert into private.app_roles (key, name)
values ('catalogue_admin', 'Catalogue administrator');

insert into private.app_permissions (key, name)
values
  ('catalogue.read_drafts', 'Read draft catalogue records'),
  ('catalogue.write', 'Create and change catalogue records'),
  ('imports.manage', 'Run and review catalogue imports'),
  ('approvals.review', 'Review student approval requests');

insert into private.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from private.app_roles as roles
cross join private.app_permissions as permissions
where roles.key = 'catalogue_admin';

create or replace function private.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from private.user_roles as user_roles
    join private.role_permissions as role_permissions
      on role_permissions.role_id = user_roles.role_id
    join private.app_permissions as permissions
      on permissions.id = role_permissions.permission_id
    where user_roles.user_id = (select auth.uid())
      and permissions.key = required_permission
  );
$function$;

revoke all on function private.has_permission(text) from public;
revoke all on function private.has_permission(text) from anon;
grant usage on schema private to authenticated;
grant execute on function private.has_permission(text) to authenticated;

create table public.catalogue_years (
  id bigint generated always as identity primary key,
  year smallint not null,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_years_year_unique unique (year),
  constraint catalogue_years_year_range_check check (year between 2000 and 2200),
  constraint catalogue_years_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint catalogue_years_published_at_check check (
    status <> 'published' or published_at is not null
  )
);

create table public.catalogue_sources (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null,
  base_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_sources_kind_base_url_unique unique (kind, base_url),
  constraint catalogue_sources_name_not_blank_check check (btrim(name) <> ''),
  constraint catalogue_sources_kind_not_blank_check check (btrim(kind) <> ''),
  constraint catalogue_sources_base_url_not_blank_check check (btrim(base_url) <> '')
);

create table public.catalogue_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id bigint not null,
  catalogue_year_id bigint not null,
  scope text not null,
  trigger_kind text not null,
  parser_version text not null,
  status text not null default 'queued',
  initiated_by uuid,
  checked_count integer not null default 0,
  added_count integer not null default 0,
  changed_count integer not null default 0,
  unchanged_count integer not null default 0,
  failed_count integer not null default 0,
  error_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint catalogue_import_runs_source_id_fkey
    foreign key (source_id) references public.catalogue_sources (id),
  constraint catalogue_import_runs_catalogue_year_id_fkey
    foreign key (catalogue_year_id) references public.catalogue_years (id),
  constraint catalogue_import_runs_initiated_by_fkey
    foreign key (initiated_by) references auth.users (id) on delete set null,
  constraint catalogue_import_runs_id_provenance_unique unique (
    id,
    source_id,
    catalogue_year_id
  ),
  constraint catalogue_import_runs_scope_not_blank_check check (btrim(scope) <> ''),
  constraint catalogue_import_runs_parser_version_not_blank_check check (
    btrim(parser_version) <> ''
  ),
  constraint catalogue_import_runs_trigger_kind_check check (
    trigger_kind in ('manual', 'scheduled', 'cli')
  ),
  constraint catalogue_import_runs_status_check check (
    status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  constraint catalogue_import_runs_counts_check check (
    checked_count >= 0
    and added_count >= 0
    and changed_count >= 0
    and unchanged_count >= 0
    and failed_count >= 0
  ),
  constraint catalogue_import_runs_completed_at_check check (
    (status in ('queued', 'running') and completed_at is null)
    or (status in ('succeeded', 'failed', 'cancelled') and completed_at is not null)
  )
);

create table public.catalogue_source_documents (
  id bigint generated always as identity primary key,
  source_id bigint not null,
  catalogue_year_id bigint not null,
  entity_kind text not null,
  external_key text not null,
  canonical_url text not null,
  content_sha256 text not null,
  http_etag text,
  source_last_modified timestamptz,
  fetched_at timestamptz not null default now(),
  storage_path text,
  constraint catalogue_source_documents_source_id_fkey
    foreign key (source_id) references public.catalogue_sources (id),
  constraint catalogue_source_documents_catalogue_year_id_fkey
    foreign key (catalogue_year_id) references public.catalogue_years (id),
  constraint catalogue_source_documents_id_year_unique unique (id, catalogue_year_id),
  constraint catalogue_source_documents_id_provenance_unique unique (
    id,
    source_id,
    catalogue_year_id
  ),
  constraint catalogue_source_documents_snapshot_unique unique (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    content_sha256
  ),
  constraint catalogue_source_documents_entity_kind_check check (
    entity_kind in ('course', 'structure', 'offering')
  ),
  constraint catalogue_source_documents_external_key_not_blank_check check (
    btrim(external_key) <> ''
  ),
  constraint catalogue_source_documents_canonical_url_not_blank_check check (
    btrim(canonical_url) <> ''
  ),
  constraint catalogue_source_documents_content_sha256_check check (
    content_sha256 ~ '^[0-9a-f]{64}$'
  )
);

create table public.catalogue_import_items (
  id bigint generated always as identity primary key,
  run_id uuid not null,
  source_document_id bigint not null,
  source_id bigint not null,
  catalogue_year_id bigint not null,
  outcome text not null,
  target_kind text,
  target_key text,
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint catalogue_import_items_run_provenance_fkey
    foreign key (run_id, source_id, catalogue_year_id)
    references public.catalogue_import_runs (id, source_id, catalogue_year_id)
    on delete cascade,
  constraint catalogue_import_items_document_provenance_fkey
    foreign key (source_document_id, source_id, catalogue_year_id)
    references public.catalogue_source_documents (id, source_id, catalogue_year_id),
  constraint catalogue_import_items_run_document_unique unique (run_id, source_document_id),
  constraint catalogue_import_items_outcome_check check (
    outcome in ('created', 'updated', 'unchanged', 'review', 'failed', 'skipped')
  ),
  constraint catalogue_import_items_diagnostics_object_check check (
    jsonb_typeof(diagnostics) = 'object'
  )
);

create table public.catalogue_review_items (
  id bigint generated always as identity primary key,
  import_item_id bigint not null,
  issue_code text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  assigned_to uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_review_items_import_item_id_fkey
    foreign key (import_item_id) references public.catalogue_import_items (id) on delete cascade,
  constraint catalogue_review_items_assigned_to_fkey
    foreign key (assigned_to) references auth.users (id) on delete set null,
  constraint catalogue_review_items_resolved_by_fkey
    foreign key (resolved_by) references auth.users (id) on delete set null,
  constraint catalogue_review_items_issue_code_not_blank_check check (
    btrim(issue_code) <> ''
  ),
  constraint catalogue_review_items_summary_not_blank_check check (btrim(summary) <> ''),
  constraint catalogue_review_items_details_object_check check (
    jsonb_typeof(details) = 'object'
  ),
  constraint catalogue_review_items_status_check check (
    status in ('open', 'accepted', 'rejected', 'resolved')
  ),
  constraint catalogue_review_items_resolution_check check (
    (status = 'open' and resolved_at is null and resolved_by is null)
    or (status <> 'open' and resolved_at is not null)
  )
);

create table public.courses (
  id bigint generated always as identity primary key,
  code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_code_unique unique (code),
  constraint courses_code_format_check check (code ~ '^[A-Z]{4}[0-9]{4}$')
);

create table public.course_versions (
  id bigint generated always as identity primary key,
  course_id bigint not null,
  catalogue_year_id bigint not null,
  title text not null,
  units numeric(5, 2) not null,
  level smallint not null,
  subject text not null,
  school text not null,
  convener text,
  delivery_summary text,
  description text not null,
  publication_status text not null default 'draft',
  review_state text not null default 'automatic',
  source_document_id bigint not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_versions_course_id_fkey
    foreign key (course_id) references public.courses (id),
  constraint course_versions_catalogue_year_id_fkey
    foreign key (catalogue_year_id) references public.catalogue_years (id),
  constraint course_versions_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint course_versions_course_year_unique unique (course_id, catalogue_year_id),
  constraint course_versions_id_year_unique unique (id, catalogue_year_id),
  constraint course_versions_title_not_blank_check check (btrim(title) <> ''),
  constraint course_versions_units_check check (units > 0),
  constraint course_versions_level_check check (level between 0 and 9999),
  constraint course_versions_subject_not_blank_check check (btrim(subject) <> ''),
  constraint course_versions_school_not_blank_check check (btrim(school) <> ''),
  constraint course_versions_publication_status_check check (
    publication_status in ('draft', 'published', 'archived')
  ),
  constraint course_versions_review_state_check check (
    review_state in ('automatic', 'verified', 'review')
  )
);

create table public.academic_periods (
  id bigint generated always as identity primary key,
  calendar_year smallint not null,
  code text not null,
  name text not null,
  short_name text not null,
  starts_on date not null,
  ends_on date not null,
  sort_order integer not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_periods_year_code_unique unique (calendar_year, code),
  constraint academic_periods_calendar_year_check check (calendar_year between 2000 and 2200),
  constraint academic_periods_code_not_blank_check check (btrim(code) <> ''),
  constraint academic_periods_name_not_blank_check check (btrim(name) <> ''),
  constraint academic_periods_short_name_not_blank_check check (btrim(short_name) <> ''),
  constraint academic_periods_dates_check check (ends_on >= starts_on),
  constraint academic_periods_sort_order_check check (sort_order >= 0),
  constraint academic_periods_status_check check (
    status in ('draft', 'published', 'archived')
  )
);

create table public.course_offerings (
  id bigint generated always as identity primary key,
  course_version_id bigint not null,
  catalogue_year_id bigint not null,
  delivery_mode text,
  location text,
  source_document_id bigint not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offerings_version_year_fkey
    foreign key (course_version_id, catalogue_year_id)
    references public.course_versions (id, catalogue_year_id) on delete cascade,
  constraint course_offerings_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint course_offerings_id_year_unique unique (id, catalogue_year_id),
  constraint course_offerings_course_version_unique unique (course_version_id),
  constraint course_offerings_status_check check (
    status in ('draft', 'published', 'cancelled')
  )
);

create table public.offering_sessions (
  id bigint generated always as identity primary key,
  course_offering_id bigint not null,
  catalogue_year_id bigint not null,
  academic_period_id bigint not null,
  delivery_mode text,
  location text,
  source_document_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offering_sessions_offering_year_fkey
    foreign key (course_offering_id, catalogue_year_id)
    references public.course_offerings (id, catalogue_year_id) on delete cascade,
  constraint offering_sessions_academic_period_id_fkey
    foreign key (academic_period_id) references public.academic_periods (id),
  constraint offering_sessions_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint offering_sessions_offering_period_unique unique (
    course_offering_id,
    academic_period_id
  )
);

create table public.academic_structures (
  id bigint generated always as identity primary key,
  code text not null,
  kind text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structures_code_unique unique (code),
  constraint academic_structures_code_format_check check (code ~ '^[A-Z0-9][A-Z0-9-]*$'),
  constraint academic_structures_kind_check check (
    kind in ('degree', 'major', 'minor', 'specialisation')
  )
);

create table public.academic_structure_versions (
  id bigint generated always as identity primary key,
  structure_id bigint not null,
  catalogue_year_id bigint not null,
  name text not null,
  units numeric(6, 2) not null,
  duration_years numeric(3, 1),
  college text,
  description text not null,
  publication_status text not null default 'draft',
  review_state text not null default 'automatic',
  source_document_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_versions_structure_id_fkey
    foreign key (structure_id) references public.academic_structures (id),
  constraint academic_structure_versions_catalogue_year_id_fkey
    foreign key (catalogue_year_id) references public.catalogue_years (id),
  constraint academic_structure_versions_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint academic_structure_versions_structure_year_unique unique (
    structure_id,
    catalogue_year_id
  ),
  constraint academic_structure_versions_id_year_unique unique (id, catalogue_year_id),
  constraint academic_structure_versions_name_not_blank_check check (btrim(name) <> ''),
  constraint academic_structure_versions_units_check check (units > 0),
  constraint academic_structure_versions_duration_years_check check (
    duration_years is null or duration_years > 0
  ),
  constraint academic_structure_versions_publication_status_check check (
    publication_status in ('draft', 'published', 'archived')
  ),
  constraint academic_structure_versions_review_state_check check (
    review_state in ('automatic', 'verified', 'review')
  )
);

create table public.academic_structure_relationships (
  id bigint generated always as identity primary key,
  catalogue_year_id bigint not null,
  parent_structure_version_id bigint not null,
  child_structure_version_id bigint not null,
  relationship_kind text not null,
  position integer not null default 0,
  source_document_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_structure_relationships_parent_year_fkey
    foreign key (parent_structure_version_id, catalogue_year_id)
    references public.academic_structure_versions (id, catalogue_year_id)
    on delete cascade,
  constraint academic_structure_relationships_child_year_fkey
    foreign key (child_structure_version_id, catalogue_year_id)
    references public.academic_structure_versions (id, catalogue_year_id)
    on delete cascade,
  constraint academic_structure_relationships_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint academic_structure_relationships_unique unique (
    parent_structure_version_id,
    child_structure_version_id,
    relationship_kind
  ),
  constraint academic_structure_relationships_not_self_check check (
    parent_structure_version_id <> child_structure_version_id
  ),
  constraint academic_structure_relationships_kind_check check (
    relationship_kind in ('required', 'option', 'part_of')
  ),
  constraint academic_structure_relationships_position_check check (position >= 0)
);

create table public.requirement_groups (
  id bigint generated always as identity primary key,
  structure_version_id bigint not null,
  catalogue_year_id bigint not null,
  parent_group_id bigint,
  code text not null,
  name text not null,
  description text,
  operator text not null,
  minimum_count smallint,
  minimum_units numeric(6, 2),
  position integer not null default 0,
  source_document_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirement_groups_structure_version_year_fkey
    foreign key (structure_version_id, catalogue_year_id)
    references public.academic_structure_versions (id, catalogue_year_id)
    on delete cascade,
  constraint requirement_groups_id_structure_unique unique (id, structure_version_id),
  constraint requirement_groups_parent_structure_fkey
    foreign key (parent_group_id, structure_version_id)
    references public.requirement_groups (id, structure_version_id) on delete cascade,
  constraint requirement_groups_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint requirement_groups_code_not_blank_check check (btrim(code) <> ''),
  constraint requirement_groups_name_not_blank_check check (btrim(name) <> ''),
  constraint requirement_groups_operator_check check (
    operator in ('all_of', 'any_of', 'at_least')
  ),
  constraint requirement_groups_minimum_check check (
    (
      operator = 'at_least'
      and num_nonnulls(minimum_count, minimum_units) >= 1
      and (minimum_count is null or minimum_count > 0)
      and (minimum_units is null or minimum_units > 0)
    )
    or (
      operator <> 'at_least'
      and minimum_count is null
      and minimum_units is null
    )
  ),
  constraint requirement_groups_position_check check (position >= 0),
  constraint requirement_groups_not_self_parent_check check (
    parent_group_id is null or parent_group_id <> id
  )
);

create unique index requirement_groups_one_root_idx
  on public.requirement_groups (structure_version_id)
  where parent_group_id is null;
create unique index requirement_groups_sibling_position_idx
  on public.requirement_groups (structure_version_id, parent_group_id, position)
  where parent_group_id is not null;

create table public.requirement_conditions (
  id bigint generated always as identity primary key,
  structure_version_id bigint not null,
  requirement_group_id bigint not null,
  condition_kind text not null,
  course_id bigint,
  target_structure_id bigint,
  subject_code text,
  minimum_course_level smallint,
  maximum_course_level smallint,
  minimum_units numeric(6, 2),
  source_text text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirement_conditions_group_structure_fkey
    foreign key (requirement_group_id, structure_version_id)
    references public.requirement_groups (id, structure_version_id) on delete cascade,
  constraint requirement_conditions_course_id_fkey
    foreign key (course_id) references public.courses (id),
  constraint requirement_conditions_target_structure_id_fkey
    foreign key (target_structure_id) references public.academic_structures (id),
  constraint requirement_conditions_group_position_unique unique (
    requirement_group_id,
    position
  ),
  constraint requirement_conditions_kind_check check (
    condition_kind in ('course', 'structure', 'subject', 'level', 'elective', 'other')
  ),
  constraint requirement_conditions_subject_code_check check (
    subject_code is null or subject_code ~ '^[A-Z]{4}$'
  ),
  constraint requirement_conditions_levels_check check (
    (minimum_course_level is null or minimum_course_level between 0 and 9999)
    and (maximum_course_level is null or maximum_course_level between 0 and 9999)
    and (
      minimum_course_level is null
      or maximum_course_level is null
      or maximum_course_level >= minimum_course_level
    )
  ),
  constraint requirement_conditions_position_check check (position >= 0),
  constraint requirement_conditions_typed_value_check check (
    (
      condition_kind = 'course'
      and course_id is not null
      and num_nonnulls(
        target_structure_id,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_units
      ) = 0
    )
    or (
      condition_kind = 'structure'
      and target_structure_id is not null
      and num_nonnulls(
        course_id,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_units
      ) = 0
    )
    or (
      condition_kind = 'subject'
      and subject_code is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        course_id,
        target_structure_id,
        minimum_course_level,
        maximum_course_level
      ) = 0
    )
    or (
      condition_kind = 'level'
      and minimum_course_level is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(course_id, target_structure_id, subject_code) = 0
    )
    or (
      condition_kind = 'elective'
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        course_id,
        target_structure_id,
        subject_code,
        minimum_course_level,
        maximum_course_level
      ) = 0
    )
    or (
      condition_kind = 'other'
      and source_text is not null
      and btrim(source_text) <> ''
      and num_nonnulls(
        course_id,
        target_structure_id,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_units
      ) = 0
    )
  )
);

create table public.course_rules (
  id bigint generated always as identity primary key,
  course_version_id bigint not null,
  catalogue_year_id bigint not null,
  rule_kind text not null,
  hardness text not null default 'hard',
  source_text text not null,
  review_state text not null default 'automatic',
  confidence numeric(5, 4) not null default 1,
  source_document_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_rules_course_version_year_fkey
    foreign key (course_version_id, catalogue_year_id)
    references public.course_versions (id, catalogue_year_id) on delete cascade,
  constraint course_rules_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint course_rules_version_kind_unique unique (course_version_id, rule_kind),
  constraint course_rules_rule_kind_check check (
    rule_kind in (
      'prerequisite',
      'corequisite',
      'incompatibility',
      'permission',
      'assumed_knowledge'
    )
  ),
  constraint course_rules_hardness_check check (hardness in ('hard', 'advisory')),
  constraint course_rules_source_text_not_blank_check check (btrim(source_text) <> ''),
  constraint course_rules_review_state_check check (
    review_state in ('automatic', 'verified', 'review')
  ),
  constraint course_rules_confidence_check check (confidence between 0 and 1)
);

create table public.course_rule_groups (
  id bigint generated always as identity primary key,
  course_rule_id bigint not null,
  parent_group_id bigint,
  operator text not null,
  minimum_count smallint,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_rule_groups_course_rule_id_fkey
    foreign key (course_rule_id) references public.course_rules (id) on delete cascade,
  constraint course_rule_groups_id_rule_unique unique (id, course_rule_id),
  constraint course_rule_groups_parent_rule_fkey
    foreign key (parent_group_id, course_rule_id)
    references public.course_rule_groups (id, course_rule_id) on delete cascade,
  constraint course_rule_groups_operator_check check (
    operator in ('all_of', 'any_of', 'at_least')
  ),
  constraint course_rule_groups_minimum_count_check check (
    (operator = 'at_least' and minimum_count is not null and minimum_count > 0)
    or (operator <> 'at_least' and minimum_count is null)
  ),
  constraint course_rule_groups_position_check check (position >= 0),
  constraint course_rule_groups_not_self_parent_check check (
    parent_group_id is null or parent_group_id <> id
  )
);

create unique index course_rule_groups_one_root_idx
  on public.course_rule_groups (course_rule_id)
  where parent_group_id is null;
create unique index course_rule_groups_sibling_position_idx
  on public.course_rule_groups (course_rule_id, parent_group_id, position)
  where parent_group_id is not null;

create table public.course_rule_conditions (
  id bigint generated always as identity primary key,
  course_rule_id bigint not null,
  group_id bigint not null,
  condition_kind text not null,
  required_course_id bigint,
  required_structure_id bigint,
  minimum_units numeric(6, 2),
  minimum_mark numeric(5, 2),
  subject_code text,
  minimum_course_level smallint,
  maximum_course_level smallint,
  free_text text,
  source_text text,
  confidence numeric(5, 4) not null default 1,
  review_state text not null default 'automatic',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_rule_conditions_group_rule_fkey
    foreign key (group_id, course_rule_id)
    references public.course_rule_groups (id, course_rule_id) on delete cascade,
  constraint course_rule_conditions_required_course_id_fkey
    foreign key (required_course_id) references public.courses (id),
  constraint course_rule_conditions_required_structure_id_fkey
    foreign key (required_structure_id) references public.academic_structures (id),
  constraint course_rule_conditions_group_position_unique unique (group_id, position),
  constraint course_rule_conditions_kind_check check (
    condition_kind in (
      'course',
      'units_total',
      'subject_units',
      'level_units',
      'permission',
      'admission',
      'other'
    )
  ),
  constraint course_rule_conditions_minimum_mark_check check (
    minimum_mark is null or minimum_mark between 0 and 100
  ),
  constraint course_rule_conditions_subject_code_check check (
    subject_code is null or subject_code ~ '^[A-Z]{4}$'
  ),
  constraint course_rule_conditions_levels_check check (
    (minimum_course_level is null or minimum_course_level between 0 and 9999)
    and (maximum_course_level is null or maximum_course_level between 0 and 9999)
    and (
      minimum_course_level is null
      or maximum_course_level is null
      or maximum_course_level >= minimum_course_level
    )
  ),
  constraint course_rule_conditions_confidence_check check (confidence between 0 and 1),
  constraint course_rule_conditions_review_state_check check (
    review_state in ('automatic', 'verified', 'review')
  ),
  constraint course_rule_conditions_position_check check (position >= 0),
  constraint course_rule_conditions_typed_value_check check (
    (
      condition_kind = 'course'
      and required_course_id is not null
      and num_nonnulls(
        required_structure_id,
        minimum_units,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text
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
        free_text
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
        free_text
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
        free_text
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
        maximum_course_level
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
        maximum_course_level
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
        maximum_course_level
      ) = 0
    )
  )
);

create table public.profiles (
  id uuid primary key,
  display_name text not null,
  student_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_id_fkey
    foreign key (id) references auth.users (id) on delete cascade,
  constraint profiles_display_name_not_blank_check check (btrim(display_name) <> ''),
  constraint profiles_student_number_format_check check (
    student_number is null or student_number ~ '^u[0-9]{7}$'
  )
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  catalogue_year_id bigint not null,
  name text not null,
  is_primary boolean not null default false,
  status text not null default 'active',
  commencement_year smallint not null,
  study_load text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_owner_id_fkey
    foreign key (owner_id) references auth.users (id) on delete cascade,
  constraint plans_catalogue_year_id_fkey
    foreign key (catalogue_year_id) references public.catalogue_years (id),
  constraint plans_id_owner_unique unique (id, owner_id),
  constraint plans_id_owner_year_unique unique (id, owner_id, catalogue_year_id),
  constraint plans_name_not_blank_check check (btrim(name) <> ''),
  constraint plans_status_check check (status in ('active', 'archived')),
  constraint plans_primary_active_check check (not is_primary or status = 'active'),
  constraint plans_commencement_year_check check (commencement_year between 2000 and 2200),
  constraint plans_study_load_check check (study_load in ('full_time', 'part_time'))
);

create unique index plans_one_primary_per_owner_idx
  on public.plans (owner_id)
  where is_primary;

create table public.plan_structures (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  owner_id uuid not null,
  catalogue_year_id bigint not null,
  structure_version_id bigint not null,
  role text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_structures_plan_owner_year_fkey
    foreign key (plan_id, owner_id, catalogue_year_id)
    references public.plans (id, owner_id, catalogue_year_id) on delete cascade,
  constraint plan_structures_structure_year_fkey
    foreign key (structure_version_id, catalogue_year_id)
    references public.academic_structure_versions (id, catalogue_year_id),
  constraint plan_structures_plan_structure_unique unique (plan_id, structure_version_id),
  constraint plan_structures_role_check check (
    role in ('programme', 'major', 'minor', 'specialisation')
  ),
  constraint plan_structures_position_check check (position >= 0)
);

create unique index plan_structures_one_programme_idx
  on public.plan_structures (plan_id)
  where role = 'programme';

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  owner_id uuid not null,
  course_id bigint not null,
  academic_period_id bigint,
  sort_order bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_items_plan_owner_fkey
    foreign key (plan_id, owner_id)
    references public.plans (id, owner_id) on delete cascade,
  constraint plan_items_course_id_fkey
    foreign key (course_id) references public.courses (id),
  constraint plan_items_academic_period_id_fkey
    foreign key (academic_period_id) references public.academic_periods (id),
  constraint plan_items_id_owner_unique unique (id, owner_id),
  constraint plan_items_plan_course_unique unique (plan_id, course_id),
  constraint plan_items_sort_order_check check (sort_order >= 0)
);

create table public.course_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  course_id bigint not null,
  academic_period_id bigint not null,
  status text not null,
  mark numeric(5, 2),
  grade text,
  units_attempted numeric(5, 2) not null,
  units_earned numeric(5, 2) not null default 0,
  source text not null default 'user_entered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_attempts_owner_id_fkey
    foreign key (owner_id) references auth.users (id) on delete cascade,
  constraint course_attempts_course_id_fkey
    foreign key (course_id) references public.courses (id),
  constraint course_attempts_academic_period_id_fkey
    foreign key (academic_period_id) references public.academic_periods (id),
  constraint course_attempts_owner_course_period_unique unique (
    owner_id,
    course_id,
    academic_period_id
  ),
  constraint course_attempts_status_check check (
    status in ('enrolled', 'completed', 'failed', 'withdrawn', 'credited')
  ),
  constraint course_attempts_mark_check check (mark is null or mark between 0 and 100),
  constraint course_attempts_units_check check (
    units_attempted > 0
    and units_earned >= 0
    and units_earned <= units_attempted
  ),
  constraint course_attempts_source_check check (source in ('user_entered', 'imported'))
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  plan_item_id uuid,
  academic_period_id bigint,
  request_kind text not null,
  status text not null default 'pending',
  reason text not null,
  decision_note text,
  resolved_by uuid,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint approval_requests_owner_id_fkey
    foreign key (owner_id) references auth.users (id) on delete cascade,
  constraint approval_requests_plan_item_owner_fkey
    foreign key (plan_item_id, owner_id)
    references public.plan_items (id, owner_id)
    on delete set null (plan_item_id),
  constraint approval_requests_academic_period_id_fkey
    foreign key (academic_period_id) references public.academic_periods (id),
  constraint approval_requests_resolved_by_fkey
    foreign key (resolved_by) references auth.users (id) on delete restrict,
  constraint approval_requests_id_owner_unique unique (id, owner_id),
  constraint approval_requests_kind_check check (
    request_kind in ('convener_permission', 'overload', 'credit', 'substitution', 'other')
  ),
  constraint approval_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'cancelled')
  ),
  constraint approval_requests_reason_not_blank_check check (btrim(reason) <> ''),
  constraint approval_requests_decision_note_not_blank_check check (
    decision_note is null or btrim(decision_note) <> ''
  ),
  constraint approval_requests_resolution_check check (
    (
      status = 'pending'
      and decision_note is null
      and resolved_at is null
      and resolved_by is null
    )
    or (
      status <> 'pending'
      and resolved_at is not null
      and resolved_by is not null
    )
  )
);

create table public.approval_events (
  id bigint generated always as identity primary key,
  approval_request_id uuid not null,
  owner_id uuid not null,
  event_kind text not null,
  actor_id uuid,
  note text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint approval_events_request_owner_fkey
    foreign key (approval_request_id, owner_id)
    references public.approval_requests (id, owner_id) on delete cascade,
  constraint approval_events_actor_id_fkey
    foreign key (actor_id) references auth.users (id) on delete set null,
  constraint approval_events_kind_check check (
    event_kind in ('created', 'approved', 'rejected', 'cancelled')
  ),
  constraint approval_events_details_object_check check (jsonb_typeof(details) = 'object')
);

create index catalogue_import_runs_source_year_started_idx
  on public.catalogue_import_runs (source_id, catalogue_year_id, started_at desc);
create index catalogue_import_runs_catalogue_year_id_idx
  on public.catalogue_import_runs (catalogue_year_id);
create index catalogue_import_runs_status_started_idx
  on public.catalogue_import_runs (status, started_at desc);
create index catalogue_import_runs_initiated_by_idx
  on public.catalogue_import_runs (initiated_by);
create index catalogue_source_documents_latest_idx
  on public.catalogue_source_documents (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    fetched_at desc
  );
create index catalogue_source_documents_catalogue_year_id_idx
  on public.catalogue_source_documents (catalogue_year_id);
create index catalogue_import_items_run_provenance_idx
  on public.catalogue_import_items (run_id, source_id, catalogue_year_id);
create index catalogue_import_items_document_provenance_idx
  on public.catalogue_import_items (
    source_document_id,
    source_id,
    catalogue_year_id
  );
create index catalogue_import_items_outcome_idx
  on public.catalogue_import_items (outcome, created_at desc);
create index catalogue_review_items_import_item_id_idx
  on public.catalogue_review_items (import_item_id);
create index catalogue_review_items_open_idx
  on public.catalogue_review_items (created_at)
  where status = 'open';
create index catalogue_review_items_assigned_status_idx
  on public.catalogue_review_items (assigned_to, status);
create index catalogue_review_items_resolved_by_idx
  on public.catalogue_review_items (resolved_by);
create index course_versions_catalogue_year_id_idx
  on public.course_versions (catalogue_year_id);
create index course_versions_source_document_year_idx
  on public.course_versions (source_document_id, catalogue_year_id);
create index academic_periods_status_sort_idx
  on public.academic_periods (status, sort_order);
create index course_offerings_version_year_idx
  on public.course_offerings (course_version_id, catalogue_year_id);
create index course_offerings_source_document_year_idx
  on public.course_offerings (source_document_id, catalogue_year_id);
create index offering_sessions_offering_year_idx
  on public.offering_sessions (course_offering_id, catalogue_year_id);
create index offering_sessions_academic_period_id_idx
  on public.offering_sessions (academic_period_id);
create index offering_sessions_source_document_year_idx
  on public.offering_sessions (source_document_id, catalogue_year_id);
create index academic_structure_versions_catalogue_year_id_idx
  on public.academic_structure_versions (catalogue_year_id);
create index academic_structure_versions_source_document_year_idx
  on public.academic_structure_versions (source_document_id, catalogue_year_id);
create index academic_structure_relationships_parent_year_idx
  on public.academic_structure_relationships (
    parent_structure_version_id,
    catalogue_year_id,
    position
  );
create index academic_structure_relationships_child_year_idx
  on public.academic_structure_relationships (child_structure_version_id, catalogue_year_id);
create index academic_structure_relationships_source_document_year_idx
  on public.academic_structure_relationships (
    source_document_id,
    catalogue_year_id
  );
create index requirement_groups_structure_parent_position_idx
  on public.requirement_groups (structure_version_id, parent_group_id, position);
create index requirement_groups_structure_year_idx
  on public.requirement_groups (structure_version_id, catalogue_year_id);
create index requirement_groups_parent_structure_idx
  on public.requirement_groups (parent_group_id, structure_version_id);
create index requirement_groups_source_document_year_idx
  on public.requirement_groups (source_document_id, catalogue_year_id);
create index requirement_conditions_structure_group_position_idx
  on public.requirement_conditions (
    structure_version_id,
    requirement_group_id,
    position
  );
create index requirement_conditions_group_structure_idx
  on public.requirement_conditions (requirement_group_id, structure_version_id);
create index requirement_conditions_course_id_idx
  on public.requirement_conditions (course_id);
create index requirement_conditions_target_structure_id_idx
  on public.requirement_conditions (target_structure_id);
create index course_rules_course_version_year_idx
  on public.course_rules (course_version_id, catalogue_year_id);
create index course_rules_source_document_year_idx
  on public.course_rules (source_document_id, catalogue_year_id);
create index course_rule_groups_rule_parent_position_idx
  on public.course_rule_groups (course_rule_id, parent_group_id, position);
create index course_rule_groups_parent_rule_idx
  on public.course_rule_groups (parent_group_id, course_rule_id);
create index course_rule_conditions_rule_group_position_idx
  on public.course_rule_conditions (course_rule_id, group_id, position);
create index course_rule_conditions_group_rule_idx
  on public.course_rule_conditions (group_id, course_rule_id);
create index course_rule_conditions_required_course_id_idx
  on public.course_rule_conditions (required_course_id);
create index course_rule_conditions_required_structure_id_idx
  on public.course_rule_conditions (required_structure_id);
create index plans_owner_updated_idx on public.plans (owner_id, updated_at desc);
create index plans_catalogue_year_id_idx on public.plans (catalogue_year_id);
create index plan_structures_plan_owner_year_idx
  on public.plan_structures (plan_id, owner_id, catalogue_year_id, position);
create index plan_structures_structure_year_idx
  on public.plan_structures (structure_version_id, catalogue_year_id);
create index plan_structures_owner_id_idx
  on public.plan_structures (owner_id);
create index plan_items_plan_period_order_idx
  on public.plan_items (plan_id, academic_period_id, sort_order, id);
create index plan_items_plan_owner_idx
  on public.plan_items (plan_id, owner_id);
create index plan_items_owner_id_idx on public.plan_items (owner_id);
create index plan_items_course_id_idx on public.plan_items (course_id);
create index plan_items_academic_period_id_idx
  on public.plan_items (academic_period_id);
create index course_attempts_owner_period_idx
  on public.course_attempts (owner_id, academic_period_id);
create index course_attempts_owner_course_idx
  on public.course_attempts (owner_id, course_id);
create index course_attempts_course_id_idx
  on public.course_attempts (course_id);
create index course_attempts_academic_period_id_idx
  on public.course_attempts (academic_period_id);
create index approval_requests_owner_status_requested_idx
  on public.approval_requests (owner_id, status, requested_at desc);
create index approval_requests_plan_item_owner_idx
  on public.approval_requests (plan_item_id, owner_id);
create index approval_requests_academic_period_id_idx
  on public.approval_requests (academic_period_id);
create index approval_requests_resolved_by_idx
  on public.approval_requests (resolved_by);
create index approval_events_request_owner_occurred_idx
  on public.approval_events (approval_request_id, owner_id, occurred_at, id);
create index approval_events_owner_id_idx
  on public.approval_events (owner_id);
create index approval_events_actor_id_idx
  on public.approval_events (actor_id);
create unique index approval_events_one_created_idx
  on public.approval_events (approval_request_id)
  where event_kind = 'created';
create unique index approval_events_one_resolution_idx
  on public.approval_events (approval_request_id)
  where event_kind in ('approved', 'rejected', 'cancelled');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function private.set_updated_at() from public;

create trigger catalogue_years_set_updated_at
before update on public.catalogue_years
for each row execute function private.set_updated_at();
create trigger catalogue_sources_set_updated_at
before update on public.catalogue_sources
for each row execute function private.set_updated_at();
create trigger catalogue_review_items_set_updated_at
before update on public.catalogue_review_items
for each row execute function private.set_updated_at();
create trigger courses_set_updated_at
before update on public.courses
for each row execute function private.set_updated_at();
create trigger course_versions_set_updated_at
before update on public.course_versions
for each row execute function private.set_updated_at();
create trigger academic_periods_set_updated_at
before update on public.academic_periods
for each row execute function private.set_updated_at();
create trigger course_offerings_set_updated_at
before update on public.course_offerings
for each row execute function private.set_updated_at();
create trigger offering_sessions_set_updated_at
before update on public.offering_sessions
for each row execute function private.set_updated_at();
create trigger academic_structures_set_updated_at
before update on public.academic_structures
for each row execute function private.set_updated_at();
create trigger academic_structure_versions_set_updated_at
before update on public.academic_structure_versions
for each row execute function private.set_updated_at();
create trigger academic_structure_relationships_set_updated_at
before update on public.academic_structure_relationships
for each row execute function private.set_updated_at();
create trigger requirement_groups_set_updated_at
before update on public.requirement_groups
for each row execute function private.set_updated_at();
create trigger requirement_conditions_set_updated_at
before update on public.requirement_conditions
for each row execute function private.set_updated_at();
create trigger course_rules_set_updated_at
before update on public.course_rules
for each row execute function private.set_updated_at();
create trigger course_rule_groups_set_updated_at
before update on public.course_rule_groups
for each row execute function private.set_updated_at();
create trigger course_rule_conditions_set_updated_at
before update on public.course_rule_conditions
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();
create trigger plans_set_updated_at
before update on public.plans
for each row execute function private.set_updated_at();
create trigger plan_structures_set_updated_at
before update on public.plan_structures
for each row execute function private.set_updated_at();
create trigger plan_items_set_updated_at
before update on public.plan_items
for each row execute function private.set_updated_at();
create trigger course_attempts_set_updated_at
before update on public.course_attempts
for each row execute function private.set_updated_at();
create trigger approval_requests_set_updated_at
before update on public.approval_requests
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Student'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_new_user() from anon;
revoke all on function private.handle_new_user() from authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select
  users.id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Student'
  )
from auth.users as users
on conflict (id) do nothing;

create or replace function private.append_approval_created_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.approval_events (
    approval_request_id,
    owner_id,
    event_kind,
    actor_id
  )
  values (
    new.id,
    new.owner_id,
    'created',
    (select auth.uid())
  );

  return new;
end;
$function$;

revoke all on function private.append_approval_created_event() from public;
revoke all on function private.append_approval_created_event() from anon;
revoke all on function private.append_approval_created_event() from authenticated;

create trigger approval_requests_append_created_event
after insert on public.approval_requests
for each row execute function private.append_approval_created_event();

create or replace function private.prepare_approval_resolution()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  reviewer_id uuid;
begin
  if old.plan_item_id is not null
    and new.plan_item_id is null
    and row(
      new.id,
      new.owner_id,
      new.academic_period_id,
      new.request_kind,
      new.status,
      new.reason,
      new.decision_note,
      new.resolved_by,
      new.requested_at,
      new.resolved_at
    ) is not distinct from row(
      old.id,
      old.owner_id,
      old.academic_period_id,
      old.request_kind,
      old.status,
      old.reason,
      old.decision_note,
      old.resolved_by,
      old.requested_at,
      old.resolved_at
    ) then
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'resolved approval requests are immutable'
      using errcode = '23514',
        constraint = 'approval_requests_terminal_immutable_check';
  end if;

  if new.status = 'pending' then
    raise exception 'approval request updates must resolve the pending request'
      using errcode = '23514',
        constraint = 'approval_requests_transition_check';
  end if;

  if row(
    new.id,
    new.owner_id,
    new.plan_item_id,
    new.academic_period_id,
    new.request_kind,
    new.reason,
    new.requested_at
  ) is distinct from row(
    old.id,
    old.owner_id,
    old.plan_item_id,
    old.academic_period_id,
    old.request_kind,
    old.reason,
    old.requested_at
  ) then
    raise exception 'approval request details are immutable after submission'
      using errcode = '23514',
        constraint = 'approval_requests_details_immutable_check';
  end if;

  reviewer_id := (select auth.uid());
  if reviewer_id is null
    or not (select private.has_permission('approvals.review')) then
    raise exception 'approval resolution requires an authorised reviewer'
      using errcode = '42501';
  end if;

  new.resolved_by := reviewer_id;
  new.resolved_at := now();

  return new;
end;
$function$;

revoke all on function private.prepare_approval_resolution() from public;
revoke all on function private.prepare_approval_resolution() from anon;
revoke all on function private.prepare_approval_resolution() from authenticated;

create trigger approval_requests_prepare_resolution
before update on public.approval_requests
for each row execute function private.prepare_approval_resolution();

create or replace function private.append_approval_resolution_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.approval_events (
    approval_request_id,
    owner_id,
    event_kind,
    actor_id,
    note
  )
  values (
    new.id,
    new.owner_id,
    new.status,
    new.resolved_by,
    new.decision_note
  );

  return new;
end;
$function$;

revoke all on function private.append_approval_resolution_event() from public;
revoke all on function private.append_approval_resolution_event() from anon;
revoke all on function private.append_approval_resolution_event() from authenticated;

create trigger approval_requests_append_resolution_event
after update of status on public.approval_requests
for each row
when (old.status is distinct from new.status)
execute function private.append_approval_resolution_event();

create or replace function private.validate_requirement_tree()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  old_structure_version_id bigint;
  new_structure_version_id bigint;
  target_structure_version_id bigint;
  root_count integer;
  group_count integer;
  reachable_count integer;
begin
  if tg_table_name = 'academic_structure_versions' then
    if tg_op <> 'INSERT' then
      old_structure_version_id := old.id;
    end if;
    if tg_op <> 'DELETE' then
      new_structure_version_id := new.id;
    end if;
  else
    if tg_op <> 'INSERT' then
      old_structure_version_id := old.structure_version_id;
    end if;
    if tg_op <> 'DELETE' then
      new_structure_version_id := new.structure_version_id;
    end if;
  end if;

  for target_structure_version_id in
    select distinct candidates.id
    from unnest(array[old_structure_version_id, new_structure_version_id])
      as candidates(id)
    where candidates.id is not null
  loop
    if exists (
      select 1
      from public.academic_structure_versions as versions
      where versions.id = target_structure_version_id
    ) then
      select count(*)
      into root_count
      from public.requirement_groups as groups
      where groups.structure_version_id = target_structure_version_id
        and groups.parent_group_id is null;

      if root_count <> 1 then
        raise exception 'requirement tree must contain exactly one root'
          using errcode = '23514',
            constraint = 'requirement_groups_exactly_one_root_check';
      end if;

      select count(*)
      into group_count
      from public.requirement_groups as groups
      where groups.structure_version_id = target_structure_version_id;

      with recursive reachable (id) as (
        select groups.id
        from public.requirement_groups as groups
        where groups.structure_version_id = target_structure_version_id
          and groups.parent_group_id is null

        union

        select children.id
        from public.requirement_groups as children
        join reachable on children.parent_group_id = reachable.id
        where children.structure_version_id = target_structure_version_id
      )
      select count(*)
      into reachable_count
      from reachable;

      if reachable_count <> group_count then
        raise exception 'requirement tree must be connected and acyclic'
          using errcode = '23514',
            constraint = 'requirement_groups_tree_shape_check';
      end if;
    end if;
  end loop;

  return null;
end;
$function$;

revoke all on function private.validate_requirement_tree() from public;
revoke all on function private.validate_requirement_tree() from anon;
revoke all on function private.validate_requirement_tree() from authenticated;

create constraint trigger academic_structure_versions_validate_requirement_tree
after insert or update on public.academic_structure_versions
deferrable initially deferred
for each row execute function private.validate_requirement_tree();

create constraint trigger requirement_groups_validate_tree
after insert or update or delete on public.requirement_groups
deferrable initially deferred
for each row execute function private.validate_requirement_tree();

create or replace function private.validate_course_rule_tree()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  old_course_rule_id bigint;
  new_course_rule_id bigint;
  target_course_rule_id bigint;
  root_count integer;
  group_count integer;
  reachable_count integer;
begin
  if tg_table_name = 'course_rules' then
    if tg_op <> 'INSERT' then
      old_course_rule_id := old.id;
    end if;
    if tg_op <> 'DELETE' then
      new_course_rule_id := new.id;
    end if;
  else
    if tg_op <> 'INSERT' then
      old_course_rule_id := old.course_rule_id;
    end if;
    if tg_op <> 'DELETE' then
      new_course_rule_id := new.course_rule_id;
    end if;
  end if;

  for target_course_rule_id in
    select distinct candidates.id
    from unnest(array[old_course_rule_id, new_course_rule_id]) as candidates(id)
    where candidates.id is not null
  loop
    if exists (
      select 1
      from public.course_rules as rules
      where rules.id = target_course_rule_id
    ) then
      select count(*)
      into root_count
      from public.course_rule_groups as groups
      where groups.course_rule_id = target_course_rule_id
        and groups.parent_group_id is null;

      if root_count <> 1 then
        raise exception 'course rule tree must contain exactly one root'
          using errcode = '23514',
            constraint = 'course_rule_groups_exactly_one_root_check';
      end if;

      select count(*)
      into group_count
      from public.course_rule_groups as groups
      where groups.course_rule_id = target_course_rule_id;

      with recursive reachable (id) as (
        select groups.id
        from public.course_rule_groups as groups
        where groups.course_rule_id = target_course_rule_id
          and groups.parent_group_id is null

        union

        select children.id
        from public.course_rule_groups as children
        join reachable on children.parent_group_id = reachable.id
        where children.course_rule_id = target_course_rule_id
      )
      select count(*)
      into reachable_count
      from reachable;

      if reachable_count <> group_count then
        raise exception 'course rule tree must be connected and acyclic'
          using errcode = '23514',
            constraint = 'course_rule_groups_tree_shape_check';
      end if;
    end if;
  end loop;

  return null;
end;
$function$;

revoke all on function private.validate_course_rule_tree() from public;
revoke all on function private.validate_course_rule_tree() from anon;
revoke all on function private.validate_course_rule_tree() from authenticated;

create constraint trigger course_rules_validate_tree
after insert or update on public.course_rules
deferrable initially deferred
for each row execute function private.validate_course_rule_tree();

create constraint trigger course_rule_groups_validate_tree
after insert or update or delete on public.course_rule_groups
deferrable initially deferred
for each row execute function private.validate_course_rule_tree();

alter table public.catalogue_years enable row level security;
alter table public.catalogue_sources enable row level security;
alter table public.catalogue_import_runs enable row level security;
alter table public.catalogue_source_documents enable row level security;
alter table public.catalogue_import_items enable row level security;
alter table public.catalogue_review_items enable row level security;
alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.academic_periods enable row level security;
alter table public.course_offerings enable row level security;
alter table public.offering_sessions enable row level security;
alter table public.academic_structures enable row level security;
alter table public.academic_structure_versions enable row level security;
alter table public.academic_structure_relationships enable row level security;
alter table public.requirement_groups enable row level security;
alter table public.requirement_conditions enable row level security;
alter table public.course_rules enable row level security;
alter table public.course_rule_groups enable row level security;
alter table public.course_rule_conditions enable row level security;
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_structures enable row level security;
alter table public.plan_items enable row level security;
alter table public.course_attempts enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_events enable row level security;

create policy catalogue_years_read_published
on public.catalogue_years
for select
to anon, authenticated
using (status = 'published');

create policy courses_read_published
on public.courses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_versions as versions
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where versions.course_id = courses.id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy course_versions_read_published
on public.course_versions
for select
to anon, authenticated
using (
  publication_status = 'published'
  and exists (
    select 1
    from public.catalogue_years as years
    where years.id = course_versions.catalogue_year_id
      and years.status = 'published'
  )
);

create policy academic_periods_read_published
on public.academic_periods
for select
to anon, authenticated
using (status = 'published');

create policy course_offerings_read_published
on public.course_offerings
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.course_versions as versions
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where versions.id = course_offerings.course_version_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy offering_sessions_read_published
on public.offering_sessions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_offerings as offerings
    join public.course_versions as versions
      on versions.id = offerings.course_version_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    join public.academic_periods as periods
      on periods.id = offering_sessions.academic_period_id
    where offerings.id = offering_sessions.course_offering_id
      and offerings.status = 'published'
      and versions.publication_status = 'published'
      and years.status = 'published'
      and periods.status = 'published'
  )
);

create policy academic_structures_read_published
on public.academic_structures
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where versions.structure_id = academic_structures.id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy academic_structure_versions_read_published
on public.academic_structure_versions
for select
to anon, authenticated
using (
  publication_status = 'published'
  and exists (
    select 1
    from public.catalogue_years as years
    where years.id = academic_structure_versions.catalogue_year_id
      and years.status = 'published'
  )
);

create policy academic_structure_relationships_read_published
on public.academic_structure_relationships
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.academic_structure_versions as parent_versions
    join public.academic_structure_versions as child_versions
      on child_versions.id = academic_structure_relationships.child_structure_version_id
    join public.catalogue_years as years
      on years.id = academic_structure_relationships.catalogue_year_id
    where parent_versions.id = academic_structure_relationships.parent_structure_version_id
      and parent_versions.publication_status = 'published'
      and child_versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy requirement_groups_read_published
on public.requirement_groups
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where versions.id = requirement_groups.structure_version_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy requirement_conditions_read_published
on public.requirement_conditions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where versions.id = requirement_conditions.structure_version_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy course_rules_read_published
on public.course_rules
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_versions as versions
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where versions.id = course_rules.course_version_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy course_rule_groups_read_published
on public.course_rule_groups
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_rules as rules
    join public.course_versions as versions
      on versions.id = rules.course_version_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where rules.id = course_rule_groups.course_rule_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

create policy course_rule_conditions_read_published
on public.course_rule_conditions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_rules as rules
    join public.course_versions as versions
      on versions.id = rules.course_version_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where rules.id = course_rule_conditions.course_rule_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

do $policy$
declare
  table_name text;
begin
  foreach table_name in array array[
    'catalogue_years',
    'courses',
    'course_versions',
    'academic_periods',
    'course_offerings',
    'offering_sessions',
    'academic_structures',
    'academic_structure_versions',
    'academic_structure_relationships',
    'requirement_groups',
    'requirement_conditions',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.has_permission(''catalogue.read_drafts'')))',
      table_name || '_read_drafts',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.has_permission(''catalogue.write''))) with check ((select private.has_permission(''catalogue.write'')))',
      table_name || '_admin_all',
      table_name
    );
  end loop;
end;
$policy$;

do $policy$
declare
  table_name text;
begin
  foreach table_name in array array[
    'catalogue_sources',
    'catalogue_import_runs',
    'catalogue_source_documents',
    'catalogue_import_items',
    'catalogue_review_items'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.has_permission(''imports.manage''))) with check ((select private.has_permission(''imports.manage'')))',
      table_name || '_import_admin_all',
      table_name
    );
  end loop;
end;
$policy$;

create policy profiles_owner_select
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_owner_update
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy plans_owner_all
on public.plans
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy plan_structures_owner_all
on public.plan_structures
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy plan_items_owner_all
on public.plan_items
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy course_attempts_owner_all
on public.course_attempts
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy approval_requests_owner_select
on public.approval_requests
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy approval_requests_owner_insert
on public.approval_requests
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and status = 'pending'
  and decision_note is null
  and resolved_by is null
  and resolved_at is null
);

create policy approval_requests_reviewer_select
on public.approval_requests
for select
to authenticated
using ((select private.has_permission('approvals.review')));

create policy approval_requests_reviewer_update
on public.approval_requests
for update
to authenticated
using ((select private.has_permission('approvals.review')))
with check ((select private.has_permission('approvals.review')));

create policy approval_events_owner_select
on public.approval_events
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy approval_events_reviewer_select
on public.approval_events
for select
to authenticated
using ((select private.has_permission('approvals.review')));

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on table
  public.catalogue_years,
  public.courses,
  public.course_versions,
  public.academic_periods,
  public.course_offerings,
  public.offering_sessions,
  public.academic_structures,
  public.academic_structure_versions,
  public.academic_structure_relationships,
  public.requirement_groups,
  public.requirement_conditions,
  public.course_rules,
  public.course_rule_groups,
  public.course_rule_conditions
to anon, authenticated;

grant insert, update, delete on table
  public.catalogue_years,
  public.courses,
  public.course_versions,
  public.academic_periods,
  public.course_offerings,
  public.offering_sessions,
  public.academic_structures,
  public.academic_structure_versions,
  public.academic_structure_relationships,
  public.requirement_groups,
  public.requirement_conditions,
  public.course_rules,
  public.course_rule_groups,
  public.course_rule_conditions
to authenticated;

grant select, insert, update, delete on table
  public.catalogue_sources,
  public.catalogue_import_runs,
  public.catalogue_source_documents,
  public.catalogue_import_items,
  public.catalogue_review_items
to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.plans,
  public.plan_structures,
  public.plan_items,
  public.course_attempts
to authenticated;
grant select on table public.approval_requests to authenticated;
grant insert (
  owner_id,
  plan_item_id,
  academic_period_id,
  request_kind,
  reason
) on table public.approval_requests to authenticated;
grant update (status, decision_note)
  on table public.approval_requests to authenticated;
grant select on table public.approval_events to authenticated;

grant usage, select on all sequences in schema public to authenticated;
revoke all on sequence public.approval_events_id_seq from authenticated;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public;

commit;
