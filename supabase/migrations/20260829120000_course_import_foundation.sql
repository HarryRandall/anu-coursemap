-- Course-specific foundation for year-aware directories, immutable snapshots
-- and rich source provenance. Existing catalogue tables remain in place while
-- application reads and imports move across in later migrations.

create table public.academic_years (
  id bigint generated always as identity primary key,
  year smallint not null,
  is_import_enabled boolean not null default false,
  source_availability text not null default 'unknown',
  availability_checked_at timestamptz,
  directory_refreshed_at timestamptz,
  availability_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_year_unique unique (year),
  constraint academic_years_year_range_check check (year between 2000 and 2200),
  constraint academic_years_source_availability_check check (
    source_availability in ('unknown', 'available', 'unavailable')
  ),
  constraint academic_years_availability_note_check check (
    availability_note is null or btrim(availability_note) <> ''
  )
);

create table public.course_sources (
  id bigint generated always as identity primary key,
  name text not null,
  kind text not null,
  base_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_sources_kind_base_url_unique unique (kind, base_url),
  constraint course_sources_name_not_blank_check check (btrim(name) <> ''),
  constraint course_sources_kind_not_blank_check check (btrim(kind) <> ''),
  constraint course_sources_base_url_check check (
    base_url ~ '^https://[^[:space:]]+$'
  )
);

