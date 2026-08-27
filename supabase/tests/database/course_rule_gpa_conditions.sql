begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(2);

select extensions.ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'course_rule_conditions'
      and column_name = 'minimum_gpa'
  ),
  'course_rule_conditions has a 7-point GPA column'
);

select extensions.ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.course_rule_conditions'::regclass
      and conname = 'course_rule_conditions_kind_check'
      and pg_get_constraintdef(oid) like '%gpa%'
  ),
  'course_rule_conditions accepts the gpa condition kind'
);

select extensions.finish();

rollback;
