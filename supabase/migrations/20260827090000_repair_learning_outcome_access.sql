-- Repairs two defects in 20260826130822 / 20260826130843.
--
-- 1. Neither table was granted anything to anon or authenticated. The initial
--    schema revokes default table privileges from both roles, so the RLS
--    policies added in 20260826130843 were unreachable and every PostgREST
--    read returned "permission denied for table". Grants mirror the existing
--    course_versions set (initial schema, grant blocks at 2106 and 2123).
--
-- 2. Both tables carry updated_at with no trigger, so the column was frozen at
--    insert time. Trigger shape matches the rest of the schema.
--
-- Also adds workload_hours, which the parser already extracts
-- (CatalogueCourseRichDetails.workloadHours) and which had no column. The
-- adjacent workload column is ANU's free text; this is the numeric total.

grant select on table
  public.course_learning_outcomes,
  public.course_assessment_items
to anon, authenticated;

grant insert, update, delete on table
  public.course_learning_outcomes,
  public.course_assessment_items
to authenticated;

create trigger course_learning_outcomes_set_updated_at
before update on public.course_learning_outcomes
for each row execute function private.set_updated_at();

create trigger course_assessment_items_set_updated_at
before update on public.course_assessment_items
for each row execute function private.set_updated_at();

alter table public.course_versions
  add column if not exists workload_hours smallint
    check (workload_hours is null or (workload_hours > 0 and workload_hours <= 2000));

comment on column public.course_versions.workload_hours is
  'Total indicative workload in hours for the whole course, parsed from the '
  'workload free text. Null when ANU states workload only per week.';