create table public.course_source_documents (
  id bigint generated always as identity primary key,
  source_id bigint not null,
  academic_year_id bigint not null,
  document_kind text not null,
  external_key text not null,
  canonical_url text not null,
  media_type text not null,
  content_sha256 text not null,
  http_status smallint,
  http_etag text,
  source_last_modified timestamptz,
  fetched_at timestamptz not null default now(),
  byte_size bigint,
  storage_bucket text,
  storage_path text,
  created_at timestamptz not null default now(),
  constraint course_source_documents_source_id_fkey
    foreign key (source_id) references public.course_sources (id),
  constraint course_source_documents_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years (id),
  constraint course_source_documents_id_year_unique unique (id, academic_year_id),
  constraint course_source_documents_snapshot_unique unique (
    source_id,
    academic_year_id,
    document_kind,
    external_key,
    content_sha256
  ),
  constraint course_source_documents_document_kind_check check (
    document_kind in ('course_page', 'course_directory', 'course_survey_report')
  ),
  constraint course_source_documents_external_key_not_blank_check check (
    btrim(external_key) <> ''
  ),
  constraint course_source_documents_canonical_url_check check (
    canonical_url ~ '^https://[^[:space:]]+$'
  ),
  constraint course_source_documents_media_type_not_blank_check check (
    btrim(media_type) <> ''
  ),
  constraint course_source_documents_content_sha256_check check (
    content_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint course_source_documents_http_status_check check (
    http_status is null or http_status between 100 and 599
  ),
  constraint course_source_documents_byte_size_check check (
    byte_size is null or byte_size >= 0
  ),
  constraint course_source_documents_storage_check check (
    (storage_bucket is null and storage_path is null)
    or (
      storage_bucket is not null
      and btrim(storage_bucket) <> ''
      and storage_path is not null
      and btrim(storage_path) <> ''
    )
  )
);

create table public.course_directory_entries (
  id bigint generated always as identity primary key,
  academic_year_id bigint not null,
  course_id bigint,
  code text not null,
  title text not null,
  units numeric(6, 2),
  academic_career text,
  session text,
  mode_of_delivery text,
  source_document_id bigint not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_directory_entries_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years (id),
  constraint course_directory_entries_course_id_fkey
    foreign key (course_id) references public.courses (id) on delete set null,
  constraint course_directory_entries_source_document_year_fkey
    foreign key (source_document_id, academic_year_id)
    references public.course_source_documents (id, academic_year_id),
  constraint course_directory_entries_year_code_unique unique (
    academic_year_id,
    code
  ),
  constraint course_directory_entries_code_check check (
    code ~ '^[A-Z]{4}[0-9]{4}$'
  ),
  constraint course_directory_entries_title_not_blank_check check (
    btrim(title) <> ''
  ),
  constraint course_directory_entries_units_check check (
    units is null or units >= 0
  ),
  constraint course_directory_entries_academic_career_check check (
    academic_career is null or btrim(academic_career) <> ''
  ),
  constraint course_directory_entries_session_check check (
    session is null or btrim(session) <> ''
  ),
  constraint course_directory_entries_mode_of_delivery_check check (
    mode_of_delivery is null or btrim(mode_of_delivery) <> ''
  ),
  constraint course_directory_entries_seen_at_check check (
    last_seen_at >= first_seen_at
  )
);

create table public.course_years (
  id bigint generated always as identity primary key,
  course_id bigint not null,
  academic_year_id bigint not null,
  lifecycle_status text not null default 'active',
  draft_snapshot_id bigint,
  published_snapshot_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_years_course_id_fkey
    foreign key (course_id) references public.courses (id),
  constraint course_years_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years (id),
  constraint course_years_course_academic_year_unique unique (
    course_id,
    academic_year_id
  ),
  constraint course_years_id_academic_year_unique unique (
    id,
    academic_year_id
  ),
  constraint course_years_lifecycle_status_check check (
    lifecycle_status in ('active', 'archived')
  )
);

create table public.course_snapshots (
  id bigint generated always as identity primary key,
  course_year_id bigint not null,
  academic_year_id bigint not null,
  snapshot_number integer not null,
  origin text not null,
  based_on_snapshot_id bigint,
  source_document_id bigint,
  projection_sha256 text,
  schema_version text not null default 'course-snapshot.v1',
  validation_status text not null,
  overall_confidence numeric(5, 4),
  has_critical_uncertainty boolean not null default false,
  title text not null,
  unit_value_kind text not null default 'fixed',
  units numeric(6, 2),
  minimum_units numeric(6, 2),
  maximum_units numeric(6, 2),
  eftsl numeric(7, 5),
  level smallint,
  subject_code text,
  subject_name text,
  school text,
  college text,
  academic_career text,
  convener_text text,
  delivery_summary text,
  introduction text,
  description text,
  workload_text text,
  workload_hours numeric(7, 2),
  inherent_requirements text,
  prescribed_texts text,
  offering_status text not null default 'unknown',
  source_updated_at timestamptz,
  sealed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint course_snapshots_course_year_academic_year_fkey
    foreign key (course_year_id, academic_year_id)
    references public.course_years (id, academic_year_id) on delete cascade,
  constraint course_snapshots_id_course_year_unique unique (id, course_year_id),
  constraint course_snapshots_id_academic_year_unique unique (
    id,
    academic_year_id
  ),
  constraint course_snapshots_source_document_year_fkey
    foreign key (source_document_id, academic_year_id)
    references public.course_source_documents (id, academic_year_id),
  constraint course_snapshots_based_on_same_course_year_fkey
    foreign key (based_on_snapshot_id, course_year_id)
    references public.course_snapshots (id, course_year_id),
  constraint course_snapshots_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null,
  constraint course_snapshots_number_unique unique (
    course_year_id,
    snapshot_number
  ),
  constraint course_snapshots_snapshot_number_check check (snapshot_number > 0),
  constraint course_snapshots_origin_check check (
    origin in ('import', 'manual_edit', 'legacy_backfill')
  ),
  constraint course_snapshots_projection_sha256_check check (
    projection_sha256 is null or projection_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint course_snapshots_projection_sha256_required_check check (
    origin = 'legacy_backfill' or projection_sha256 is not null
  ),
  constraint course_snapshots_schema_version_not_blank_check check (
    btrim(schema_version) <> ''
  ),
  constraint course_snapshots_validation_status_check check (
    validation_status in ('valid', 'valid_with_warnings')
  ),
  constraint course_snapshots_overall_confidence_check check (
    overall_confidence is null or overall_confidence between 0 and 1
  ),
  constraint course_snapshots_title_not_blank_check check (btrim(title) <> ''),
  constraint course_snapshots_unit_value_kind_check check (
    unit_value_kind in ('fixed', 'range', 'variable', 'unknown')
  ),
  constraint course_snapshots_units_check check (
    (units is null or units >= 0)
    and (minimum_units is null or minimum_units >= 0)
    and (maximum_units is null or maximum_units >= 0)
    and (
      minimum_units is null
      or maximum_units is null
      or maximum_units >= minimum_units
    )
    and (unit_value_kind <> 'fixed' or units is not null)
  ),
  constraint course_snapshots_eftsl_check check (eftsl is null or eftsl >= 0),
  constraint course_snapshots_level_check check (
    level is null or level between 0 and 9999
  ),
  constraint course_snapshots_subject_code_check check (
    subject_code is null or subject_code ~ '^[A-Z]{4}$'
  ),
  constraint course_snapshots_workload_hours_check check (
    workload_hours is null or workload_hours >= 0
  ),
  constraint course_snapshots_offering_status_check check (
    offering_status in ('offered', 'not_offered', 'unknown')
  ),
  constraint course_snapshots_sealed_at_check check (
    sealed_at is null or sealed_at >= created_at
  )
);

alter table public.course_years
  add constraint course_years_draft_snapshot_same_year_fkey
    foreign key (draft_snapshot_id, id)
    references public.course_snapshots (id, course_year_id),
  add constraint course_years_published_snapshot_same_year_fkey
    foreign key (published_snapshot_id, id)
    references public.course_snapshots (id, course_year_id),
  add constraint course_years_distinct_snapshot_pointers_check check (
    draft_snapshot_id is null
    or published_snapshot_id is null
    or draft_snapshot_id <> published_snapshot_id
  );

create table public.course_fees (
  id bigint generated always as identity primary key,
  course_snapshot_id bigint not null,
  position integer not null,
  fee_year smallint,
  audience text not null,
  fee_type text not null,
  amount numeric(12, 2),
  currency text,
  basis text not null default 'unknown',
  student_contribution_band smallint,
  source_label text,
  source_text text,
  created_at timestamptz not null default now(),
  constraint course_fees_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade,
  constraint course_fees_snapshot_position_unique unique (
    course_snapshot_id,
    position
  ),
  constraint course_fees_position_check check (position > 0),
  constraint course_fees_fee_year_check check (
    fee_year is null or fee_year between 2000 and 2200
  ),
  constraint course_fees_audience_check check (
    audience in (
      'domestic',
      'international',
      'commonwealth_supported',
      'other'
    )
  ),
  constraint course_fees_fee_type_check check (
    fee_type in ('student_contribution', 'tuition', 'indicative', 'other')
  ),
  constraint course_fees_amount_check check (amount is null or amount >= 0),
  constraint course_fees_currency_check check (
    currency is null or currency ~ '^[A-Z]{3}$'
  ),
  constraint course_fees_basis_check check (
    basis in ('course', 'unit', 'eftsl', 'annual', 'unknown')
  ),
  constraint course_fees_band_check check (
    student_contribution_band is null or student_contribution_band > 0
  ),
  constraint course_fees_value_check check (
    amount is not null
    or student_contribution_band is not null
    or (source_text is not null and btrim(source_text) <> '')
  )
);

create table public.course_areas_of_interest (
  id bigint generated always as identity primary key,
  course_snapshot_id bigint not null,
  position integer not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint course_areas_of_interest_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade,
  constraint course_areas_of_interest_snapshot_position_unique unique (
    course_snapshot_id,
    position
  ),
  constraint course_areas_of_interest_snapshot_name_unique unique (
    course_snapshot_id,
    name
  ),
  constraint course_areas_of_interest_position_check check (position > 0),
  constraint course_areas_of_interest_name_not_blank_check check (
    btrim(name) <> ''
  )
);

create table public.course_related_courses (
  id bigint generated always as identity primary key,
  course_snapshot_id bigint not null,
  position integer not null,
  relation_kind text not null,
  related_course_id bigint,
  source_course_code text not null,
  source_course_title text,
  source_text text,
  created_at timestamptz not null default now(),
  constraint course_related_courses_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade,
  constraint course_related_courses_related_course_id_fkey
    foreign key (related_course_id) references public.courses (id),
  constraint course_related_courses_snapshot_position_unique unique (
    course_snapshot_id,
    position
  ),
  constraint course_related_courses_identity_unique unique (
    course_snapshot_id,
    relation_kind,
    source_course_code
  ),
  constraint course_related_courses_position_check check (position > 0),
  constraint course_related_courses_relation_kind_check check (
    relation_kind in ('co_taught', 'equivalent', 'other')
  ),
  constraint course_related_courses_source_course_code_check check (
    source_course_code ~ '^[A-Z]{4}[0-9]{4}$'
  )
);

create table public.course_snapshot_field_evidence (
  id bigint generated always as identity primary key,
  course_snapshot_id bigint not null,
  academic_year_id bigint not null,
  source_document_id bigint,
  entity_kind text not null,
  entity_key text not null default 'root',
  field_key text not null,
  importance text not null,
  extraction_state text not null,
  confidence numeric(5, 4),
  confidence_band text not null,
  verification_status text not null,
  source_locator text,
  evidence_excerpt text,
  note text,
  created_at timestamptz not null default now(),
  constraint course_snapshot_field_evidence_snapshot_year_fkey
    foreign key (course_snapshot_id, academic_year_id)
    references public.course_snapshots (id, academic_year_id) on delete cascade,
  constraint course_snapshot_field_evidence_source_document_year_fkey
    foreign key (source_document_id, academic_year_id)
    references public.course_source_documents (id, academic_year_id),
  constraint course_snapshot_field_evidence_field_unique unique (
    course_snapshot_id,
    entity_kind,
    entity_key,
    field_key
  ),
  constraint course_snapshot_field_evidence_entity_kind_not_blank_check check (
    btrim(entity_kind) <> ''
  ),
  constraint course_snapshot_field_evidence_entity_key_not_blank_check check (
    btrim(entity_key) <> ''
  ),
  constraint course_snapshot_field_evidence_field_key_not_blank_check check (
    btrim(field_key) <> ''
  ),
  constraint course_snapshot_field_evidence_importance_check check (
    importance in ('critical', 'high', 'normal', 'low')
  ),
  constraint course_snapshot_field_evidence_extraction_state_check check (
    extraction_state in (
      'present',
      'missing',
      'ambiguous',
      'conflicting',
      'unsupported'
    )
  ),
  constraint course_snapshot_field_evidence_confidence_check check (
    confidence is null or confidence between 0 and 1
  ),
  constraint course_snapshot_field_evidence_confidence_band_check check (
    confidence_band in ('high', 'medium', 'low', 'unknown')
  ),
  constraint course_snapshot_field_evidence_verification_status_check check (
    verification_status in (
      'model_only',
      'source_matched',
      'deterministic',
      'human_confirmed',
      'legacy_backfill'
    )
  )
);

-- Bridge the existing rich course tables to immutable snapshots. The legacy
-- course_version_id columns stay authoritative until the application cutover.
alter table public.course_offerings
  add column course_snapshot_id bigint,
  add constraint course_offerings_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade;

alter table public.course_learning_outcomes
  add column course_snapshot_id bigint,
  add constraint course_learning_outcomes_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade,
  add constraint course_learning_outcomes_id_snapshot_unique
    unique (id, course_snapshot_id);

alter table public.course_assessment_items
  add column course_snapshot_id bigint,
  add constraint course_assessment_items_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade,
  add constraint course_assessment_items_id_snapshot_unique
    unique (id, course_snapshot_id);

alter table public.course_rules
  add column course_snapshot_id bigint,
  add constraint course_rules_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id) on delete cascade;

create table public.course_assessment_outcomes (
  course_snapshot_id bigint not null,
  assessment_item_id bigint not null,
  learning_outcome_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (assessment_item_id, learning_outcome_id),
  constraint course_assessment_outcomes_assessment_snapshot_fkey
    foreign key (assessment_item_id, course_snapshot_id)
    references public.course_assessment_items (id, course_snapshot_id)
    on delete cascade,
  constraint course_assessment_outcomes_learning_outcome_snapshot_fkey
    foreign key (learning_outcome_id, course_snapshot_id)
    references public.course_learning_outcomes (id, course_snapshot_id)
    on delete cascade
);

create unique index course_offerings_course_snapshot_id_idx
  on public.course_offerings (course_snapshot_id)
  where course_snapshot_id is not null;

create unique index course_learning_outcomes_snapshot_position_idx
  on public.course_learning_outcomes (course_snapshot_id, position)
  where course_snapshot_id is not null;

create unique index course_assessment_items_snapshot_position_idx
  on public.course_assessment_items (course_snapshot_id, position)
  where course_snapshot_id is not null;

create unique index course_rules_snapshot_kind_idx
  on public.course_rules (course_snapshot_id, rule_kind)
  where course_snapshot_id is not null;

create unique index course_snapshots_projection_sha256_idx
  on public.course_snapshots (course_year_id, projection_sha256)
  where projection_sha256 is not null;

create index course_offerings_course_snapshot_fk_idx
  on public.course_offerings (course_snapshot_id);

create index course_learning_outcomes_course_snapshot_fk_idx
  on public.course_learning_outcomes (course_snapshot_id);

create index course_assessment_items_course_snapshot_fk_idx
  on public.course_assessment_items (course_snapshot_id);

create index course_rules_course_snapshot_fk_idx
  on public.course_rules (course_snapshot_id);

-- Foreign-key and access-path indexes are explicit because Postgres does not
-- create them automatically.
create index academic_years_import_enabled_idx
  on public.academic_years (year)
  where is_import_enabled;

create index course_source_documents_academic_year_id_idx
  on public.course_source_documents (academic_year_id);

create index course_directory_entries_course_id_idx
  on public.course_directory_entries (course_id);

create index course_directory_entries_source_document_year_idx
  on public.course_directory_entries (source_document_id, academic_year_id);

create index course_directory_entries_current_year_title_idx
  on public.course_directory_entries (academic_year_id, title)
  where is_current;

create index course_years_academic_year_id_idx
  on public.course_years (academic_year_id);

create index course_years_draft_snapshot_id_idx
  on public.course_years (draft_snapshot_id, id);

create index course_years_published_snapshot_id_idx
  on public.course_years (published_snapshot_id, id);

create index course_snapshots_course_year_academic_year_idx
  on public.course_snapshots (course_year_id, academic_year_id);

create index course_snapshots_source_document_year_idx
  on public.course_snapshots (source_document_id, academic_year_id);

create index course_snapshots_based_on_snapshot_id_idx
  on public.course_snapshots (based_on_snapshot_id, course_year_id);

create index course_snapshots_created_by_idx
  on public.course_snapshots (created_by);

create index course_fees_course_snapshot_id_idx
  on public.course_fees (course_snapshot_id);

create index course_areas_of_interest_course_snapshot_id_idx
  on public.course_areas_of_interest (course_snapshot_id);

create index course_related_courses_related_course_id_idx
  on public.course_related_courses (related_course_id);

create index course_assessment_outcomes_assessment_snapshot_idx
  on public.course_assessment_outcomes (
    assessment_item_id,
    course_snapshot_id
  );

create index course_assessment_outcomes_outcome_snapshot_idx
  on public.course_assessment_outcomes (
    learning_outcome_id,
    course_snapshot_id
  );

create index course_snapshot_field_evidence_snapshot_year_idx
  on public.course_snapshot_field_evidence (
    course_snapshot_id,
    academic_year_id
  );

create index course_snapshot_field_evidence_source_document_year_idx
  on public.course_snapshot_field_evidence (
    source_document_id,
    academic_year_id
  );

create trigger academic_years_set_updated_at
before update on public.academic_years
for each row execute function private.set_updated_at();

create trigger course_sources_set_updated_at
before update on public.course_sources
for each row execute function private.set_updated_at();

create trigger course_directory_entries_set_updated_at
before update on public.course_directory_entries
for each row execute function private.set_updated_at();

create trigger course_years_set_updated_at
before update on public.course_years
for each row execute function private.set_updated_at();

create or replace function private.reject_immutable_course_record_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception '% records are immutable; create a new record instead', tg_table_name
    using errcode = '55000';
end;
$function$;

revoke all on function private.reject_immutable_course_record_mutation()
from public, anon, authenticated;

create trigger course_source_documents_reject_mutation
before update or delete on public.course_source_documents
for each row execute function private.reject_immutable_course_record_mutation();

create or replace function private.enforce_course_snapshot_immutability()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'UPDATE'
    and old.sealed_at is null
    and new.sealed_at is not null
    and (to_jsonb(new) - 'sealed_at') = (to_jsonb(old) - 'sealed_at')
  then
    return new;
  end if;

  raise exception
    'course_snapshots records are immutable; create a new record instead'
    using errcode = '55000';
end;
$function$;

revoke all on function private.enforce_course_snapshot_immutability()
from public, anon, authenticated;

create trigger course_snapshots_enforce_immutability
before update or delete on public.course_snapshots
for each row execute function private.enforce_course_snapshot_immutability();

create trigger course_fees_reject_mutation
before update or delete on public.course_fees
for each row execute function private.reject_immutable_course_record_mutation();

create trigger course_areas_of_interest_reject_mutation
before update or delete on public.course_areas_of_interest
for each row execute function private.reject_immutable_course_record_mutation();

create trigger course_related_courses_reject_mutation
before update or delete on public.course_related_courses
for each row execute function private.reject_immutable_course_record_mutation();

create trigger course_assessment_outcomes_reject_mutation
before update or delete on public.course_assessment_outcomes
for each row execute function private.reject_immutable_course_record_mutation();

create trigger course_snapshot_field_evidence_reject_mutation
before update or delete on public.course_snapshot_field_evidence
for each row execute function private.reject_immutable_course_record_mutation();

create or replace function private.seal_course_year_snapshot_pointers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.draft_snapshot_id is not null then
    update public.course_snapshots
    set sealed_at = greatest(statement_timestamp(), created_at)
    where id = new.draft_snapshot_id
      and sealed_at is null;
  end if;

  if new.published_snapshot_id is not null then
    update public.course_snapshots
    set sealed_at = greatest(statement_timestamp(), created_at)
    where id = new.published_snapshot_id
      and sealed_at is null;
  end if;

  return new;
end;
$function$;

revoke all on function private.seal_course_year_snapshot_pointers()
from public, anon, authenticated;

create trigger course_years_seal_snapshot_pointers
before insert or update on public.course_years
for each row execute function private.seal_course_year_snapshot_pointers();

-- Keep this expansion migration compatible with local preview fixtures and the
-- short deployment window where the legacy importer can still create rows.
-- The function is deliberately private and idempotent. It will be removed once
-- all writes have moved to the course-specific model.
create or replace function private.backfill_course_snapshot_foundation()
returns void
language plpgsql
set search_path = ''
as $function$
declare
  legacy_version_count bigint;
  course_year_count bigint;
  snapshot_count bigint;
  legacy_directory_count bigint;
  directory_entry_count bigint;
begin
-- Seed the selectable import-year window without fetching any directories or
-- course details.
insert into public.academic_years (year, is_import_enabled)
select year, true
from generate_series(2020, 2030) as year
on conflict (year) do nothing;

-- Preserve any historical catalogue years outside the selectable import
-- window so every existing course version can be represented safely.
insert into public.academic_years (year, is_import_enabled)
select catalogue_years.year, false
from public.catalogue_years
on conflict (year) do nothing;

insert into public.course_sources (name, kind, base_url, is_active, created_at, updated_at)
select
  sources.name,
  case
    when sources.kind = 'anu_programs_courses_html'
      then 'anu_programs_courses'
    else sources.kind
  end,
  sources.base_url,
  sources.is_active,
  sources.created_at,
  sources.updated_at
from public.catalogue_sources as sources
where sources.kind = 'anu_programs_courses_html'
   or exists (
     select 1
     from public.catalogue_source_documents as source_documents
     where source_documents.source_id = sources.id
       and source_documents.entity_kind in (
         'course',
         'offering',
         'course_directory'
       )
   )
on conflict (kind, base_url) do nothing;

insert into public.course_source_documents (
  source_id,
  academic_year_id,
  document_kind,
  external_key,
  canonical_url,
  media_type,
  content_sha256,
  http_status,
  http_etag,
  source_last_modified,
  fetched_at,
  storage_bucket,
  storage_path,
  created_at
)
select
  course_sources.id,
  academic_years.id,
  case source_documents.entity_kind
    when 'course_directory' then 'course_directory'
    else 'course_page'
  end,
  source_documents.external_key,
  source_documents.canonical_url,
  case source_documents.entity_kind
    when 'course_directory' then 'application/json'
    else 'text/html'
  end,
  source_documents.content_sha256,
  null,
  source_documents.http_etag,
  source_documents.source_last_modified,
  source_documents.fetched_at,
  null,
  null,
  source_documents.fetched_at
from public.catalogue_source_documents as source_documents
join public.catalogue_sources as catalogue_sources
  on catalogue_sources.id = source_documents.source_id
join public.course_sources as course_sources
  on course_sources.base_url = catalogue_sources.base_url
 and course_sources.kind = case
   when catalogue_sources.kind = 'anu_programs_courses_html'
     then 'anu_programs_courses'
   else catalogue_sources.kind
 end
join public.catalogue_years as catalogue_years
  on catalogue_years.id = source_documents.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
where source_documents.entity_kind in ('course', 'course_directory')
on conflict (
  source_id,
  academic_year_id,
  document_kind,
  external_key,
  content_sha256
) do nothing;

insert into public.course_directory_entries (
  academic_year_id,
  course_id,
  code,
  title,
  units,
  academic_career,
  session,
  mode_of_delivery,
  source_document_id,
  first_seen_at,
  last_seen_at,
  is_current,
  created_at,
  updated_at
)
select
  academic_years.id,
  courses.id,
  directory_courses.code,
  directory_courses.title,
  directory_courses.units,
  directory_courses.career,
  directory_courses.session,
  directory_courses.mode_of_delivery,
  course_source_documents.id,
  directory_courses.created_at,
  directory_courses.updated_at,
  true,
  directory_courses.created_at,
  directory_courses.updated_at
from public.catalogue_directory_courses as directory_courses
join public.catalogue_years as catalogue_years
  on catalogue_years.id = directory_courses.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.catalogue_source_documents as catalogue_source_documents
  on catalogue_source_documents.id = directory_courses.source_document_id
join public.catalogue_sources as catalogue_sources
  on catalogue_sources.id = catalogue_source_documents.source_id
join public.course_sources as course_sources
  on course_sources.base_url = catalogue_sources.base_url
 and course_sources.kind = case
   when catalogue_sources.kind = 'anu_programs_courses_html'
     then 'anu_programs_courses'
   else catalogue_sources.kind
 end
join public.course_source_documents as course_source_documents
  on course_source_documents.source_id = course_sources.id
 and course_source_documents.academic_year_id = academic_years.id
 and course_source_documents.document_kind = 'course_directory'
 and course_source_documents.external_key = catalogue_source_documents.external_key
 and course_source_documents.content_sha256 = catalogue_source_documents.content_sha256
left join public.courses as courses
  on courses.code = directory_courses.code
on conflict (academic_year_id, code) do nothing;

update public.academic_years as academic_years
set directory_refreshed_at = refreshed.latest_fetched_at
from (
  select
    documents.academic_year_id,
    max(documents.fetched_at) as latest_fetched_at
  from public.course_source_documents as documents
  where documents.document_kind = 'course_directory'
  group by documents.academic_year_id
) as refreshed
where refreshed.academic_year_id = academic_years.id
  and academic_years.directory_refreshed_at is distinct from
    refreshed.latest_fetched_at;

insert into public.course_years (
  course_id,
  academic_year_id,
  lifecycle_status,
  created_at,
  updated_at
)
select
  versions.course_id,
  academic_years.id,
  case
    when versions.publication_status = 'archived' then 'archived'
    else 'active'
  end,
  versions.created_at,
  versions.updated_at
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
on conflict (course_id, academic_year_id) do nothing;

insert into public.course_snapshots (
  course_year_id,
  academic_year_id,
  snapshot_number,
  origin,
  source_document_id,
  projection_sha256,
  validation_status,
  overall_confidence,
  has_critical_uncertainty,
  title,
  unit_value_kind,
  units,
  minimum_units,
  maximum_units,
  eftsl,
  level,
  subject_code,
  school,
  convener_text,
  delivery_summary,
  description,
  workload_text,
  workload_hours,
  inherent_requirements,
  prescribed_texts,
  offering_status,
  source_updated_at,
  created_at
)
select
  course_years.id,
  academic_years.id,
  1,
  'legacy_backfill',
  course_source_documents.id,
  null,
  case
    when versions.review_state = 'review' then 'valid_with_warnings'
    else 'valid'
  end,
  null,
  versions.review_state = 'review',
  versions.title,
  'fixed',
  versions.units,
  versions.units,
  versions.units,
  versions.eftsl,
  versions.level,
  versions.subject,
  versions.school,
  versions.convener,
  versions.delivery_summary,
  versions.description,
  versions.workload,
  versions.workload_hours,
  versions.inherent_requirements,
  versions.prescribed_texts,
  case
    when exists (
      select 1
      from public.course_offerings as offerings
      where offerings.course_version_id = versions.id
    ) then 'offered'
    else 'unknown'
  end,
  versions.source_updated_at,
  versions.created_at
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_years as course_years
  on course_years.course_id = versions.course_id
 and course_years.academic_year_id = academic_years.id
join public.catalogue_source_documents as catalogue_source_documents
  on catalogue_source_documents.id = versions.source_document_id
join public.catalogue_sources as catalogue_sources
  on catalogue_sources.id = catalogue_source_documents.source_id
join public.course_sources as course_sources
  on course_sources.base_url = catalogue_sources.base_url
 and course_sources.kind = case
   when catalogue_sources.kind = 'anu_programs_courses_html'
     then 'anu_programs_courses'
   else catalogue_sources.kind
 end
join public.course_source_documents as course_source_documents
  on course_source_documents.source_id = course_sources.id
 and course_source_documents.academic_year_id = academic_years.id
 and course_source_documents.document_kind = 'course_page'
 and course_source_documents.external_key = catalogue_source_documents.external_key
 and course_source_documents.content_sha256 = catalogue_source_documents.content_sha256
on conflict (course_year_id, snapshot_number) do nothing;

update public.course_offerings as offerings
set course_snapshot_id = snapshots.id
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_years as course_years
  on course_years.course_id = versions.course_id
 and course_years.academic_year_id = academic_years.id
join public.course_snapshots as snapshots
  on snapshots.course_year_id = course_years.id
 and snapshots.snapshot_number = 1
where offerings.course_version_id = versions.id
  and offerings.course_snapshot_id is distinct from snapshots.id;

update public.course_learning_outcomes as outcomes
set course_snapshot_id = snapshots.id
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_years as course_years
  on course_years.course_id = versions.course_id
 and course_years.academic_year_id = academic_years.id
join public.course_snapshots as snapshots
  on snapshots.course_year_id = course_years.id
 and snapshots.snapshot_number = 1
where outcomes.course_version_id = versions.id
  and outcomes.course_snapshot_id is distinct from snapshots.id;

update public.course_assessment_items as assessment_items
set course_snapshot_id = snapshots.id
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_years as course_years
  on course_years.course_id = versions.course_id
 and course_years.academic_year_id = academic_years.id
join public.course_snapshots as snapshots
  on snapshots.course_year_id = course_years.id
 and snapshots.snapshot_number = 1
where assessment_items.course_version_id = versions.id
  and assessment_items.course_snapshot_id is distinct from snapshots.id;

update public.course_rules as rules
set course_snapshot_id = snapshots.id
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_years as course_years
  on course_years.course_id = versions.course_id
 and course_years.academic_year_id = academic_years.id
join public.course_snapshots as snapshots
  on snapshots.course_year_id = course_years.id
 and snapshots.snapshot_number = 1
where rules.course_version_id = versions.id
  and rules.course_snapshot_id is distinct from snapshots.id;

insert into public.course_fees (
  course_snapshot_id,
  position,
  fee_year,
  audience,
  fee_type,
  amount,
  currency,
  basis,
  student_contribution_band,
  source_label
)
select
  snapshots.id,
  1,
  versions.fee_year,
  case
    when versions.student_contribution_band is not null
      then 'commonwealth_supported'
    else 'domestic'
  end,
  case
    when versions.student_contribution_band is not null
      then 'student_contribution'
    else 'indicative'
  end,
  versions.fee_domestic,
  'AUD',
  'course',
  versions.student_contribution_band,
  'Domestic fee'
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_years as course_years
  on course_years.course_id = versions.course_id
 and course_years.academic_year_id = academic_years.id
join public.course_snapshots as snapshots
  on snapshots.course_year_id = course_years.id
 and snapshots.snapshot_number = 1
where (
  versions.fee_domestic is not null
  or versions.student_contribution_band is not null
)
and not exists (
  select 1
  from public.course_fees as existing_fees
  where existing_fees.course_snapshot_id = snapshots.id
    and existing_fees.position = 1
)
on conflict (course_snapshot_id, position) do nothing;

insert into public.course_fees (
  course_snapshot_id,
  position,
  fee_year,
  audience,
  fee_type,
  amount,
  currency,
  basis,
  source_label
)
select
  snapshots.id,
  2,
  versions.fee_year,
  'international',
  'tuition',
  versions.fee_international,
  'AUD',
  'course',
  'International fee'
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_years as course_years
  on course_years.course_id = versions.course_id
 and course_years.academic_year_id = academic_years.id
join public.course_snapshots as snapshots
  on snapshots.course_year_id = course_years.id
 and snapshots.snapshot_number = 1
where versions.fee_international is not null
  and not exists (
    select 1
    from public.course_fees as existing_fees
    where existing_fees.course_snapshot_id = snapshots.id
      and existing_fees.position = 2
  )
on conflict (course_snapshot_id, position) do nothing;

insert into public.course_assessment_outcomes (
  course_snapshot_id,
  assessment_item_id,
  learning_outcome_id
)
select distinct
  assessment_items.course_snapshot_id,
  assessment_items.id,
  learning_outcomes.id
from public.course_assessment_items as assessment_items
cross join lateral unnest(assessment_items.learning_outcomes) as outcome_position
join public.course_learning_outcomes as learning_outcomes
  on learning_outcomes.course_snapshot_id = assessment_items.course_snapshot_id
 and learning_outcomes.position = outcome_position
where assessment_items.course_snapshot_id is not null
  and not exists (
    select 1
    from public.course_assessment_outcomes as existing_outcomes
    where existing_outcomes.assessment_item_id = assessment_items.id
      and existing_outcomes.learning_outcome_id = learning_outcomes.id
  )
on conflict (assessment_item_id, learning_outcome_id) do nothing;

update public.course_snapshots
set sealed_at = greatest(statement_timestamp(), created_at)
where origin = 'legacy_backfill'
  and sealed_at is null;

-- Attach a saved snapshot only after all compatibility child rows exist. Once
-- a snapshot is referenced by either pointer, new snapshot-native child rows
-- are rejected by the sealing triggers installed below.
update public.course_years as course_years
set
  draft_snapshot_id = case
    when course_years.lifecycle_status = 'active'
      and not (
        versions.publication_status = 'published'
        and catalogue_years.status = 'published'
      )
      then snapshots.id
    else null
  end,
  published_snapshot_id = case
    when versions.publication_status = 'published'
      and catalogue_years.status = 'published'
      and course_years.lifecycle_status = 'active'
      then snapshots.id
    else null
  end
from public.course_versions as versions
join public.catalogue_years as catalogue_years
  on catalogue_years.id = versions.catalogue_year_id
join public.academic_years as academic_years
  on academic_years.year = catalogue_years.year
join public.course_snapshots as snapshots
  on snapshots.academic_year_id = academic_years.id
 and snapshots.snapshot_number = 1
where course_years.course_id = versions.course_id
  and course_years.academic_year_id = academic_years.id
  and snapshots.course_year_id = course_years.id
  and (
    course_years.draft_snapshot_id is distinct from case
      when course_years.lifecycle_status = 'active'
        and not (
          versions.publication_status = 'published'
          and catalogue_years.status = 'published'
        )
        then snapshots.id
      else null
    end
    or course_years.published_snapshot_id is distinct from case
      when versions.publication_status = 'published'
        and catalogue_years.status = 'published'
        and course_years.lifecycle_status = 'active'
        then snapshots.id
      else null
    end
  );

  select count(*) into legacy_version_count from public.course_versions;
  select count(*) into course_year_count
  from public.course_versions as versions
  join public.catalogue_years as catalogue_years
    on catalogue_years.id = versions.catalogue_year_id
  join public.academic_years as academic_years
    on academic_years.year = catalogue_years.year
  join public.course_years as course_years
    on course_years.course_id = versions.course_id
   and course_years.academic_year_id = academic_years.id;
  select count(*) into snapshot_count
  from public.course_versions as versions
  join public.catalogue_years as catalogue_years
    on catalogue_years.id = versions.catalogue_year_id
  join public.academic_years as academic_years
    on academic_years.year = catalogue_years.year
  join public.course_years as course_years
    on course_years.course_id = versions.course_id
   and course_years.academic_year_id = academic_years.id
  join public.course_snapshots as snapshots
    on snapshots.course_year_id = course_years.id
   and snapshots.snapshot_number = 1
   and snapshots.origin = 'legacy_backfill';
  select count(*) into legacy_directory_count
  from public.catalogue_directory_courses;
  select count(*) into directory_entry_count
  from public.catalogue_directory_courses as legacy_entries
  join public.catalogue_years as catalogue_years
    on catalogue_years.id = legacy_entries.catalogue_year_id
  join public.academic_years as academic_years
    on academic_years.year = catalogue_years.year
  join public.course_directory_entries as directory_entries
    on directory_entries.academic_year_id = academic_years.id
   and directory_entries.code = legacy_entries.code;

  if course_year_count <> legacy_version_count then
    raise exception
      'course_years backfill mismatch: expected %, found %',
      legacy_version_count,
      course_year_count;
  end if;

  if snapshot_count <> legacy_version_count then
    raise exception
      'course_snapshots backfill mismatch: expected %, found %',
      legacy_version_count,
      snapshot_count;
  end if;

  if directory_entry_count <> legacy_directory_count then
    raise exception
      'course_directory_entries backfill mismatch: expected %, found %',
      legacy_directory_count,
      directory_entry_count;
  end if;

  if exists (
    select 1 from public.course_offerings where course_snapshot_id is null
  ) then
    raise exception 'course_offerings snapshot backfill left unmapped rows';
  end if;

  if exists (
    select 1 from public.course_learning_outcomes where course_snapshot_id is null
  ) then
    raise exception 'course_learning_outcomes snapshot backfill left unmapped rows';
  end if;

  if exists (
    select 1 from public.course_assessment_items where course_snapshot_id is null
  ) then
    raise exception 'course_assessment_items snapshot backfill left unmapped rows';
  end if;

  if exists (
    select 1 from public.course_rules where course_snapshot_id is null
  ) then
    raise exception 'course_rules snapshot backfill left unmapped rows';
  end if;
end;
$function$;

revoke all on function private.backfill_course_snapshot_foundation()
from public, anon, authenticated;

select private.backfill_course_snapshot_foundation();

create or replace function private.reject_sealed_course_snapshot_child_insert()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  snapshot_is_sealed boolean;
begin
  -- Lock the owning course year so a child insert and pointer publication
  -- cannot race. Whichever operation obtains the lock first completes before
  -- the other checks or changes the sealed state.
  select course_snapshots.sealed_at is not null
  into snapshot_is_sealed
  from public.course_snapshots
  join public.course_years
    on course_years.id = course_snapshots.course_year_id
  where course_snapshots.id = new.course_snapshot_id
  for update of course_years;

  if coalesce(snapshot_is_sealed, false) then
    raise exception
      'course snapshot % is sealed; create a new snapshot instead',
      new.course_snapshot_id
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

revoke all on function private.reject_sealed_course_snapshot_child_insert()
from public, anon, authenticated;

create trigger course_fees_reject_sealed_insert
before insert on public.course_fees
for each row execute function private.reject_sealed_course_snapshot_child_insert();

create trigger course_areas_of_interest_reject_sealed_insert
before insert on public.course_areas_of_interest
for each row execute function private.reject_sealed_course_snapshot_child_insert();

create trigger course_related_courses_reject_sealed_insert
before insert on public.course_related_courses
for each row execute function private.reject_sealed_course_snapshot_child_insert();

create trigger course_assessment_outcomes_reject_sealed_insert
before insert on public.course_assessment_outcomes
for each row execute function private.reject_sealed_course_snapshot_child_insert();

create trigger course_snapshot_field_evidence_reject_sealed_insert
before insert on public.course_snapshot_field_evidence
for each row execute function private.reject_sealed_course_snapshot_child_insert();

-- New course-specific records are protected explicitly. Source documents,
-- snapshots and their new child rows are append-only through the Data API.
alter table public.academic_years enable row level security;
alter table public.course_sources enable row level security;
alter table public.course_source_documents enable row level security;
alter table public.course_directory_entries enable row level security;
alter table public.course_years enable row level security;
alter table public.course_snapshots enable row level security;
alter table public.course_fees enable row level security;
alter table public.course_areas_of_interest enable row level security;
alter table public.course_related_courses enable row level security;
alter table public.course_assessment_outcomes enable row level security;
alter table public.course_snapshot_field_evidence enable row level security;

create policy academic_years_read
on public.academic_years
for select
to anon, authenticated
using (true);

create policy academic_years_import_admin_all
on public.academic_years
for all
to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));

