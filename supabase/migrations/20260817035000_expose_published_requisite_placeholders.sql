-- A placeholder course code is already present in the published ANU source
-- wording. Let public reads resolve that identity only when it is referenced by
-- a published prerequisite rule. Its draft course version remains protected by
-- the existing course-version policy, so the public cannot load its details.
create policy courses_read_published_requisite_placeholder
on public.courses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_rule_course_references as rule_references
    join public.course_rules as rules on rules.id = rule_references.course_rule_id
    join public.course_versions as versions
      on versions.id = rules.course_version_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where rule_references.referenced_course_id = courses.id
      and rules.rule_kind = 'prerequisite'
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);
