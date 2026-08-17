-- Published course detail now includes the reviewed condition tree alongside
-- its original ANU wording. This lets the student page evaluate explicit
-- subject-unit and course alternatives without treating prose as logic.
create or replace function public.published_course_detail(p_course_code text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $function$
  with current_year as (
    select years.id, years.year
    from catalogue_years as years
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
    from course_versions as versions
    join current_year as years on years.id = versions.catalogue_year_id
    join courses on courses.id = versions.course_id
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
        from course_offerings as offerings
        left join offering_sessions as sessions
          on sessions.course_offering_id = offerings.id
        where offerings.course_version_id = target.course_version_id
          and offerings.status = 'published'
        order by offerings.id, sessions.academic_period_id nulls last
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
          from course_offerings as offerings
          join offering_sessions as sessions
            on sessions.course_offering_id = offerings.id
          join academic_periods as periods on periods.id = sessions.academic_period_id
          where offerings.course_version_id = target.course_version_id
            and offerings.status = 'published'
        ) as periods
      ),
      '[]'::jsonb
    ),
    'prerequisite_text', coalesce(
      (
        select string_agg(rules.source_text, E'\n\n' order by rules.id)
        from course_rules as rules
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
            from course_rule_groups as groups
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
                'minimum_units', conditions.minimum_units,
                'subject_code', conditions.subject_code,
                'position', conditions.position
              )
              order by conditions.group_id, conditions.position, conditions.id
            )
            from course_rule_conditions as conditions
            left join courses as required_courses
              on required_courses.id = conditions.required_course_id
            where conditions.course_rule_id = rules.id
          ),
          '[]'::jsonb
        )
      )
      from course_rules as rules
      where rules.course_version_id = target.course_version_id
        and rules.rule_kind = 'prerequisite'
      limit 1
    ),
    'prerequisite_codes', coalesce(
      (
        select jsonb_agg(prerequisite_references.code order by prerequisite_references.code)
        from (
          select courses.code
          from course_rule_course_references as rule_references
          join courses on courses.id = rule_references.referenced_course_id
          join course_rules as rules on rules.id = rule_references.course_rule_id
          where rules.course_version_id = target.course_version_id
            and rules.rule_kind = 'prerequisite'

          union

          select courses.code
          from course_rule_conditions as conditions
          join courses on courses.id = conditions.required_course_id
          join course_rules as rules on rules.id = conditions.course_rule_id
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
        from published_course_requisite_graph(target.code) as graph
      ),
      '[]'::jsonb
    ),
    'incompatibility_text', coalesce(
      (
        select string_agg(rules.source_text, E'\n\n' order by rules.id)
        from course_rules as rules
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
