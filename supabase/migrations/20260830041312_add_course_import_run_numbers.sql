alter table public.course_import_runs
  add column run_number bigint generated always as identity;

alter table public.course_import_runs
  add constraint course_import_runs_run_number_unique unique (run_number);

comment on column public.course_import_runs.run_number is
  'Stable human-facing run number. UUID id remains the internal identifier.';

grant usage, select on sequence public.course_import_runs_run_number_seq
to authenticated;