create policy course_sources_import_admin_all
on public.course_sources
for all
to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));

create policy course_source_documents_import_admin_read
on public.course_source_documents
for select
to authenticated
using ((select private.has_permission('imports.manage')));

create policy course_source_documents_import_admin_insert
on public.course_source_documents
for insert
to authenticated
with check ((select private.has_permission('imports.manage')));

create policy course_directory_entries_import_admin_all
on public.course_directory_entries
for all
to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));

create policy course_years_read_published
on public.course_years
for select
to anon, authenticated
using (
  lifecycle_status = 'active'
  and published_snapshot_id is not null
);

create policy course_years_admin_all
on public.course_years
for all
to authenticated
using (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
)
with check (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);

create policy course_snapshots_read_published
on public.course_snapshots
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_years as course_years
    where course_years.id = course_snapshots.course_year_id
      and course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = course_snapshots.id
  )
);

create policy course_snapshots_admin_read
on public.course_snapshots
for select
to authenticated
using (
  (select private.has_permission('catalogue.read_drafts'))
  or (select private.has_permission('imports.manage'))
);

create policy course_snapshots_admin_insert
on public.course_snapshots
for insert
to authenticated
with check (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);

create policy courses_read_snapshot_published
on public.courses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_years as course_years
    where course_years.course_id = courses.id
      and course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id is not null
  )
);

