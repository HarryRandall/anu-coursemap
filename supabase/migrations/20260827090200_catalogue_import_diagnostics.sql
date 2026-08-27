-- Splits parser diagnostics out of catalogue_review_items.
--
-- catalogue_review_items has been holding two different things: catalogue
-- changes a human must confirm, and the parser reporting on its own
-- confidence. 444 of 445 open rows were the latter, which is why the admin
-- Flags queue filled to 159 rows with entries like "the official requisite
-- section could not be observed" -- statements with no old value and no new
-- value, and therefore nothing for a human to accept or dismiss.
--
-- The test used to classify: if a row cannot fill in both old_value and
-- new_value, it is not a change. After this migration catalogue_review_items
-- is a pure change queue and enforces that in the schema.

-- ---------------------------------------------------------------------------
-- 1. Diagnostics table
-- ---------------------------------------------------------------------------

-- No status/assigned_to/resolved_by and no updated_at: a diagnostic is
-- immutable evidence of what one run observed, not a workflow object. That is
-- the substantive difference from catalogue_review_items.
--
-- source_fingerprint mirrors, in the database, the in-memory dedupe that
-- appendUniqueDiagnostic (importer.mjs) already performs, and keeps the unique
-- key total so no NULL-distinct gap opens up.
create table public.catalogue_import_diagnostics (
  id bigint generated always as identity primary key,
  import_item_id bigint not null,
  issue_code text not null,
  severity text not null default 'warning',
  summary text not null,
  field text,
  details jsonb not null default '{}'::jsonb,
  source_fingerprint text not null generated always as (
    md5(
      coalesce(field, '') || E'\n'
      || coalesce(details ->> 'sourceFragment', '') || E'\n'
      || summary
    )
  ) stored,
  created_at timestamptz not null default now(),
  constraint catalogue_import_diagnostics_import_item_id_fkey
    foreign key (import_item_id)
    references public.catalogue_import_items (id) on delete cascade,
  constraint catalogue_import_diagnostics_item_issue_unique unique (
    import_item_id, issue_code, source_fingerprint
  ),
  constraint catalogue_import_diagnostics_issue_code_not_blank_check check (
    btrim(issue_code) <> ''
  ),
  constraint catalogue_import_diagnostics_summary_not_blank_check check (
    btrim(summary) <> ''
  ),
  constraint catalogue_import_diagnostics_field_not_blank_check check (
    field is null or btrim(field) <> ''
  ),
  constraint catalogue_import_diagnostics_severity_check check (
    severity in ('warning', 'error')
  ),
  constraint catalogue_import_diagnostics_details_object_check check (
    jsonb_typeof(details) = 'object'
  )
);

create index catalogue_import_diagnostics_import_item_id_idx
  on public.catalogue_import_diagnostics (import_item_id);

create index catalogue_import_diagnostics_issue_code_idx
  on public.catalogue_import_diagnostics (issue_code, created_at desc);

create index catalogue_import_diagnostics_severity_idx
  on public.catalogue_import_diagnostics (severity, created_at desc)
  where severity = 'error';

alter table public.catalogue_import_diagnostics enable row level security;

create policy catalogue_import_diagnostics_import_admin_all
on public.catalogue_import_diagnostics
for all
to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));

grant select, insert, update, delete on table
  public.catalogue_import_diagnostics
to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Reshape catalogue_review_items into a target-keyed change queue
-- ---------------------------------------------------------------------------

-- Needed before a composite provenance FK can point at the item, matching
-- course_offerings_version_year_fkey.
alter table public.catalogue_import_items
  add constraint catalogue_import_items_id_year_unique unique (id, catalogue_year_id);

alter table public.catalogue_review_items
  add column catalogue_year_id bigint,
  add column target_kind text,
  add column target_key text,
  add column field text,
  add column old_value jsonb,
  add column new_value jsonb;

update public.catalogue_review_items as reviews
set
  catalogue_year_id = items.catalogue_year_id,
  target_kind       = items.target_kind,
  target_key        = items.target_key,
  field             = reviews.details ->> 'field'
from public.catalogue_import_items as items
where items.id = reviews.import_item_id;

-- ---------------------------------------------------------------------------
-- 3. Move the diagnostics out
-- ---------------------------------------------------------------------------

