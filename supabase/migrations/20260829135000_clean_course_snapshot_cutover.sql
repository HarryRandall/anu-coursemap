-- Remove the disposable compatibility catalogue and establish the course
-- snapshot schema as the only course data model. Coursemap is still in
-- development, so no legacy course, plan or programme data is retained.

-- Keep this list explicit. It clears only course, plan and disposable
-- programme rows while preserving users, roles, permissions, academic years,
-- catalogue source infrastructure, academic periods, calendar events, rooms,
-- maps and unrelated application data.
truncate table
  public.approval_events,
  public.approval_requests,
  public.course_attempts,
  public.plan_items,
  public.plan_structures,
  public.plans,
  public.requirement_conditions,
  public.requirement_groups,
  public.academic_structure_relationships,
  public.academic_structure_versions,
  public.academic_structures,
  public.catalogue_directory_programmes,
  public.catalogue_directory_courses,
  public.catalogue_import_diagnostics,
  public.catalogue_review_items,
  public.catalogue_import_items,
  public.catalogue_import_runs,
  public.course_review_items,
  public.course_extractions,
  public.course_import_artifacts,
  public.course_import_stages,
  public.course_import_targets,
  public.course_import_runs,
  public.course_assessment_outcomes,
  public.course_rule_condition_courses,
  public.course_rule_course_references,
  public.course_rule_conditions,
  public.course_rule_groups,
  public.course_rules,
  public.offering_sessions,
  public.course_offerings,
  public.course_assessment_items,
  public.course_learning_outcomes,
  public.course_attributes,
  public.course_unit_options,
  public.course_fees,
  public.course_areas_of_interest,
  public.course_related_courses,
  public.course_snapshot_field_evidence,
  public.course_years,
  public.course_snapshots,
  public.course_directory_entries,
  public.course_source_pages,
  public.course_versions,
  public.courses
restart identity;

-- Generic catalogue import history is disposable, but calendar rows are
-- retained and still point at their immutable source documents. Remove every
-- unreferenced generic document after its course/programme/import dependants
-- have been cleared, leaving only documents required by the shared calendar.
delete from public.catalogue_source_documents as documents
where not exists (
    select 1
    from public.university_calendar_events as events
    where events.source_document_id = documents.id
  );

-- The retained generic catalogue pipeline now serves only programme and
-- calendar data. Course pages, directories and import review state use the
-- dedicated course_* tables introduced by the two preceding migrations.
alter table public.catalogue_source_documents
  drop constraint catalogue_source_documents_entity_kind_check,
  add constraint catalogue_source_documents_entity_kind_check check (
    entity_kind in ('structure', 'programme_directory', 'calendar')
  );

alter table public.catalogue_import_items
  alter column target_kind set not null,
  add constraint catalogue_import_items_target_kind_check check (
    target_kind in ('structure', 'programme_directory', 'university_calendar')
  );

alter table public.catalogue_review_items
  drop constraint catalogue_review_items_target_kind_not_blank_check,
  add constraint catalogue_review_items_target_kind_check check (
    target_kind in ('structure', 'programme_directory', 'university_calendar')
  );

create or replace function public.catalogue_change_issue_codes()
returns text[]
language sql
immutable
set search_path = ''
as $function$
  select array[
    'STRUCTURED_RULE_SOURCE_REMOVAL_PRESERVED',
    'STRUCTURED_RULE_PRESERVED'
  ]::text[]
$function$;

-- Split course administration from the generic programme/calendar catalogue
-- without changing existing role behaviour. Catalogue grants stay in place
-- for the retained generic pipeline and are copied to the new course keys.
insert into private.app_permissions (key, name, description, category)
values
  (
    'courses.read_drafts',
    'View draft courses',
    'View course records before publication.',
    'courses'
  ),
  (
    'courses.write',
    'Edit courses',
    'Create, edit, publish and archive course records.',
    'courses'
  )