do $policy$
declare
  table_name text;
begin
  foreach table_name in array array[
    'course_fees',
    'course_areas_of_interest',
    'course_related_courses'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (exists (select 1 from public.course_snapshots as snapshots join public.course_years as course_years on course_years.id = snapshots.course_year_id where snapshots.id = %I.course_snapshot_id and course_years.lifecycle_status = ''active'' and course_years.published_snapshot_id = snapshots.id))',
      table_name || '_read_published',
      table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.has_permission(''catalogue.read_drafts'')) or (select private.has_permission(''imports.manage'')))',
      table_name || '_admin_read',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.has_permission(''catalogue.write'')) or (select private.has_permission(''imports.manage'')))',
      table_name || '_admin_insert',
      table_name
    );
  end loop;
end;
$policy$;

create policy course_assessment_outcomes_read_published
on public.course_assessment_outcomes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_assessment_items as assessment_items
    join public.course_snapshots as snapshots
      on snapshots.id = assessment_items.course_snapshot_id
    join public.course_years as course_years
      on course_years.id = snapshots.course_year_id
    where assessment_items.id = course_assessment_outcomes.assessment_item_id
      and course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = snapshots.id
  )
);

create policy course_assessment_outcomes_admin_read
on public.course_assessment_outcomes
for select
to authenticated
using (
  (select private.has_permission('catalogue.read_drafts'))
  or (select private.has_permission('imports.manage'))
);

