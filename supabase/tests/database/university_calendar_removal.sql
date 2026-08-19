begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(2);

select extensions.ok(
  to_regclass('public.university_calendar_events') is null,
  'the university calendar events table is removed'
);

select extensions.ok(
  coalesce(
    (
      select pg_get_constraintdef(constraints.oid) not like '%calendar%'
      from pg_constraint as constraints
      where constraints.conrelid = 'public.catalogue_source_documents'::regclass
        and constraints.conname = 'catalogue_source_documents_entity_kind_check'
    ),
    false
  ),
  'calendar is no longer an allowed catalogue source document kind'
);

select * from extensions.finish();

rollback;
