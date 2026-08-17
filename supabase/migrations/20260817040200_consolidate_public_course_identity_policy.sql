-- A single permissive policy keeps public course identity reads fast while
-- preserving the two allowed cases: a published course or a prerequisite
-- placeholder named in published official wording.
drop policy courses_read_published on public.courses;
drop policy courses_read_published_requisite_placeholder on public.courses;

create policy courses_read_public_catalogue_identity
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
  or exists (
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