create policy course_assessment_outcomes_admin_insert
on public.course_assessment_outcomes
for insert
to authenticated
with check (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);

create policy course_snapshot_field_evidence_admin_read
on public.course_snapshot_field_evidence
for select
to authenticated
using (
  (select private.has_permission('catalogue.read_drafts'))
  or (select private.has_permission('imports.manage'))
);

create policy course_snapshot_field_evidence_admin_insert
on public.course_snapshot_field_evidence
for insert
to authenticated
with check (
  (select private.has_permission('catalogue.write'))
  or (select private.has_permission('imports.manage'))
);

create policy course_offerings_read_snapshot_published
on public.course_offerings
for select
to anon, authenticated
using (
  course_snapshot_id is not null
  and exists (
    select 1
    from public.course_snapshots as snapshots
    join public.course_years as course_years
      on course_years.id = snapshots.course_year_id
    where snapshots.id = course_offerings.course_snapshot_id
      and course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = snapshots.id
  )
);

create policy offering_sessions_read_snapshot_published
on public.offering_sessions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_offerings as offerings
    join public.course_snapshots as snapshots
      on snapshots.id = offerings.course_snapshot_id
    join public.course_years as course_years
      on course_years.id = snapshots.course_year_id
    where offerings.id = offering_sessions.course_offering_id
      and course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = snapshots.id
  )
);

