begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(18);

select extensions.ok(
  exists (
    select 1
    from public.catalogue_years as years
    where years.year = 2026
      and years.status = 'published'
      and years.published_at is not null
  ),
  'the 2026 catalogue year is published'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where years.year = 2026
      and structures.code = 'BCOMP'
      and versions.publication_status = 'draft'
      and versions.review_state = 'review'
  ),
  'the official BCOMP version remains in draft review'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where years.year = 2026
      and structures.code = 'SOFT-MAJ'
      and versions.publication_status = 'draft'
      and versions.review_state = 'review'
  ),
  'the official SOFT-MAJ version remains in draft review'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where years.year = 2026
      and structures.code = 'DEMO-BCOMP'
      and structures.kind = 'degree'
      and versions.publication_status = 'published'
  ),
  'the demo Bachelor of Computing is published'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where years.year = 2026
      and structures.code = 'DEMO-SOFT'
      and structures.kind = 'major'
      and versions.publication_status = 'published'
  ),
  'the demo Software Development major is published'
);

select extensions.is(
  (
    select count(*)
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code in ('DEMO-BCOMP', 'DEMO-SOFT')
      and groups.parent_group_id is null
  ),
  2::bigint,
  'each demo structure has exactly one requirement root'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    where lower(profiles.email) = 'test@test.com'
  ),
  'the local preview profile exists'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    join private.user_roles as user_roles
      on user_roles.user_id = profiles.id
    join private.app_roles as roles
      on roles.id = user_roles.role_id
    where lower(profiles.email) = 'test@test.com'
      and roles.key = 'admin'
  ),
  'the local preview account has the admin role'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    join public.plans as plans
      on plans.owner_id = profiles.id
    join public.catalogue_years as years
      on years.id = plans.catalogue_year_id
    where lower(profiles.email) = 'test@test.com'
      and years.year = 2026
      and plans.is_primary
      and plans.status = 'active'
      and plans.extension_years = 0
  ),
  'the local preview account has an unextended primary 2026 plan'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    join public.plans as plans
      on plans.owner_id = profiles.id
    join public.plan_structures as plan_structures
      on plan_structures.plan_id = plans.id
    join public.academic_structure_versions as versions
      on versions.id = plan_structures.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where lower(profiles.email) = 'test@test.com'
      and plans.is_primary
      and structures.code = 'DEMO-BCOMP'
      and plan_structures.role = 'programme'
  ),
  'the primary plan uses the demo Bachelor of Computing'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    join public.plans as plans
      on plans.owner_id = profiles.id
    join public.plan_structures as plan_structures
      on plan_structures.plan_id = plans.id
    join public.academic_structure_versions as versions
      on versions.id = plan_structures.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where lower(profiles.email) = 'test@test.com'
      and plans.is_primary
      and structures.code = 'DEMO-SOFT'
      and plan_structures.role = 'major'
  ),
  'the primary plan uses the demo Software Development major'
);

select extensions.ok(
  (
    select count(distinct versions.id)
    from public.course_versions as versions
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    join public.catalogue_source_documents as documents
      on documents.id = versions.source_document_id
    join public.catalogue_sources as sources
      on sources.id = documents.source_id
    where years.year = 2026
      and versions.publication_status = 'published'
      and sources.kind = 'local_mock'
  ) >= 12,
  'at least twelve published local mock courses are available'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    join public.course_attempts as attempts
      on attempts.owner_id = profiles.id
    where lower(profiles.email) = 'test@test.com'
      and attempts.status = 'completed'
  ),
  'the local preview account has completed course attempts'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    join public.course_attempts as attempts
      on attempts.owner_id = profiles.id
    where lower(profiles.email) = 'test@test.com'
      and attempts.status = 'enrolled'
  ),
  'the local preview account has enrolled course attempts'
);

select extensions.ok(
  exists (
    select 1
    from public.profiles as profiles
    join public.plans as plans
      on plans.owner_id = profiles.id
    join public.plan_items as items
      on items.plan_id = plans.id
    where lower(profiles.email) = 'test@test.com'
      and plans.is_primary
      and items.planned_calendar_year > plans.commencement_year
  ),
  'the primary plan includes future course items'
);

select extensions.ok(
  exists (
    select 1
    from public.course_offerings as offerings
    join public.course_versions as versions
      on versions.id = offerings.course_version_id
    join public.catalogue_source_documents as documents
      on documents.id = versions.source_document_id
    join public.catalogue_sources as sources
      on sources.id = documents.source_id
    where offerings.status = 'published'
      and versions.publication_status = 'published'
      and sources.kind = 'local_mock'
  ),
  'published local mock course offerings exist'
);

select extensions.ok(
  exists (
    select 1
    from public.offering_sessions as sessions
    join public.course_offerings as offerings
      on offerings.id = sessions.course_offering_id
    join public.course_versions as versions
      on versions.id = offerings.course_version_id
    join public.catalogue_source_documents as documents
      on documents.id = versions.source_document_id
    join public.catalogue_sources as sources
      on sources.id = documents.source_id
    where offerings.status = 'published'
      and versions.publication_status = 'published'
      and sources.kind = 'local_mock'
  ),
  'published local mock offering sessions exist'
);

select extensions.ok(
  (
    select count(*)
    from public.university_calendar_events as events
    join public.catalogue_source_documents as documents
      on documents.id = events.source_document_id
    join public.catalogue_sources as sources
      on sources.id = documents.source_id
    where events.calendar_year = 2026
      and events.status = 'published'
      and sources.kind = 'local_mock'
  ) >= 12,
  'published local mock key dates are available'
);

select * from extensions.finish();

rollback;
