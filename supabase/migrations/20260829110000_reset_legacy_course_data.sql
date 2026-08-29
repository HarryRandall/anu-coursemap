-- Remove disposable development data before introducing the snapshot-native
-- course schema. The following foundation migration contains a compatibility
-- backfill for installations that must preserve legacy course data, but this
-- Coursemap environment has explicitly chosen a clean cutover instead.

begin;

-- Keep this list explicit. Users, profiles, roles, permissions, academic
-- periods, university calendar rows, rooms, maps and unrelated application
-- data are deliberately outside the reset boundary.
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
  public.course_rule_course_references,
  public.course_rule_conditions,
  public.course_rule_groups,
  public.course_rules,
  public.offering_sessions,
  public.course_offerings,
  public.course_assessment_items,
  public.course_learning_outcomes,
  public.course_versions,
  public.courses
restart identity;

-- Generic source documents are also disposable except where the retained
-- university calendar still references them.
delete from public.catalogue_source_documents as documents
where not exists (
    select 1
    from public.university_calendar_events as events
    where events.source_document_id = documents.id
  );

commit;