create policy course_learning_outcomes_read_snapshot_published
on public.course_learning_outcomes
for select
to anon, authenticated
using (
  course_snapshot_id is not null
  and exists (
    select 1
    from public.course_years as course_years
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = course_learning_outcomes.course_snapshot_id
  )
);

create policy course_assessment_items_read_snapshot_published
on public.course_assessment_items
for select
to anon, authenticated
using (
  course_snapshot_id is not null
  and exists (
    select 1
    from public.course_years as course_years
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = course_assessment_items.course_snapshot_id
  )
);

create policy course_rules_read_snapshot_published
on public.course_rules
for select
to anon, authenticated
using (
  course_snapshot_id is not null
  and exists (
    select 1
    from public.course_years as course_years
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = course_rules.course_snapshot_id
  )
);

create policy course_rule_groups_read_snapshot_published
on public.course_rule_groups
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_rules as rules
    join public.course_years as course_years
      on course_years.published_snapshot_id = rules.course_snapshot_id
    where rules.id = course_rule_groups.course_rule_id
      and course_years.lifecycle_status = 'active'
  )
);

create policy course_rule_conditions_read_snapshot_published
on public.course_rule_conditions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_rules as rules
    join public.course_years as course_years
      on course_years.published_snapshot_id = rules.course_snapshot_id
    where rules.id = course_rule_conditions.course_rule_id
      and course_years.lifecycle_status = 'active'
  )
);

