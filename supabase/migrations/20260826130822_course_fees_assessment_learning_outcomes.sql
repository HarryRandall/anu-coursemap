-- Fees, assessment and learning outcomes were not modelled anywhere, so the
-- parser had nowhere to put them regardless of whether it extracted them.

alter table public.course_versions
  add column if not exists student_contribution_band smallint,
  add column if not exists eftsl                     numeric(7,5),
  add column if not exists fee_domestic              numeric(10,2),
  add column if not exists fee_international         numeric(10,2),
  add column if not exists fee_year                  smallint,
  add column if not exists workload                  text,
  add column if not exists inherent_requirements     text,
  add column if not exists prescribed_texts          text;

comment on column public.course_versions.fee_year is
  'The year the fee amounts describe. ANU publishes current-year figures '
  'only, so on a future-year course page this lags catalogue_year_id or is '
  'null. Never assume it equals the catalogue year.';

create table if not exists public.course_learning_outcomes (
  id                bigint generated always as identity primary key,
  course_version_id bigint not null
    references public.course_versions(id) on delete cascade,
  position          integer not null check (position > 0),
  body              text not null check (btrim(body) <> ''),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (course_version_id, position)
);

create table if not exists public.course_assessment_items (
  id                bigint generated always as identity primary key,
  course_version_id bigint not null
    references public.course_versions(id) on delete cascade,
  position          integer not null check (position > 0),
  title             text not null check (btrim(title) <> ''),
  weight            numeric(5,2) check (weight is null or (weight >= 0 and weight <= 100)),
  learning_outcomes smallint[],
  source_text       text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (course_version_id, position)
);

comment on column public.course_assessment_items.learning_outcomes is
  'Outcome numbers as printed, e.g. {2,3} for [LO 2,3]. These are positions '
  'matching course_learning_outcomes.position.';

comment on column public.course_assessment_items.source_text is
  'The assessment line verbatim, so a parser change can be replayed without '
  'refetching ANU.';

alter table public.course_learning_outcomes enable row level security;
alter table public.course_assessment_items  enable row level security;
