begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(1);

select extensions.ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.course_rule_conditions'::regclass
      and conname = 'course_rule_conditions_kind_check'
      and pg_get_constraintdef(oid) like '%incompatible%'
  ),
  'course_rule_conditions accepts the incompatible condition kind'
);

select extensions.finish();

rollback;