-- Kept as a function rather than a literal so the importer, the pgTAP tests
-- and any later migration all read the classification from one place.
create or replace function public.catalogue_change_issue_codes()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'STRUCTURED_RULE_SOURCE_REMOVAL_PRESERVED',
    'OFFERING_SOURCE_REMOVAL_PRESERVED',
    'STRUCTURED_RULE_PRESERVED',
    'COURSE_RULE_RECONCILIATION_DEFERRED',
    'OFFERING_SESSION_RECONCILIATION_DEFERRED'
  ]::text[]
$$;

grant execute on function public.catalogue_change_issue_codes() to authenticated;

-- The five codes that stay are the ones where Coursemap held a value, the
-- source moved, and the importer deliberately preserved what it had pending a
-- human decision. Everything else describes the parse, not the catalogue.
--
-- COURSE_RULE_REQUIRES_REVIEW is deliberately NOT in this list despite its
-- name. importer.mjs raises it unconditionally for every rule the grammar
-- cannot structure; no stored value is consulted, so there is no before and no
-- after. It is the same fact as the parser-side UNSTRUCTURED_REQUISITE_TEXT,
-- reported from a second layer.
insert into public.catalogue_import_diagnostics (
  import_item_id, issue_code, severity, summary, field, details, created_at
)
select
  reviews.import_item_id,
  reviews.issue_code,
  case when reviews.details ->> 'severity' = 'error' then 'error' else 'warning' end,
  reviews.summary,
  nullif(btrim(coalesce(reviews.details ->> 'field', '')), ''),
  reviews.details - 'field' - 'severity',
  reviews.created_at
from public.catalogue_review_items as reviews
where reviews.issue_code <> all (public.catalogue_change_issue_codes())
on conflict on constraint catalogue_import_diagnostics_item_issue_unique
  do nothing;

delete from public.catalogue_review_items
where issue_code <> all (public.catalogue_change_issue_codes());

-- The surviving rows cannot be backfilled honestly. details.sourceFragment
-- holds the NEW source text, not the preserved old value, so reconstructing
-- old_value/new_value retrospectively would ship knowingly-wrong flags. The
-- next import regenerates them with real values from the importer.
delete from public.catalogue_review_items
where old_value is null and new_value is null;

-- ---------------------------------------------------------------------------
-- 4. Constrain what is left
-- ---------------------------------------------------------------------------

alter table public.catalogue_review_items
  alter column catalogue_year_id set not null,
  alter column target_kind set not null,
  alter column target_key set not null,
  alter column field set not null;

alter table public.catalogue_review_items
  drop constraint catalogue_review_items_import_item_id_fkey;

alter table public.catalogue_review_items
  add constraint catalogue_review_items_item_provenance_fkey
    foreign key (import_item_id, catalogue_year_id)
    references public.catalogue_import_items (id, catalogue_year_id)
    on delete cascade,
  add constraint catalogue_review_items_target_kind_not_blank_check
    check (btrim(target_kind) <> ''),
  add constraint catalogue_review_items_target_key_not_blank_check
    check (btrim(target_key) <> ''),
  add constraint catalogue_review_items_field_not_blank_check
    check (btrim(field) <> ''),
  add constraint catalogue_review_items_change_present_check
    check (old_value is not null or new_value is not null),
  -- Load-bearing: upsertCourseRule marks a rule "preserved" when only
  -- source_document_id differs, which would otherwise raise a flag whose
  -- before and after are the same text.
  add constraint catalogue_review_items_change_distinct_check
    check (old_value is distinct from new_value);

-- Total, not partial on status = 'open'. A partial index would let a resolved
-- flag be re-raised as a brand new open row on the next rerun -- the same
-- nagging bug in a new costume. Total plus "on conflict do update" lets the
-- importer refresh in place and reopen only when the source has actually moved
-- again since the human resolved it.
create unique index catalogue_review_items_target_issue_unique
  on public.catalogue_review_items (
    catalogue_year_id, target_kind, target_key, issue_code, field
  );

create index catalogue_review_items_target_idx
  on public.catalogue_review_items (target_kind, target_key, catalogue_year_id);

-- The provenance FK is composite, so the pre-existing single-column index on
-- import_item_id no longer satisfies the repo's "every foreign key has a
-- leading index" rule (initial_coursemap_schema pgTAP test 13). This index
-- covers both the FK and the single-column lookups the old index served.
drop index public.catalogue_review_items_import_item_id_idx;

create index catalogue_review_items_import_item_id_idx
  on public.catalogue_review_items (import_item_id, catalogue_year_id);

comment on column public.catalogue_review_items.old_value is
  'The value Coursemap held before this import. Null only when the change is '
  'an addition.';

comment on column public.catalogue_review_items.new_value is
  'The value the source now states. Null only when the source removed it.';
