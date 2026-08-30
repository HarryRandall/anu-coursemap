begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(7);

select extensions.hasnt_table(
  'public',
  'catalogue_review_items',
  'the retired generic catalogue review queue is absent'
);

select extensions.hasnt_table(
  'public',
  'catalogue_import_diagnostics',
  'the retired generic catalogue diagnostics table is absent'
);

select extensions.hasnt_function(
  'public',
  'catalogue_change_issue_codes',
  array[]::text[],
  'the retired generic catalogue change classifier is absent'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.catalogue_source_documents'::regclass
      and conname = 'catalogue_source_documents_entity_kind_check'
      and pg_catalog.pg_get_constraintdef(oid)
        = 'CHECK ((entity_kind = ''calendar''::text))'
  ),
  'generic source documents are limited to the remaining calendar importer'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.catalogue_import_items'::regclass
      and conname = 'catalogue_import_items_target_kind_check'
      and pg_catalog.pg_get_constraintdef(oid)
        = 'CHECK ((target_kind = ''university_calendar''::text))'
  ),
  'generic import items are limited to university calendar targets'
);

select extensions.ok(
  not has_sequence_privilege(
    'authenticated',
    'public.academic_structure_import_runs_run_number_seq',
    'usage'
  )
  and not has_sequence_privilege(
    'authenticated',
    'public.academic_structure_import_runs_run_number_seq',
    'select'
  )
  and not has_sequence_privilege(
    'authenticated',
    'public.course_import_runs_run_number_seq',
    'usage'
  )
  and not has_sequence_privilege(
    'authenticated',
    'public.course_import_runs_run_number_seq',
    'select'
  ),
  'authenticated clients cannot allocate or inspect importer run sequences directly'
);

select extensions.ok(
  pg_catalog.pg_get_functiondef(
    'public.review_academic_structure_import_target(uuid,text,text)'::regprocedure
  ) like '%severity <> ''error''%',
  'acceptance resolves non-blocking review observations while preserving errors'
);

select * from extensions.finish();

rollback;