on conflict (key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category;

insert into private.role_permissions (role_id, permission_id)
select
  existing_grants.role_id,
  course_permissions.id
from private.role_permissions as existing_grants
join private.app_permissions as catalogue_permissions
  on catalogue_permissions.id = existing_grants.permission_id
join (
  values
    ('catalogue.read_drafts'::text, 'courses.read_drafts'::text),
    ('catalogue.write'::text, 'courses.write'::text)
) as permission_map(catalogue_key, course_key)
  on permission_map.catalogue_key = catalogue_permissions.key
join private.app_permissions as course_permissions
  on course_permissions.key = permission_map.course_key
on conflict (role_id, permission_id) do nothing;

-- The course importer has one deliberately bounded year window. Remove any
-- years inferred from the disposable legacy catalogue, create the complete
-- agreed range and clear inherited source-availability claims.
delete from public.academic_years
where year not between 2020 and 2030;

insert into public.academic_years (
  year,
  is_import_enabled,
  source_availability,
  availability_checked_at,
  directory_refreshed_at,
  availability_note
)
select
  import_year,
  true,
  'unknown',
  null,
  null,
  null
from generate_series(2020, 2030) as years(import_year)
on conflict (year) do update
set is_import_enabled = true,
    source_availability = 'unknown',
    availability_checked_at = null,
    directory_refreshed_at = null,
    availability_note = null,
    updated_at = now();

-- Remove APIs that select an implicit latest catalogue year or write the old
-- course_versions model. Snapshot-native replacements are created below.
drop function if exists public.published_course_detail(text);
drop function if exists public.published_course_requisite_graph(text);
drop function if exists public.publish_catalogue_course_version(text, smallint);
drop function if exists public.add_current_user_plan_item(text, smallint, text);
drop function if exists public.add_current_user_plan_item(
  text,
  smallint,
  smallint,
  text
);
drop function if exists public.record_current_user_course_attempt(uuid, text, numeric);
drop function if exists public.save_current_user_primary_plan(
  text,
  text,
  smallint,
  smallint,
  text,
  text,
  text
);
drop function if exists private.backfill_course_snapshot_foundation();

-- Rebuild the complete course policy family after the old tables and columns
-- are removed. Dropping policies first also releases stored dependencies on
-- course_versions.
do $block$
declare
  selected_policy record;
begin
  for selected_policy in
    select
      namespaces.nspname as schema_name,
      relations.relname as table_name,
      policies.polname as policy_name
    from pg_catalog.pg_policy as policies
    join pg_catalog.pg_class as relations on relations.oid = policies.polrelid
    join pg_catalog.pg_namespace as namespaces
      on namespaces.oid = relations.relnamespace
    where namespaces.nspname = 'public'
      and relations.relname in (
        'courses',
        'course_versions',
        'course_years',
        'course_snapshots',
        'course_fees',
        'course_areas_of_interest',
        'course_related_courses',
        'course_attributes',
        'course_unit_options',
        'course_offerings',
        'offering_sessions',
        'course_learning_outcomes',
        'course_assessment_items',
        'course_assessment_outcomes',
        'course_rules',
        'course_rule_groups',
        'course_rule_conditions',
        'course_rule_condition_courses',
        'course_rule_course_references',
        'course_snapshot_field_evidence'
      )
  loop
    execute format(
      'drop policy %I on %I.%I',
      selected_policy.policy_name,
      selected_policy.schema_name,
      selected_policy.table_name
    );
  end loop;
end;
$block$;

-- Remove the legacy half of the dual-lineage rich course tables. The native
-- path keeps the exact imported academic year and immutable source document.
alter table public.offering_sessions
  drop constraint if exists offering_sessions_offering_year_fkey,
  drop column catalogue_year_id,
  drop column source_document_id;

alter table public.course_offerings
  drop column course_version_id,
  drop column catalogue_year_id,
  drop column source_document_id,
  drop column status;

alter table public.course_learning_outcomes
  drop column course_version_id;

alter table public.course_assessment_items
  drop column course_version_id;

alter table public.course_rules
  drop column course_version_id,
  drop column catalogue_year_id,
  drop column source_document_id;

-- Partial compatibility indexes become ordinary native constraints now that
-- every rich row must belong to exactly one snapshot.
drop index if exists public.course_offerings_course_snapshot_id_idx;
drop index if exists public.offering_sessions_snapshot_period_class_idx;
drop index if exists public.offering_sessions_snapshot_position_idx;
drop index if exists public.course_learning_outcomes_snapshot_position_idx;
drop index if exists public.course_assessment_items_snapshot_position_idx;
drop index if exists public.course_rules_snapshot_kind_idx;

alter table public.course_offerings
  alter column course_snapshot_id set not null,
  alter column academic_year_id set not null,
  alter column course_source_page_id set not null,
  add constraint course_offerings_course_snapshot_unique
    unique (course_snapshot_id);

alter table public.offering_sessions
  alter column course_snapshot_id set not null,
  alter column academic_year_id set not null,
  alter column course_source_page_id set not null,
  alter column position set not null,
  alter column academic_period_code set not null,
  alter column academic_period_name set not null,
  alter column source_text set not null,
  add constraint offering_sessions_snapshot_period_class_unique
    unique nulls not distinct (
      course_snapshot_id,
      academic_period_code,
      class_number
    ),
  add constraint offering_sessions_snapshot_position_unique
    unique (course_snapshot_id, position);

alter table public.course_learning_outcomes
  alter column course_snapshot_id set not null,
  add constraint course_learning_outcomes_snapshot_position_unique
    unique (course_snapshot_id, position);

alter table public.course_assessment_items
  alter column course_snapshot_id set not null,
  add constraint course_assessment_items_snapshot_position_unique
    unique (course_snapshot_id, position);

alter table public.course_rules
  alter column course_snapshot_id set not null,
  alter column academic_year_id set not null,
  alter column course_source_page_id set not null,
  add constraint course_rules_snapshot_kind_unique
    unique (course_snapshot_id, rule_kind);

alter table public.course_rule_groups
  alter column course_snapshot_id set not null;

alter table public.course_rule_conditions
  alter column course_snapshot_id set not null,
  alter column hardness set not null,
  add constraint course_rule_conditions_requirement_mode_required_check check (
    (condition_kind = 'course' and course_requirement_mode is not null)
    or (condition_kind <> 'course' and course_requirement_mode is null)
  );

alter table public.course_rule_course_references
  alter column course_snapshot_id set not null;

alter table public.course_rule_condition_courses
  alter column referenced_course_id set not null;

alter table public.course_related_courses
  alter column related_course_id set not null;

-- Legacy snapshots and evidence are no longer valid states.
alter table public.course_snapshots
  drop constraint course_snapshots_origin_check,
  drop constraint course_snapshots_projection_sha256_required_check,
  alter column projection_sha256 set not null,
  alter column source_page_id set not null,
  alter column level set not null,
  alter column subject_code set not null,
  add constraint course_snapshots_origin_check check (
    origin in ('import', 'manual_edit')
  );

alter table public.course_snapshot_field_evidence
  drop constraint course_snapshot_field_evidence_verification_status_check,
  alter column source_page_id set not null,
  add constraint course_snapshot_field_evidence_verification_status_check check (
    verification_status in (
      'model_only',
      'source_matched',
      'deterministic',
      'human_confirmed'
    )
  );

-- An attempt records the exact published snapshot used for its units and
-- rules. Existing rows were cleared above, so the new lineage is immediately
-- strict and needs no compatibility default.
alter table public.course_attempts
  add column course_snapshot_id bigint not null,
  add constraint course_attempts_course_snapshot_id_fkey
    foreign key (course_snapshot_id)
    references public.course_snapshots (id),
  add constraint course_attempts_owner_snapshot_period_unique
    unique (owner_id, course_snapshot_id, academic_period_id);

create index course_attempts_course_snapshot_id_idx
  on public.course_attempts (course_snapshot_id);

-- A plan item always records the explicit course academic year, including
-- while it is unscheduled. If it is placed in a calendar year, the composite
-- foreign key prevents that display year drifting from its course year.
alter table public.academic_years
  add constraint academic_years_id_year_unique unique (id, year);

alter table public.plan_items
  add column academic_year_id bigint not null,
  add constraint plan_items_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years (id),
  add constraint plan_items_course_academic_year_fkey
    foreign key (course_id, academic_year_id)
    references public.course_years (course_id, academic_year_id),
  add constraint plan_items_academic_year_calendar_year_fkey
    foreign key (academic_year_id, planned_calendar_year)
    references public.academic_years (id, year);

create index plan_items_academic_year_id_idx
  on public.plan_items (academic_year_id);

-- Direct owner writes are still subject to RLS, but must not bypass the exact
-- snapshot lineage recorded by the planner RPC. The attempt's course and
-- academic period must describe the same course/year as its snapshot.
create or replace function private.enforce_course_attempt_snapshot_lineage()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  snapshot_academic_year smallint;
  period_calendar_year smallint;
begin
  select academic_years.year
  into snapshot_academic_year
  from public.course_snapshots
  join public.course_years
    on course_years.id = course_snapshots.course_year_id
  join public.academic_years
    on academic_years.id = course_snapshots.academic_year_id
  where course_snapshots.id = new.course_snapshot_id
    and course_years.course_id = new.course_id;

  if snapshot_academic_year is null then
    raise exception
      'course attempt snapshot does not belong to the selected course'
      using errcode = '23503';
  end if;

  select academic_periods.calendar_year
  into period_calendar_year
  from public.academic_periods
  where academic_periods.id = new.academic_period_id;

  if period_calendar_year is not null
    and period_calendar_year <> snapshot_academic_year
  then
    raise exception
      'course attempt period year does not match the snapshot academic year'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_course_attempt_snapshot_lineage()
from public, anon, authenticated;

create trigger course_attempts_enforce_snapshot_lineage
before insert or update of course_id, course_snapshot_id, academic_period_id
on public.course_attempts
for each row execute function private.enforce_course_attempt_snapshot_lineage();

drop table public.course_versions;
drop table public.catalogue_directory_courses;

-- Rich snapshot children are immutable once their snapshot is sealed. This
-- trigger no longer contains a legacy linkage exception.
create or replace function private.guard_snapshot_rich_child_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  selected_snapshot_id bigint;
  snapshot_is_sealed boolean;
begin
  selected_snapshot_id := case
    when tg_op = 'DELETE' then old.course_snapshot_id
    else new.course_snapshot_id
  end;

  if selected_snapshot_id is null then
    raise exception '% requires snapshot lineage', tg_table_name
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
    and old.course_snapshot_id is distinct from new.course_snapshot_id
  then
    raise exception '% snapshot lineage is immutable', tg_table_name
      using errcode = '55000';
  end if;

  if tg_table_name = 'offering_sessions' then
    if tg_op = 'UPDATE'
      and old.course_offering_id is distinct from new.course_offering_id
    then
      raise exception 'offering session lineage is immutable'
        using errcode = '55000';
    end if;

    if tg_op <> 'DELETE' then
      if new.position is null
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
  elsif tg_table_name in (
    'course_rule_groups',
    'course_rule_conditions',
    'course_rule_course_references'
  ) then
    if tg_op = 'UPDATE'
      and old.course_rule_id is distinct from new.course_rule_id
    then
      raise exception 'course rule child lineage is immutable'
        using errcode = '55000';
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

-- Programme imports may refer only to course identities that already have a
-- year record. This prevents a future programme import from recursively
-- creating unreviewed course content as a side effect.
create or replace function private.require_imported_programme_course_reference()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.condition_kind = 'course'
    and new.course_id is not null
    and not exists (
      select 1
      from public.course_years
      where course_years.course_id = new.course_id
    )
  then
    raise exception
      'programme requirements may reference only an explicitly imported course'
      using errcode = '23503';
  end if;

  return new;
end;
$function$;

revoke all on function private.require_imported_programme_course_reference()
from public, anon, authenticated;

create trigger requirement_conditions_require_imported_course
before insert or update of course_id, condition_kind
on public.requirement_conditions
for each row execute function private.require_imported_programme_course_reference();

-- Public identities include both published courses and placeholder identities
-- named by a published requisite. A placeholder deliberately has no
-- course_year row until an administrator chooses to import that course.
create policy courses_read_published_or_referenced
on public.courses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_years
    where course_years.course_id = courses.id
      and course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id is not null
  )
  or exists (
    select 1
    from public.course_rule_conditions as conditions
    join public.course_rules as rules on rules.id = conditions.course_rule_id
    join public.course_years
      on course_years.published_snapshot_id = rules.course_snapshot_id
    where conditions.required_course_id = courses.id
      and course_years.lifecycle_status = 'active'
  )
  or exists (
    select 1
    from public.course_rule_condition_courses as members
    join public.course_rule_conditions as conditions
      on conditions.id = members.condition_id
    join public.course_rules as rules on rules.id = conditions.course_rule_id
    join public.course_years
      on course_years.published_snapshot_id = rules.course_snapshot_id
    where members.referenced_course_id = courses.id
      and course_years.lifecycle_status = 'active'
  )
  or exists (
    select 1
    from public.course_rule_course_references as rule_references
    join public.course_rules as rules on rules.id = rule_references.course_rule_id
    join public.course_years
      on course_years.published_snapshot_id = rules.course_snapshot_id
    where rule_references.referenced_course_id = courses.id
      and course_years.lifecycle_status = 'active'
  )
);