create policy course_rule_course_references_read_snapshot_published
on public.course_rule_course_references
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_rules as rules
    join public.course_years as course_years
      on course_years.published_snapshot_id = rules.course_snapshot_id
    where rules.id = course_rule_course_references.course_rule_id
      and course_years.lifecycle_status = 'active'
  )
);

grant select on table public.academic_years to anon, authenticated;

grant insert, update on table public.academic_years to authenticated;

grant select, insert, update on table
  public.course_sources,
  public.course_directory_entries,
  public.course_years
to authenticated;

grant select, insert on table
  public.course_source_documents,
  public.course_snapshots,
  public.course_fees,
  public.course_areas_of_interest,
  public.course_related_courses,
  public.course_assessment_outcomes,
  public.course_snapshot_field_evidence
to authenticated;

grant select on table
  public.course_years,
  public.course_snapshots,
  public.course_fees,
  public.course_areas_of_interest,
  public.course_related_courses,
  public.course_assessment_outcomes
to anon;

grant usage, select on sequence
  public.academic_years_id_seq,
  public.course_sources_id_seq,
  public.course_source_documents_id_seq,
  public.course_directory_entries_id_seq,
  public.course_years_id_seq,
  public.course_snapshots_id_seq,
  public.course_fees_id_seq,
  public.course_areas_of_interest_id_seq,
  public.course_related_courses_id_seq,
  public.course_snapshot_field_evidence_id_seq
to authenticated;

comment on table public.academic_years is
  'Course import year registry. Rows do not imply that detailed courses have been imported.';

comment on table public.course_directory_entries is
  'Lightweight ANU course directory entries used for administrator search and selection.';

comment on table public.courses is
  'Stable course identity, independent of academic year and import snapshot.';

comment on table public.course_years is
  'A stable course in one academic year, with separate draft and published snapshot pointers.';

comment on table public.course_snapshots is
  'Immutable exact course details saved by an import, manual edit or compatibility backfill.';

comment on column public.course_years.draft_snapshot_id is
  'The candidate snapshot administrators are currently reviewing. Imports may change only this pointer.';

comment on column public.course_years.published_snapshot_id is
  'The immutable snapshot currently visible to students. Publication changes this pointer atomically.';

comment on column public.course_snapshots.sealed_at is
  'Permanent seal applied before a snapshot becomes draft, published or an archived compatibility record.';

comment on table public.course_source_documents is
  'Immutable fetched course source metadata. Bodies are stored in a private content-addressed bucket.';

comment on table public.course_snapshot_field_evidence is
  'Field-level extraction evidence, confidence and verification metadata. It is not canonical course data.';
