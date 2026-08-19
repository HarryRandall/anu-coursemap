-- Every other function in this project pins an empty search path and uses
-- schema-qualified names. The two published-course read functions were the
-- exception with search_path = public, so bring them in line to remove the
-- last unqualified lookup surface. Bodies are otherwise unchanged.
create or replace function public.published_course_requisite_graph(
  p_course_code text
)
returns table (
  from_code text,
  to_code text,
  from_is_available boolean,
  to_is_available boolean
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with recursive
  current_year as (
    select years.id
    from public.catalogue_years as years
    where years.status = 'published'
    order by years.year desc
    limit 1
  ),
  published_versions as (
    select versions.id, versions.course_id
    from public.course_versions as versions
    join current_year on current_year.id = versions.catalogue_year_id
    where versions.publication_status = 'published'
  ),
  root as (
    select versions.course_id
    from published_versions as versions
    join public.courses as course on course.id = versions.course_id
    where course.code = upper(btrim(p_course_code))
    limit 1
  ),
  edges as (
    select
      rule_references.referenced_course_id as from_course_id,
      versions.course_id as to_course_id
    from public.course_rule_course_references as rule_references
    join public.course_rules as rules
      on rules.id = rule_references.course_rule_id
    join published_versions as versions on versions.id = rules.course_version_id
    where rules.rule_kind = 'prerequisite'

    union

    select
      conditions.required_course_id as from_course_id,
      versions.course_id as to_course_id
    from public.course_rule_conditions as conditions
    join public.course_rules as rules on rules.id = conditions.course_rule_id
    join published_versions as versions on versions.id = rules.course_version_id
    where rules.rule_kind = 'prerequisite'
      and conditions.condition_kind = 'course'
      and conditions.required_course_id is not null
  ),
  upstream as (
    select edges.from_course_id, edges.to_course_id
    from edges
    join root on root.course_id = edges.to_course_id

    union

    select edges.from_course_id, edges.to_course_id
    from edges
    join upstream on upstream.from_course_id = edges.to_course_id
  ),
  graph_edges as (
    select upstream.from_course_id, upstream.to_course_id
    from upstream

    union

    select edges.from_course_id, edges.to_course_id
    from edges
    join root on root.course_id = edges.from_course_id
  )
  select
    source_course.code as from_code,
    target_course.code as to_code,
    source_version.id is not null as from_is_available,
    target_version.id is not null as to_is_available
  from graph_edges
  join public.courses as source_course
    on source_course.id = graph_edges.from_course_id
  join public.courses as target_course
    on target_course.id = graph_edges.to_course_id
  left join published_versions as source_version
    on source_version.course_id = graph_edges.from_course_id
  left join published_versions as target_version
    on target_version.course_id = graph_edges.to_course_id
  order by source_course.code, target_course.code;
$function$;

revoke all on function public.published_course_requisite_graph(text) from public;
grant execute on function public.published_course_requisite_graph(text)
to anon, authenticated;

create or replace function public.published_course_detail(p_course_code text)
returns jsonb
language sql
stable
security invoker
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
                'minimum_units', conditions.minimum_units,
                'subject_code', conditions.subject_code,
                'position', conditions.position
              )
              order by conditions.group_id, conditions.position, conditions.id
            )
            from public.course_rule_conditions as conditions
            left join public.courses as required_courses
              on required_courses.id = conditions.required_course_id
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
          join public.course_rules as rules
            on rules.id = rule_references.course_rule_id
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