create policy courses_admin_all
on public.courses
for all
to authenticated
using (
  (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
)
with check (
  (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
);

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
  (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
)
with check (
  (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
);

-- Every public snapshot child uses the same exact publication pointer. This
-- prevents a superseded or draft snapshot leaking through the Data API.
create policy course_snapshots_read_published
on public.course_snapshots
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_years
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id = course_snapshots.id
  )
);

-- Attempts pin historical snapshots. Authenticated owners retain read access
-- after a later snapshot is published for the same course/year.
create policy course_snapshots_read_own_attempts
on public.course_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.course_attempts
    where course_attempts.course_snapshot_id = course_snapshots.id
      and course_attempts.owner_id = (select auth.uid())
  )
);

create policy course_snapshots_admin_read
on public.course_snapshots
for select
to authenticated
using (
  (select private.has_permission('admin.access'))
  or (select private.has_permission('courses.read_drafts'))
  or (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
);

create policy course_snapshots_admin_insert
on public.course_snapshots
for insert
to authenticated
with check (
  (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
);

do $block$
declare
  table_name text;
begin
  foreach table_name in array array[
    'course_fees',
    'course_areas_of_interest',
    'course_related_courses',
    'course_attributes',
    'course_unit_options',
    'course_offerings',
    'offering_sessions',
    'course_learning_outcomes',
    'course_assessment_items',
    'course_assessment_outcomes',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions',
    'course_rule_condition_courses',
    'course_rule_course_references'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated '
      || 'using (exists ('
      || 'select 1 from public.course_years '
      || 'where course_years.lifecycle_status = %L '
      || 'and course_years.published_snapshot_id = %I.course_snapshot_id'
      || '))',
      table_name || '_read_published',
      table_name,
      'active',
      table_name
    );

    execute format(
      'create policy %I on public.%I for select to authenticated '
      || 'using ((select private.has_permission(%L)) '
      || 'or (select private.has_permission(%L)) '
      || 'or (select private.has_permission(%L)))',
      table_name || '_admin_read',
      table_name,
      'courses.read_drafts',
      'courses.write',
      'imports.manage'
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated '
      || 'with check ((select private.has_permission(%L)) '
      || 'or (select private.has_permission(%L)))',
      table_name || '_admin_insert',
      table_name,
      'courses.write',
      'imports.manage'
    );
  end loop;
end;
$block$;

create policy course_snapshot_field_evidence_admin_read
on public.course_snapshot_field_evidence
for select
to authenticated
using (
  (select private.has_permission('courses.read_drafts'))
  or (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
);

create policy course_snapshot_field_evidence_admin_insert
on public.course_snapshot_field_evidence
for insert
to authenticated
with check (
  (select private.has_permission('courses.write'))
  or (select private.has_permission('imports.manage'))
);

-- The public graph is always scoped to the caller's explicit academic year.
-- Requisite identities without a published course year remain visible as
-- unavailable placeholder nodes.
create or replace function public.published_course_requisite_graph(
  p_course_code text,
  p_academic_year smallint
)
returns table (
  from_code text,
  to_code text,
  from_is_available boolean,
  to_is_available boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with recursive
  selected_year as (
    select academic_years.id
    from public.academic_years
    where academic_years.year = p_academic_year
  ),
  published_snapshots as (
    select
      course_years.course_id,
      course_years.published_snapshot_id as snapshot_id
    from public.course_years
    join selected_year
      on selected_year.id = course_years.academic_year_id
    where course_years.lifecycle_status = 'active'
      and course_years.published_snapshot_id is not null
  ),
  root as (
    select published_snapshots.course_id
    from published_snapshots
    join public.courses on courses.id = published_snapshots.course_id
    where courses.code = upper(btrim(p_course_code))
    limit 1
  ),
  edges as (
    select
      rule_references.referenced_course_id as from_course_id,
      published_snapshots.course_id as to_course_id
    from public.course_rule_course_references as rule_references
    join public.course_rules as rules on rules.id = rule_references.course_rule_id
    join published_snapshots
      on published_snapshots.snapshot_id = rules.course_snapshot_id
    where rules.rule_kind = 'prerequisite'

    union

    select
      conditions.required_course_id as from_course_id,
      published_snapshots.course_id as to_course_id
    from public.course_rule_conditions as conditions
    join public.course_rules as rules on rules.id = conditions.course_rule_id
    join published_snapshots
      on published_snapshots.snapshot_id = rules.course_snapshot_id
    where rules.rule_kind = 'prerequisite'
      and conditions.condition_kind = 'course'
      and conditions.required_course_id is not null

    union

    select
      members.referenced_course_id as from_course_id,
      published_snapshots.course_id as to_course_id
    from public.course_rule_condition_courses as members
    join public.course_rule_conditions as conditions
      on conditions.id = members.condition_id
    join public.course_rules as rules on rules.id = conditions.course_rule_id
    join published_snapshots
      on published_snapshots.snapshot_id = rules.course_snapshot_id
    where rules.rule_kind = 'prerequisite'
      and members.referenced_course_id is not null
  ),
  upstream as (
    select edges.from_course_id, edges.to_course_id
    from edges
    join root on root.course_id = edges.to_course_id

    union

    select edges.from_course_id, edges.to_course_id
    from edges
    join upstream on upstream.from_course_id = edges.to_course_id
  ),
  graph_edges as (
    select upstream.from_course_id, upstream.to_course_id
    from upstream

    union

    select edges.from_course_id, edges.to_course_id
    from edges
    join root on root.course_id = edges.from_course_id
  )
  select
    source_courses.code as from_code,
    target_courses.code as to_code,
    source_availability.course_id is not null as from_is_available,
    target_availability.course_id is not null as to_is_available
  from graph_edges
  join public.courses as source_courses
    on source_courses.id = graph_edges.from_course_id
  join public.courses as target_courses
    on target_courses.id = graph_edges.to_course_id
  left join published_snapshots as source_availability
    on source_availability.course_id = graph_edges.from_course_id
  left join published_snapshots as target_availability
    on target_availability.course_id = graph_edges.to_course_id
  order by source_courses.code, target_courses.code;
$function$;

revoke all on function public.published_course_requisite_graph(text, smallint)
from public, anon, authenticated;
grant execute on function public.published_course_requisite_graph(text, smallint)
to anon, authenticated;

create or replace function public.published_course_availability(
  p_course_code text,
  p_academic_year smallint
)
returns table (
  course_code text,
  academic_year smallint,
  is_available boolean,
  course_id bigint,
  course_year_id bigint,
  published_snapshot_id bigint,
  offering_status text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    upper(btrim(p_course_code)) as course_code,
    p_academic_year as academic_year,
    course_years.published_snapshot_id is not null as is_available,
    courses.id as course_id,
    course_years.id as course_year_id,
    course_years.published_snapshot_id,
    snapshots.offering_status
  from (values (true)) as request(single_row)
  left join public.courses
    on courses.code = upper(btrim(p_course_code))
  left join public.academic_years
    on academic_years.year = p_academic_year
  left join public.course_years
    on course_years.course_id = courses.id
   and course_years.academic_year_id = academic_years.id
   and course_years.lifecycle_status = 'active'
  left join public.course_snapshots as snapshots
    on snapshots.id = course_years.published_snapshot_id;
$function$;

revoke all on function public.published_course_availability(text, smallint)
from public, anon, authenticated;
grant execute on function public.published_course_availability(text, smallint)
to anon, authenticated;

-- Return the complete published relational projection for one exact year.
-- NULL means that code/year has no active published snapshot; no latest-year
-- fallback is permitted.
create or replace function public.published_course_detail(
  p_course_code text,
  p_academic_year smallint
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  with selected_snapshot as (
    select
      snapshots.*,
      courses.code as course_code,
      academic_years.year as academic_year
    from public.courses
    join public.course_years
      on course_years.course_id = courses.id
     and course_years.lifecycle_status = 'active'
    join public.academic_years
      on academic_years.id = course_years.academic_year_id
     and academic_years.year = p_academic_year
    join public.course_snapshots as snapshots
      on snapshots.id = course_years.published_snapshot_id
    where courses.code = upper(btrim(p_course_code))
    limit 1
  )
  select jsonb_build_object(
    'code', snapshot.course_code,
    'courseCode', snapshot.course_code,
    'academicYear', snapshot.academic_year,
    'snapshotId', snapshot.id,
    'snapshotNumber', snapshot.snapshot_number,
    'origin', snapshot.origin,
    'schemaVersion', snapshot.schema_version,
    'validationStatus', snapshot.validation_status,
    'overallConfidence', snapshot.overall_confidence,
    'hasCriticalUncertainty', snapshot.has_critical_uncertainty,
    'snapshot', jsonb_build_object(
      'title', snapshot.title,
      'unitValueKind', snapshot.unit_value_kind,
      'units', snapshot.units,
      'minimumUnits', snapshot.minimum_units,
      'maximumUnits', snapshot.maximum_units,
      'eftsl', snapshot.eftsl,
      'level', snapshot.level,
      'subjectCode', snapshot.subject_code,
      'subjectName', snapshot.subject_name,
      'school', snapshot.school,
      'college', snapshot.college,
      'academicCareer', snapshot.academic_career,
      'convenerText', snapshot.convener_text,
      'deliverySummary', snapshot.delivery_summary,
      'introduction', snapshot.introduction,
      'description', snapshot.description,
      'workloadText', snapshot.workload_text,
      'workloadHours', snapshot.workload_hours,
      'inherentRequirements', snapshot.inherent_requirements,
      'prescribedTexts', snapshot.prescribed_texts,
      'offeringStatus', snapshot.offering_status,
      'sourceUpdatedAt', snapshot.source_updated_at
    ),
    'unitOptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', options.position,
        'units', options.units,
        'label', options.label,
        'sourceText', options.source_text
      ) order by options.position)
      from public.course_unit_options as options
      where options.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'fees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', fees.position,
        'feeYear', fees.fee_year,
        'audience', fees.audience,
        'feeType', fees.fee_type,
        'amount', fees.amount,
        'currency', fees.currency,
        'basis', fees.basis,
        'studentContributionBand', fees.student_contribution_band,
        'sourceLabel', fees.source_label,
        'sourceText', fees.source_text
      ) order by fees.position)
      from public.course_fees as fees
      where fees.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'areasOfInterest', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', areas.position,
        'name', areas.name
      ) order by areas.position)
      from public.course_areas_of_interest as areas
      where areas.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'attributes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', attributes.position,
        'attributeKind', attributes.attribute_kind,
        'value', attributes.value,
        'sourceText', attributes.source_text
      ) order by attributes.position)
      from public.course_attributes as attributes
      where attributes.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'relatedCourses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', related.position,
        'relationKind', related.relation_kind,
        'sourceCourseCode', related.source_course_code,
        'sourceCourseTitle', related.source_course_title,
        'sourceText', related.source_text
      ) order by related.position)
      from public.course_related_courses as related
      where related.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'courseOffering', (
      select jsonb_build_object(
        'deliveryMode', offerings.delivery_mode,
        'location', offerings.location
      )
      from public.course_offerings as offerings
      where offerings.course_snapshot_id = snapshot.id
    ),
    'offeringSessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', sessions.position,
        'calendarYear', snapshot.academic_year,
        'academicPeriodCode', sessions.academic_period_code,
        'academicPeriodName', sessions.academic_period_name,
        'classNumber', sessions.class_number,
        'startsOn', sessions.starts_on,
        'enrolClosesOn', sessions.enrol_closes_on,
        'censusOn', sessions.census_on,
        'endsOn', sessions.ends_on,
        'deliveryMode', sessions.delivery_mode,
        'location', sessions.location,
        'classSummaryUrl', sessions.class_summary_url,
        'sourceText', sessions.source_text
      ) order by sessions.position)
      from public.offering_sessions as sessions
      where sessions.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'learningOutcomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', outcomes.position,
        'body', outcomes.body
      ) order by outcomes.position)
      from public.course_learning_outcomes as outcomes
      where outcomes.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'assessmentItems', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', items.position,
        'title', items.title,
        'weight', items.weight,
        'hurdle', items.hurdle,
        'dueText', items.due_text,
        'sourceText', items.source_text
      ) order by items.position)
      from public.course_assessment_items as items
      where items.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'assessmentOutcomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'assessmentPosition', items.position,
        'learningOutcomePosition', outcomes.position
      ) order by items.position, outcomes.position)
      from public.course_assessment_outcomes as links
      join public.course_assessment_items as items
        on items.id = links.assessment_item_id
      join public.course_learning_outcomes as outcomes
        on outcomes.id = links.learning_outcome_id
      where links.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', rules.rule_kind,
        'ruleKind', rules.rule_kind,
        'hardness', rules.hardness,
        'sourceText', rules.source_text,
        'reviewState', rules.review_state,
        'confidence', rules.confidence
      ) order by case rules.rule_kind
        when 'prerequisite' then 1
        when 'corequisite' then 2
        when 'incompatibility' then 3
        when 'permission' then 4
        when 'assumed_knowledge' then 5
        else 6
      end)
      from public.course_rules as rules
      where rules.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'ruleGroups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', coalesce(
          to_jsonb(groups) ->> 'projection_key',
          'group-' || groups.id::text
        ),
        'ruleKey', rules.rule_kind,
        'parentGroupKey', case
          when parents.id is null then null
          else coalesce(
            to_jsonb(parents) ->> 'projection_key',
            'group-' || parents.id::text
          )
        end,
        'operator', groups.operator,
        'minimumCount', groups.minimum_count,
        'position', groups.position
      ) order by rules.rule_kind, groups.position, groups.id)
      from public.course_rule_groups as groups
      join public.course_rules as rules on rules.id = groups.course_rule_id
      left join public.course_rule_groups as parents
        on parents.id = groups.parent_group_id
      where groups.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'ruleConditions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', coalesce(
          to_jsonb(conditions) ->> 'projection_key',
          'condition-' || conditions.id::text
        ),
        'ruleKey', rules.rule_kind,
        'groupKey', coalesce(
          to_jsonb(groups) ->> 'projection_key',
          'group-' || groups.id::text
        ),
        'position', conditions.position,
        'conditionKind', conditions.condition_kind,
        'requiredCourseCode', required_courses.code,
        'requiredStructureCode', required_structures.code,
        'minimumUnits', conditions.minimum_units,
        'minimumMark', conditions.minimum_mark,
        'subjectCode', conditions.subject_code,
        'minimumCourseLevel', conditions.minimum_course_level,
        'maximumCourseLevel', conditions.maximum_course_level,
        'minimumGpa', conditions.minimum_gpa,
        'minimumYear', conditions.minimum_year,
        'minimumWam', conditions.minimum_wam,
        'freeText', conditions.free_text,
        'courseRequirementMode', conditions.course_requirement_mode,
        'hardness', conditions.hardness,
        'sourceText', conditions.source_text,
        'reviewState', conditions.review_state,
        'confidence', conditions.confidence
      ) order by rules.rule_kind, conditions.position, conditions.id)
      from public.course_rule_conditions as conditions
      join public.course_rules as rules on rules.id = conditions.course_rule_id
      join public.course_rule_groups as groups on groups.id = conditions.group_id
      left join public.courses as required_courses
        on required_courses.id = conditions.required_course_id
      left join public.academic_structures as required_structures
        on required_structures.id = conditions.required_structure_id
      where conditions.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'ruleConditionCourses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'conditionKey', coalesce(
          to_jsonb(conditions) ->> 'projection_key',
          'condition-' || conditions.id::text
        ),
        'position', members.position,
        'sourceCourseCode', members.source_course_code,
        'sourceText', members.source_text
      ) order by conditions.id, members.position)
      from public.course_rule_condition_courses as members
      join public.course_rule_conditions as conditions
        on conditions.id = members.condition_id
      where members.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'ruleCourseReferences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ruleKey', rules.rule_kind,
        'referencedCourseCode', courses.code,
        'sourceText', rule_references.source_text,
        'reviewState', rule_references.review_state,
        'confidence', rule_references.confidence
      ) order by rules.rule_kind, courses.code)
      from public.course_rule_course_references as rule_references
      join public.course_rules as rules on rules.id = rule_references.course_rule_id
      join public.courses on courses.id = rule_references.referenced_course_id
      where rule_references.course_snapshot_id = snapshot.id
    ), '[]'::jsonb),
    'prerequisiteCodes', coalesce((
      select jsonb_agg(codes.code order by codes.code)
      from (
        select courses.code
        from public.course_rule_course_references as rule_references
        join public.course_rules as rules on rules.id = rule_references.course_rule_id
        join public.courses on courses.id = rule_references.referenced_course_id
        where rules.course_snapshot_id = snapshot.id
          and rules.rule_kind = 'prerequisite'

        union

        select courses.code
        from public.course_rule_conditions as conditions
        join public.course_rules as rules on rules.id = conditions.course_rule_id
        join public.courses on courses.id = conditions.required_course_id
        where rules.course_snapshot_id = snapshot.id
          and rules.rule_kind = 'prerequisite'
          and conditions.condition_kind = 'course'

        union

        select members.source_course_code
        from public.course_rule_condition_courses as members
        join public.course_rule_conditions as conditions
          on conditions.id = members.condition_id
        join public.course_rules as rules on rules.id = conditions.course_rule_id
        where rules.course_snapshot_id = snapshot.id
          and rules.rule_kind = 'prerequisite'
      ) as codes
    ), '[]'::jsonb),
    'prerequisiteEdges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from', graph.from_code,
        'to', graph.to_code,
        'fromIsAvailable', graph.from_is_available,
        'toIsAvailable', graph.to_is_available
      ) order by graph.from_code, graph.to_code)
      from public.published_course_requisite_graph(
        snapshot.course_code,
        snapshot.academic_year
      ) as graph
    ), '[]'::jsonb),
    'sourcePageId', snapshot.source_page_id,
    'sourceUpdatedAt', snapshot.source_updated_at,
    'createdAt', snapshot.created_at,
    'sealedAt', snapshot.sealed_at
  )
  from selected_snapshot as snapshot;
