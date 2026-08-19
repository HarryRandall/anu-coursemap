-- The university calendar feed is a new catalogue source document kind.
alter table public.catalogue_source_documents
  drop constraint catalogue_source_documents_entity_kind_check;
alter table public.catalogue_source_documents
  add constraint catalogue_source_documents_entity_kind_check check (
    entity_kind in ('course', 'structure', 'offering', 'calendar')
  );

create table public.university_calendar_events (
  id bigint generated always as identity primary key,
  calendar_year smallint not null,
  event_date date not null,
  title text not null,
  status text not null default 'draft',
  source_document_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint university_calendar_events_natural_key_unique unique (
    calendar_year,
    event_date,
    title
  ),
  constraint university_calendar_events_source_document_id_fkey
    foreign key (source_document_id)
    references public.catalogue_source_documents (id),
  constraint university_calendar_events_calendar_year_check check (
    calendar_year between 2000 and 2200
  ),
  constraint university_calendar_events_title_not_blank_check check (
    btrim(title) <> ''
  ),
  constraint university_calendar_events_date_within_year_check check (
    extract(year from event_date) = calendar_year
  ),
  constraint university_calendar_events_status_check check (
    status in ('draft', 'published', 'archived')
  )
);

create index university_calendar_events_year_date_idx
  on public.university_calendar_events (calendar_year, event_date);
create index university_calendar_events_status_year_idx
  on public.university_calendar_events (status, calendar_year);
create index university_calendar_events_source_document_id_idx
  on public.university_calendar_events (source_document_id);

create trigger university_calendar_events_set_updated_at
before update on public.university_calendar_events
for each row execute function private.set_updated_at();

alter table public.university_calendar_events enable row level security;

create policy university_calendar_events_read_published
on public.university_calendar_events
for select
to anon, authenticated
using (status = 'published');

-- Writes happen only through the verified import CLI, which connects as the
-- table owner, so no write grants are exposed to application roles.
grant select on table public.university_calendar_events to anon, authenticated;
