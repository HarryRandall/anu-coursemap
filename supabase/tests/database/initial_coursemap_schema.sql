begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(13);

with expected_tables (name) as (
  select unnest(array[
    'catalogue_years',
    'catalogue_sources',
    'catalogue_import_runs',
    'catalogue_source_documents',
    'catalogue_import_items',
    'catalogue_review_items',
    'courses',
    'course_versions',
    'academic_periods',
    'course_offerings',
    'offering_sessions',
    'academic_structures',
    'academic_structure_versions',
    'academic_structure_relationships',
    'requirement_groups',
    'requirement_conditions',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions',
    'profiles',
    'plans',
    'plan_structures',
    'plan_items',
    'course_attempts',
    'approval_requests',
    'approval_events'
  ]::text[])
)
select extensions.ok(
  bool_and(to_regclass(format('public.%I', name)) is not null),
  'all initial public tables exist'
)
from expected_tables;

with expected_tables (name) as (
  select unnest(array[
    'app_roles',
    'app_permissions',
    'role_permissions',
    'user_roles'
  ]::text[])
)
select extensions.ok(
  bool_and(to_regclass(format('private.%I', name)) is not null),
  'all private authorisation tables exist'
)
from expected_tables;

with expected_tables (schema_name, name) as (
  select 'public', unnest(array[
    'catalogue_years',
    'catalogue_sources',
    'catalogue_import_runs',
    'catalogue_source_documents',
    'catalogue_import_items',
    'catalogue_review_items',
    'courses',
    'course_versions',
    'academic_periods',
    'course_offerings',
    'offering_sessions',
    'academic_structures',
    'academic_structure_versions',
    'academic_structure_relationships',
    'requirement_groups',
    'requirement_conditions',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions',
    'profiles',
    'plans',
    'plan_structures',
    'plan_items',
    'course_attempts',
    'approval_requests',
    'approval_events'
  ]::text[])

  union all

  select 'private', unnest(array[
    'app_roles',
    'app_permissions',
    'role_permissions',
    'user_roles'
  ]::text[])
)
select extensions.ok(
  bool_and(coalesce(classes.relrowsecurity, false)),
  'RLS is enabled on every application table'
)
from expected_tables
left join pg_namespace as namespaces
  on namespaces.nspname = expected_tables.schema_name
left join pg_class as classes
  on classes.relnamespace = namespaces.oid
 and classes.relname = expected_tables.name;

select extensions.ok(
  exists (
    select 1
    from pg_proc as functions
    where functions.oid = 'private.has_permission(text)'::regprocedure
      and functions.prosecdef
      and functions.proconfig @> array['search_path=""']::text[]
  ),
  'the permission helper is security definer with a fixed search path'
);

select extensions.ok(
  not has_function_privilege('anon', 'private.has_permission(text)', 'execute')
  and has_function_privilege(
    'authenticated',
    'private.has_permission(text)',
    'execute'
  ),
  'only authenticated API users can execute the permission helper'
);

select extensions.ok(
  exists (
    select 1
    from pg_trigger as triggers
    join pg_class as tables on tables.oid = triggers.tgrelid
    join pg_namespace as namespaces on namespaces.oid = tables.relnamespace
    where namespaces.nspname = 'auth'
      and tables.relname = 'users'
      and triggers.tgname = 'on_auth_user_created'
      and not triggers.tgisinternal
  ),
  'Auth users have the profile creation trigger'
);

select extensions.ok(
  exists (
    select 1
    from private.app_roles
    where key = 'admin'
  ),
  'the admin role is seeded'
);

select extensions.ok(
  (
    select count(*)
    from private.app_permissions
    where key in (
      'catalogue.read_drafts',
      'catalogue.write',
      'imports.manage',
      'approvals.review'
    )
  ) = 4,
  'the initial application permissions are seeded'
);

with sensitive_tables (name) as (
  select unnest(array[
    'profiles',
    'plans',
    'plan_structures',
    'plan_items',
    'course_attempts',
    'approval_requests',
    'approval_events',
    'catalogue_sources',
    'catalogue_import_runs',
    'catalogue_source_documents',
    'catalogue_import_items',
    'catalogue_review_items'
  ]::text[])
)
select extensions.ok(
  bool_and(
    not has_table_privilege('anon', format('public.%I', name), 'select')
    and not has_table_privilege('anon', format('public.%I', name), 'insert')
    and not has_table_privilege('anon', format('public.%I', name), 'update')
    and not has_table_privilege('anon', format('public.%I', name), 'delete')
    and not has_table_privilege('anon', format('public.%I', name), 'truncate')
    and not has_table_privilege('anon', format('public.%I', name), 'references')
    and not has_table_privilege('anon', format('public.%I', name), 'trigger')
    and not has_any_column_privilege(
      'anon',
      format('public.%I', name),
      'select'
    )
    and not has_any_column_privilege(
      'anon',
      format('public.%I', name),
      'insert'
    )
    and not has_any_column_privilege(
      'anon',
      format('public.%I', name),
      'update'
    )
    and not has_any_column_privilege(
      'anon',
      format('public.%I', name),
      'references'
    )
  ),
  'anonymous users have no effective access to user or import data'
)
from sensitive_tables;

with published_tables (name) as (
  select unnest(array[
    'catalogue_years',
    'courses',
    'course_versions',
    'academic_periods',
    'course_offerings',
    'offering_sessions',
    'academic_structures',
    'academic_structure_versions',
    'academic_structure_relationships',
    'requirement_groups',
    'requirement_conditions',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions'
  ]::text[])
)
select extensions.ok(
  bool_and(has_table_privilege('anon', format('public.%I', name), 'select')),
  'anonymous users have table-level select access to published catalogue data'
)
from published_tables;

select extensions.ok(
  not has_table_privilege('authenticated', 'public.approval_events', 'insert')
  and not has_any_column_privilege(
    'authenticated',
    'public.approval_events',
    'insert'
  )
  and not has_table_privilege('authenticated', 'public.approval_events', 'update')
  and not has_any_column_privilege(
    'authenticated',
    'public.approval_events',
    'update'
  )
  and not has_table_privilege('authenticated', 'public.approval_events', 'delete'),
  'approval events can only be appended by trusted database triggers'
);

select extensions.ok(
  to_regclass('public.course_rule_groups_one_root_idx') is not null
  and to_regclass('public.requirement_groups_one_root_idx') is not null
  and (
    select count(*) = 4
    from pg_trigger as triggers
    where triggers.tgname in (
      'academic_structure_versions_validate_requirement_tree',
      'requirement_groups_validate_tree',
      'course_rules_validate_tree',
      'course_rule_groups_validate_tree'
    )
      and not triggers.tgisinternal
  ),
  'nested rule tree indexes and deferred validators are installed'
);

select extensions.ok(
  not exists (
    select 1
    from pg_constraint as constraints
    join pg_namespace as namespaces
      on namespaces.oid = constraints.connamespace
    where namespaces.nspname in ('public', 'private')
      and constraints.contype = 'f'
      and not exists (
        select 1
        from pg_index as indexes
        where indexes.indrelid = constraints.conrelid
          and indexes.indisvalid
          and indexes.indisready
          and indexes.indpred is null
          and indexes.indexprs is null
          and indexes.indnkeyatts >= cardinality(constraints.conkey)
          and not exists (
            select 1
            from unnest(constraints.conkey) with ordinality
              as foreign_key_columns(attnum, position)
            where indexes.indkey[foreign_key_columns.position - 1]
              is distinct from foreign_key_columns.attnum
          )
      )
  ),
  'every application foreign key has a leading index'
);

select * from extensions.finish();

rollback;