$function$;

revoke all on function public.published_course_detail(text, smallint)
from public, anon, authenticated;
grant execute on function public.published_course_detail(text, smallint)
to anon, authenticated;

-- Plan items keep both the stable identity and the exact course academic year
-- selected by the student. Scheduling is optional, but can never silently
-- choose a year or drift away from that explicit selection.
create or replace function public.add_current_user_plan_item(
  p_course_code text,
  p_academic_year smallint,
  p_planned_calendar_year smallint default null,
  p_planned_period_code text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
  selected_plan_id uuid;
  selected_course_id bigint;
  selected_academic_year_id bigint;
  selected_period_id bigint;
  next_sort_order bigint;
  created_item_id uuid;
  period_code text := nullif(upper(btrim(p_planned_period_code)), '');
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if p_academic_year is null then
    raise exception using
      errcode = '22023',
      message = 'A course academic year is required.';
  end if;

  if (p_planned_calendar_year is null) <> (period_code is null) then
    raise exception using
      errcode = '22023',
      message = 'Planned year and period must be supplied together.';
  end if;

  select plans.id
  into selected_plan_id
  from public.plans
  where plans.owner_id = user_id
    and plans.is_primary
    and plans.status = 'active'
  for update of plans;

  if selected_plan_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Save a primary degree plan before adding courses.';
  end if;

  select courses.id, academic_years.id
  into selected_course_id, selected_academic_year_id
  from public.courses
  join public.course_years on course_years.course_id = courses.id
  join public.academic_years
    on academic_years.id = course_years.academic_year_id
  where courses.code = upper(btrim(p_course_code))
    and academic_years.year = p_academic_year
    and course_years.lifecycle_status = 'active'
    and course_years.published_snapshot_id is not null
  limit 1;

  if selected_course_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected course has no published snapshot for the planned year.';
  end if;

  if p_planned_calendar_year is not null then
    select academic_periods.id
    into selected_period_id
    from public.academic_periods
    where academic_periods.calendar_year = p_planned_calendar_year
      and academic_periods.code = period_code
    limit 1;

    if selected_period_id is null then
      raise exception using
        errcode = 'P0002',
        message = 'The selected academic period is not available.';
    end if;
  end if;

  select coalesce(max(plan_items.sort_order), -1) + 1
  into next_sort_order
  from public.plan_items
  where plan_items.plan_id = selected_plan_id
    and plan_items.owner_id = user_id
    and plan_items.planned_calendar_year is not distinct from
      p_planned_calendar_year
    and plan_items.planned_period_code is not distinct from period_code;

  insert into public.plan_items (
    plan_id,
    owner_id,
    course_id,
    academic_year_id,
    academic_period_id,
    planned_calendar_year,
    planned_period_code,
    sort_order
  ) values (
    selected_plan_id,
    user_id,
    selected_course_id,
    selected_academic_year_id,
    selected_period_id,
    p_planned_calendar_year,
    period_code,
    next_sort_order
  )
  returning id into created_item_id;

  return created_item_id;
end;
$function$;

revoke all on function public.add_current_user_plan_item(
  text,
  smallint,
  smallint,
  text
)
from public, anon, authenticated;
grant execute on function public.add_current_user_plan_item(
  text,
  smallint,
  smallint,
  text
)
to authenticated;

-- Attempts retain the exact published snapshot from the planned academic
-- year. Units never drift if a later snapshot for that year is published.
create or replace function public.record_current_user_course_attempt(
  p_plan_item_id uuid,
  p_attempt_status text,
  p_attempt_mark numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
  selected_course_id bigint;
  selected_academic_year_id bigint;
  selected_calendar_year smallint;
  selected_period_code text;
  selected_period_id bigint;
  selected_snapshot_id bigint;
  attempted_units numeric(5, 2);
  created_attempt_id uuid;
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if p_attempt_status not in ('enrolled', 'completed', 'failed') then
    raise exception using
      errcode = '22023',
      message = 'Attempt status must be enrolled, completed or failed.';
  end if;

  select
    plan_items.course_id,
    plan_items.academic_year_id,
    plan_items.planned_calendar_year,
    plan_items.planned_period_code
  into
    selected_course_id,
    selected_academic_year_id,
    selected_calendar_year,
    selected_period_code
  from public.plan_items
  join public.plans on plans.id = plan_items.plan_id
  where plan_items.id = p_plan_item_id
    and plan_items.owner_id = user_id
    and plans.owner_id = user_id
  for update of plan_items;

  if selected_course_id is null then
    raise exception using errcode = 'P0002', message = 'Plan item not found.';
  end if;

  if selected_calendar_year is null or selected_period_code is null then
    raise exception using
      errcode = '22023',
      message = 'Schedule the course in an academic period before recording an attempt.';
  end if;

  select academic_periods.id
  into selected_period_id
  from public.academic_periods
  where academic_periods.calendar_year = selected_calendar_year
    and academic_periods.code = selected_period_code;

  if selected_period_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The academic period is not available for recorded history.';
  end if;

  select
    course_snapshots.id,
    coalesce(
      course_snapshots.units,
      course_snapshots.maximum_units,
      course_snapshots.minimum_units
    )::numeric(5, 2)
  into selected_snapshot_id, attempted_units
  from public.course_years
  join public.course_snapshots
    on course_snapshots.id = course_years.published_snapshot_id
  where course_years.course_id = selected_course_id
    and course_years.academic_year_id = selected_academic_year_id
    and course_years.lifecycle_status = 'active';

  if selected_snapshot_id is null
    or attempted_units is null
    or attempted_units <= 0
  then
    raise exception using
      errcode = 'P0002',
      message = 'The course has no published units for the attempted year.';
  end if;

  insert into public.course_attempts (
    owner_id,
    course_id,
    course_snapshot_id,
    academic_period_id,
    status,
    mark,
    units_attempted,
    units_earned,
    source
  ) values (
    user_id,
    selected_course_id,
    selected_snapshot_id,
    selected_period_id,
    p_attempt_status,
    p_attempt_mark,
    attempted_units,
    case when p_attempt_status = 'completed' then attempted_units else 0 end,
    'user_entered'
  )
  on conflict (owner_id, course_id, academic_period_id) do update
  set course_snapshot_id = excluded.course_snapshot_id,
      status = excluded.status,
      mark = excluded.mark,
      units_attempted = excluded.units_attempted,
      units_earned = excluded.units_earned,
      source = 'user_entered',
      updated_at = now()
  returning id into created_attempt_id;

  delete from public.plan_items
  where plan_items.id = p_plan_item_id
    and plan_items.owner_id = user_id;

  return created_attempt_id;
end;
$function$;

revoke all on function public.record_current_user_course_attempt(uuid, text, numeric)
from public, anon, authenticated;
grant execute on function public.record_current_user_course_attempt(uuid, text, numeric)
to authenticated;

-- Programme curriculum years remain on plans, but course compatibility is
-- checked through published course snapshots for each item's planned year.
create or replace function public.save_current_user_primary_plan(
  p_display_name text,
  p_student_number text,
  p_catalogue_year smallint,
  p_commencement_year smallint,
  p_study_load text,
  p_programme_code text,
  p_major_code text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  user_id uuid := (select auth.uid());
  selected_catalogue_year_id bigint;
  existing_plan_id uuid;
  existing_catalogue_year_id bigint;
  selected_plan_id uuid;
  selected_programme_version_id bigint;
  selected_major_version_id bigint;
begin
  if user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if nullif(btrim(p_display_name), '') is null then
    raise exception using errcode = '22023', message = 'Display name is required.';
  end if;

  select catalogue_years.id
  into selected_catalogue_year_id
  from public.catalogue_years
  where catalogue_years.year = p_catalogue_year;

  if selected_catalogue_year_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected programme catalogue year is not available.';
  end if;

  select academic_structure_versions.id
  into selected_programme_version_id
  from public.academic_structure_versions
  join public.academic_structures
    on academic_structures.id = academic_structure_versions.structure_id
  where academic_structures.code = upper(btrim(p_programme_code))
    and academic_structures.kind = 'degree'
    and academic_structure_versions.catalogue_year_id = selected_catalogue_year_id
  limit 1;

  if selected_programme_version_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'The selected programme is not available for that catalogue year.';
  end if;

  if nullif(btrim(p_major_code), '') is not null then
    select academic_structure_versions.id
    into selected_major_version_id
    from public.academic_structure_versions
    join public.academic_structures
      on academic_structures.id = academic_structure_versions.structure_id
    where academic_structures.code = upper(btrim(p_major_code))
      and academic_structures.kind = 'major'
      and academic_structure_versions.catalogue_year_id = selected_catalogue_year_id
    limit 1;

    if selected_major_version_id is null then
      raise exception using
        errcode = 'P0002',
        message = 'The selected major is not available for that catalogue year.';
    end if;
  end if;

  select plans.id, plans.catalogue_year_id
  into existing_plan_id, existing_catalogue_year_id
  from public.plans
  where plans.owner_id = user_id
    and plans.is_primary
  for update;

  if existing_plan_id is not null
    and existing_catalogue_year_id <> selected_catalogue_year_id
    and exists (
      select 1
      from public.plan_items
      where plan_items.plan_id = existing_plan_id
        and not exists (
          select 1
          from public.academic_years
          join public.course_years
            on course_years.academic_year_id = academic_years.id
          where course_years.course_id = plan_items.course_id
            and course_years.academic_year_id = plan_items.academic_year_id
            and course_years.lifecycle_status = 'active'
            and course_years.published_snapshot_id is not null
        )
    )
  then
    raise exception using
      errcode = '23503',
      message = 'The plan contains courses unavailable in their planned years.';
  end if;

  update public.profiles
  set display_name = btrim(p_display_name),
      student_number = nullif(lower(btrim(p_student_number)), '')
  where profiles.id = user_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The authenticated profile is missing.';
  end if;

  insert into public.plans (
    owner_id,
    catalogue_year_id,
    name,
    is_primary,
    status,
    commencement_year,
    study_load
  ) values (
    user_id,
    selected_catalogue_year_id,
    upper(btrim(p_programme_code)) || ' degree plan',
    true,
    'active',
    p_commencement_year,
    p_study_load
  )
  on conflict (owner_id) where is_primary do update
  set catalogue_year_id = excluded.catalogue_year_id,
      name = excluded.name,
      status = 'active',
      commencement_year = excluded.commencement_year,
      study_load = excluded.study_load,
      updated_at = now()
  returning id into selected_plan_id;

  delete from public.plan_structures
  where plan_structures.plan_id = selected_plan_id
    and plan_structures.owner_id = user_id
    and plan_structures.role in ('programme', 'major');

  insert into public.plan_structures (
    plan_id,
    owner_id,
    catalogue_year_id,
    structure_version_id,
    role,
    position
  ) values (
    selected_plan_id,
    user_id,
    selected_catalogue_year_id,
    selected_programme_version_id,
    'programme',
    0
  );

  if selected_major_version_id is not null then
    insert into public.plan_structures (
      plan_id,
      owner_id,
      catalogue_year_id,
      structure_version_id,
      role,
      position
    ) values (
      selected_plan_id,
      user_id,
      selected_catalogue_year_id,
      selected_major_version_id,
      'major',
      1
    );
  end if;

  return selected_plan_id;
end;
$function$;

revoke all on function public.save_current_user_primary_plan(
  text,
  text,
  smallint,
  smallint,
  text,
  text,
  text
)
from public, anon, authenticated;
grant execute on function public.save_current_user_primary_plan(
  text,
  text,
  smallint,
  smallint,
  text,
  text,
  text
)
to authenticated;

comment on function public.published_course_detail(text, smallint) is
  'Complete published course projection for one explicit academic year.';
comment on function public.published_course_requisite_graph(text, smallint) is
  'Published prerequisite graph for one explicit academic year.';
comment on function public.published_course_availability(text, smallint) is
  'Published snapshot availability for one course code and academic year.';
