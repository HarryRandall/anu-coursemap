-- Administrators can record an ANU 7-point GPA threshold as a first-class
-- course-rule condition, separate from the unused 0-100 course mark column.

alter table public.course_rule_conditions
  add column minimum_gpa numeric(3, 2);

alter table public.course_rule_conditions
  add constraint course_rule_conditions_minimum_gpa_check check (
    minimum_gpa is null or minimum_gpa between 0 and 7
  );

alter table public.course_rule_conditions
  drop constraint course_rule_conditions_kind_check;

alter table public.course_rule_conditions
  add constraint course_rule_conditions_kind_check check (
    condition_kind in (
      'course',
      'units_total',
      'subject_units',
      'level_units',
      'permission',
      'admission',
      'other',
      'gpa'
    )
  );

alter table public.course_rule_conditions
  drop constraint course_rule_conditions_typed_value_check;

alter table public.course_rule_conditions
  add constraint course_rule_conditions_typed_value_check check (
    (
      condition_kind = 'course'
      and required_course_id is not null
      and num_nonnulls(
        required_structure_id,
        minimum_units,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'units_total'
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'subject_units'
      and subject_code is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'level_units'
      and minimum_course_level is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        subject_code,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'permission'
      and free_text is not null
      and btrim(free_text) <> ''
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'admission'
      and num_nonnulls(required_structure_id, free_text) = 1
      and (free_text is null or btrim(free_text) <> '')
      and num_nonnulls(
        required_course_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'other'
      and free_text is not null
      and btrim(free_text) <> ''
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'gpa'
      and minimum_gpa is not null
      and minimum_gpa between 0 and 7
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text
      ) = 0
    )
  );

comment on column public.course_rule_conditions.minimum_gpa is
  'ANU 7-point GPA threshold when condition_kind is gpa.';

create or replace function public.published_course_detail(p_course_code text)
returns jsonb
language sql
stable
set search_path = ''
as $function$
  with current_year as (
    select years.id, years.year
    from public.catalogue_years as years
    where years.status = 'published'
    order by years.year desc
    limit 1
  ),
  target as (
    select
      versions.id as course_version_id,
      years.year,
      courses.code,
      versions.title,
      versions.units,
      versions.level,
      versions.subject,
      versions.school,
      versions.convener,
      versions.delivery_summary,
      versions.description,
      versions.review_state,
      versions.source_updated_at
    from public.course_versions as versions
    join current_year as years on years.id = versions.catalogue_year_id
    join public.courses on courses.id = versions.course_id
    where versions.publication_status = 'published'
      and courses.code = upper(btrim(p_course_code))
    limit 1
  )
  select jsonb_build_object(
    'code', target.code,
    'year', target.year,
    'name', target.title,
    'units', target.units,
    'level', target.level,
    'subject', target.subject,
    'school', target.school,
    'convener', target.convener,
    'delivery', coalesce(
      (
        select coalesce(sessions.delivery_mode, offerings.delivery_mode)
        from public.course_offerings as offerings
        left join public.offering_sessions as sessions
          on sessions.course_offering_id = offerings.id
        where offerings.course_version_id = target.course_version_id
          and offerings.status = 'published'
        order by offerings.id, sessions.academic_period_id nulls last, sessions.class_number nulls first
        limit 1
      ),
      target.delivery_summary,
      'Not listed'
    ),
    'description', target.description,
    'sessions', coalesce(
      (
        select jsonb_agg(periods.name order by periods.name)
        from (
          select distinct periods.name
          from public.course_offerings as offerings
          join public.offering_sessions as sessions
            on sessions.course_offering_id = offerings.id
          join public.academic_periods as periods
            on periods.id = sessions.academic_period_id
          where offerings.course_version_id = target.course_version_id
            and offerings.status = 'published'
        ) as periods
      ),
      '[]'::jsonb
    ),
    'prerequisite_text', coalesce(
      (
        select string_agg(rules.source_text, E'\n\n' order by rules.id)
        from public.course_rules as rules
        where rules.course_version_id = target.course_version_id
          and rules.rule_kind = 'prerequisite'
      ),
      'No prerequisites listed.'
    ),
    'prerequisite_rule', (
      select jsonb_build_object(
        'source_text', rules.source_text,
        'review_state', rules.review_state,
        'confidence', rules.confidence,
        'groups', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', groups.id,
                'parent_group_id', groups.parent_group_id,
                'operator', groups.operator,
                'position', groups.position
              )
              order by groups.parent_group_id nulls first, groups.position, groups.id
            )
            from public.course_rule_groups as groups
            where groups.course_rule_id = rules.id
          ),
          '[]'::jsonb
        ),
        'conditions', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'group_id', conditions.group_id,
                'condition_kind', conditions.condition_kind,
                'course_code', required_courses.code,
                'structure_code', required_structures.code,
                'minimum_units', conditions.minimum_units,
                'minimum_mark', conditions.minimum_mark,
                'minimum_gpa', conditions.minimum_gpa,
                'subject_code', conditions.subject_code,
                'minimum_course_level', conditions.minimum_course_level,
                'maximum_course_level', conditions.maximum_course_level,
                'free_text', conditions.free_text,
                'position', conditions.position
              )
              order by conditions.group_id, conditions.position, conditions.id
            )
            from public.course_rule_conditions as conditions
            left join public.courses as required_courses
              on required_courses.id = conditions.required_course_id
            left join public.academic_structures as required_structures
              on required_structures.id = conditions.required_structure_id
            where conditions.course_rule_id = rules.id
          ),
          '[]'::jsonb
        )
      )
      from public.course_rules as rules
      where rules.course_version_id = target.course_version_id
        and rules.rule_kind = 'prerequisite'
      limit 1
    ),
    'prerequisite_codes', coalesce(
      (
        select jsonb_agg(prerequisite_references.code order by prerequisite_references.code)
        from (
          select courses.code
          from public.course_rule_course_references as rule_references
          join public.courses on courses.id = rule_references.referenced_course_id
          join public.course_rules as rules on rules.id = rule_references.course_rule_id
          where rules.course_version_id = target.course_version_id
            and rules.rule_kind = 'prerequisite'

          union

          select courses.code
          from public.course_rule_conditions as conditions
          join public.courses on courses.id = conditions.required_course_id
          join public.course_rules as rules on rules.id = conditions.course_rule_id
          where rules.course_version_id = target.course_version_id
            and rules.rule_kind = 'prerequisite'
            and conditions.condition_kind = 'course'
        ) as prerequisite_references
      ),
      '[]'::jsonb
    ),
    'prerequisite_edges', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'from', graph.from_code,
            'to', graph.to_code,
            'from_is_available', graph.from_is_available,
            'to_is_available', graph.to_is_available
          )
          order by graph.from_code, graph.to_code
        )
        from public.published_course_requisite_graph(target.code) as graph
      ),
      '[]'::jsonb
    ),
    'incompatibility_text', coalesce(
      (
        select string_agg(rules.source_text, E'\n\n' order by rules.id)
        from public.course_rules as rules
        where rules.course_version_id = target.course_version_id
          and rules.rule_kind = 'incompatibility'
      ),
      ''
    ),
    'source_updated_at', target.source_updated_at,
    'review_state', target.review_state
  )
  from target;
$function$;

revoke all on function public.published_course_detail(text) from public;
grant execute on function public.published_course_detail(text)
to anon, authenticated;
