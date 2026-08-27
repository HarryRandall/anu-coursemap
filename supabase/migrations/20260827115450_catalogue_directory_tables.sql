-- Lightweight ANU directory index: codes and titles only, for Sync discovery.
-- Full detail still lives on course_versions / academic_structure_versions.

alter table public.catalogue_source_documents
  drop constraint catalogue_source_documents_entity_kind_check;

alter table public.catalogue_source_documents
  add constraint catalogue_source_documents_entity_kind_check check (
    entity_kind in (
      'course',
      'structure',
      'offering',
      'calendar',
      'course_directory',
      'programme_directory'
    )
  );

create table public.catalogue_directory_courses (
  id bigint generated always as identity primary key,
  catalogue_year_id bigint not null,
  code text not null,
  title text not null,
  units numeric(5, 2),
  career text,
  session text,
  mode_of_delivery text,
  source_document_id bigint not null,
  import_run_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_directory_courses_catalogue_year_id_fkey
    foreign key (catalogue_year_id) references public.catalogue_years (id),
  constraint catalogue_directory_courses_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint catalogue_directory_courses_import_run_id_fkey
    foreign key (import_run_id) references public.catalogue_import_runs (id),
  constraint catalogue_directory_courses_year_code_unique
    unique (catalogue_year_id, code),
  constraint catalogue_directory_courses_code_check check (
    code ~ '^[A-Z]{4}[0-9]{4}$'
  ),
  constraint catalogue_directory_courses_title_not_blank_check check (
    btrim(title) <> ''
  ),
  constraint catalogue_directory_courses_units_check check (
    units is null or units > 0
  ),
  constraint catalogue_directory_courses_career_not_blank_check check (
    career is null or btrim(career) <> ''
  ),
  constraint catalogue_directory_courses_session_not_blank_check check (
    session is null or btrim(session) <> ''
  ),
  constraint catalogue_directory_courses_mode_not_blank_check check (
    mode_of_delivery is null or btrim(mode_of_delivery) <> ''
  )
);

create table public.catalogue_directory_programmes (
  id bigint generated always as identity primary key,
  catalogue_year_id bigint not null,
  code text not null,
  title text not null,
  kind text not null,
  career text,
  duration numeric(5, 2),
  source_document_id bigint not null,
  import_run_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_directory_programmes_catalogue_year_id_fkey
    foreign key (catalogue_year_id) references public.catalogue_years (id),
  constraint catalogue_directory_programmes_source_document_year_fkey
    foreign key (source_document_id, catalogue_year_id)
    references public.catalogue_source_documents (id, catalogue_year_id),
  constraint catalogue_directory_programmes_import_run_id_fkey
    foreign key (import_run_id) references public.catalogue_import_runs (id),
  constraint catalogue_directory_programmes_year_code_unique
    unique (catalogue_year_id, code),
  constraint catalogue_directory_programmes_code_check check (
    code ~ '^[A-Z0-9-]{4,}$'
  ),
  constraint catalogue_directory_programmes_title_not_blank_check check (
    btrim(title) <> ''
  ),
  constraint catalogue_directory_programmes_kind_check check (
    kind in ('undergraduate', 'postgraduate', 'research', 'non_award')
  ),
  constraint catalogue_directory_programmes_career_not_blank_check check (
    career is null or btrim(career) <> ''
  ),
  constraint catalogue_directory_programmes_duration_check check (
    duration is null or duration > 0
  )
);

create index catalogue_directory_courses_catalogue_year_id_idx
  on public.catalogue_directory_courses (catalogue_year_id);

create index catalogue_directory_courses_source_document_year_idx
  on public.catalogue_directory_courses (source_document_id, catalogue_year_id);

create index catalogue_directory_courses_import_run_id_idx
  on public.catalogue_directory_courses (import_run_id);

create index catalogue_directory_courses_title_idx
  on public.catalogue_directory_courses (title);

create index catalogue_directory_programmes_catalogue_year_id_idx
  on public.catalogue_directory_programmes (catalogue_year_id);

create index catalogue_directory_programmes_source_document_year_idx
  on public.catalogue_directory_programmes (source_document_id, catalogue_year_id);

create index catalogue_directory_programmes_import_run_id_idx
  on public.catalogue_directory_programmes (import_run_id);

create index catalogue_directory_programmes_title_idx
  on public.catalogue_directory_programmes (title);

create index catalogue_directory_programmes_kind_idx
  on public.catalogue_directory_programmes (kind);

create trigger catalogue_directory_courses_set_updated_at
before update on public.catalogue_directory_courses
for each row execute function private.set_updated_at();

create trigger catalogue_directory_programmes_set_updated_at
before update on public.catalogue_directory_programmes
for each row execute function private.set_updated_at();

alter table public.catalogue_directory_courses enable row level security;
alter table public.catalogue_directory_programmes enable row level security;

create policy catalogue_directory_courses_import_admin_all
on public.catalogue_directory_courses
for all
to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));

create policy catalogue_directory_programmes_import_admin_all
on public.catalogue_directory_programmes
for all
to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));

grant select, insert, update, delete on table
  public.catalogue_directory_courses,
  public.catalogue_directory_programmes
to authenticated;

grant usage, select on sequence
  public.catalogue_directory_courses_id_seq,
  public.catalogue_directory_programmes_id_seq
to authenticated;

comment on table public.catalogue_directory_courses is
  'ANU course search directory for a catalogue year: code and title only. '
  'Full detail is imported separately into course_versions.';

comment on table public.catalogue_directory_programmes is
  'ANU programme search directory for a catalogue year: code and title only. '
  'Full detail is imported separately into academic_structure_versions.';
