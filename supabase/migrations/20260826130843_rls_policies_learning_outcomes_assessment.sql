-- Mirrors the existing course_versions policy set: admin write via
-- catalogue.write, draft read via catalogue.read_drafts, public read only
-- when the parent version and its catalogue year are both published.
--
-- NOTE (corrected 2026-08-27): these policies were unreachable as shipped.
-- The initial schema revokes default table privileges from anon and
-- authenticated, and this migration granted none, so every PostgREST read
-- returned "permission denied for table". The grants (and the missing
-- updated_at triggers) are added in repair_learning_outcome_access.

create policy course_learning_outcomes_admin_all
  on public.course_learning_outcomes for all to authenticated
  using ((select private.has_permission('catalogue.write')))
  with check ((select private.has_permission('catalogue.write')));

create policy course_learning_outcomes_read_drafts
  on public.course_learning_outcomes for select to authenticated
  using ((select private.has_permission('catalogue.read_drafts')));

create policy course_learning_outcomes_read_published
  on public.course_learning_outcomes for select to anon, authenticated
  using (exists (
    select 1
    from course_versions versions
    join catalogue_years years on years.id = versions.catalogue_year_id
    where versions.id = course_learning_outcomes.course_version_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  ));

create policy course_assessment_items_admin_all
  on public.course_assessment_items for all to authenticated
  using ((select private.has_permission('catalogue.write')))
  with check ((select private.has_permission('catalogue.write')));

create policy course_assessment_items_read_drafts
  on public.course_assessment_items for select to authenticated
  using ((select private.has_permission('catalogue.read_drafts')));

create policy course_assessment_items_read_published
  on public.course_assessment_items for select to anon, authenticated
  using (exists (
    select 1
    from course_versions versions
    join catalogue_years years on years.id = versions.catalogue_year_id
    where versions.id = course_assessment_items.course_version_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  ));
