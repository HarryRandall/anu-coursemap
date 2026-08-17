-- Keep automatically detected course mentions separate from the reviewed rule
-- tree. A list of references is useful for navigation and graph exploration,
-- but does not assert that each course is required in an `all_of` group.
create table public.course_rule_course_references (
  id bigint generated always as identity primary key,
  course_rule_id bigint not null,
  referenced_course_id bigint not null,
  source_text text not null,
  confidence numeric(5, 4) not null default 0,
  review_state text not null default 'review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_rule_course_references_rule_fkey
    foreign key (course_rule_id)
    references public.course_rules (id) on delete cascade,
  constraint course_rule_course_references_course_fkey
    foreign key (referenced_course_id)
    references public.courses (id),
  constraint course_rule_course_references_unique unique (
    course_rule_id,
    referenced_course_id
  ),
  constraint course_rule_course_references_source_text_not_blank_check
    check (btrim(source_text) <> ''),
  constraint course_rule_course_references_confidence_check
    check (confidence between 0 and 1),
  constraint course_rule_course_references_review_state_check
    check (review_state in ('automatic', 'verified', 'review'))
);

create index course_rule_course_references_rule_idx
  on public.course_rule_course_references (course_rule_id);
create index course_rule_course_references_referenced_course_idx
  on public.course_rule_course_references (referenced_course_id);

create trigger course_rule_course_references_set_updated_at
before update on public.course_rule_course_references
for each row execute function private.set_updated_at();

alter table public.course_rule_course_references enable row level security;

create policy course_rule_course_references_read_published
on public.course_rule_course_references
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.course_rules as rules
    join public.course_versions as versions
      on versions.id = rules.course_version_id
    join public.catalogue_years as years
      on years.id = versions.catalogue_year_id
    where rules.id = course_rule_course_references.course_rule_id
      and versions.publication_status = 'published'
      and years.status = 'published'
  )
);

revoke all on table public.course_rule_course_references from anon, authenticated;
grant select on table public.course_rule_course_references to anon, authenticated;

-- Existing raw prerequisite rules already preserve the ANU source text. Seed
-- identities and references from them so current imports gain graph links on
-- migration, while future imports keep the set in sync in the importer.
insert into public.courses (code)
select distinct upper(matches[1])
from public.course_rules as rules
cross join lateral regexp_matches(
  rules.source_text,
  '\\m([A-Z]{4}[0-9]{4})\\M',
  'g'
) as match(matches)
where rules.rule_kind = 'prerequisite'
on conflict (code) do nothing;

insert into public.course_rule_course_references (
  course_rule_id,
  referenced_course_id,
  source_text,
  confidence,
  review_state
)
select
  rules.id,
  courses.id,
  upper(matches[1]),
  0,
  'review'
from public.course_rules as rules
cross join lateral regexp_matches(
  rules.source_text,
  '\\m([A-Z]{4}[0-9]{4})\\M',
  'g'
) as match(matches)
join public.courses
  on courses.code = upper(matches[1])
where rules.rule_kind = 'prerequisite'
on conflict (course_rule_id, referenced_course_id) do nothing;

-- One indexed recursive query replaces the prior request-time N+1 walk over
-- every prerequisite level. It returns all upstream edges and direct unlocks,
-- retaining unavailable course identities as non-navigable graph nodes.
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
set search_path = public
as $function$
  with recursive
  current_year as (
    select years.id
    from catalogue_years as years
    where years.status = 'published'
    order by years.year desc
    limit 1
  ),
  published_versions as (
    select versions.id, versions.course_id
    from course_versions as versions
    join current_year on current_year.id = versions.catalogue_year_id
    where versions.publication_status = 'published'
  ),
  root as (
    select versions.course_id
    from published_versions as versions
    join courses as course on course.id = versions.course_id
    where course.code = upper(btrim(p_course_code))
    limit 1
  ),
  edges as (
    select
      rule_references.referenced_course_id as from_course_id,
      versions.course_id as to_course_id
    from course_rule_course_references as rule_references
    join course_rules as rules on rules.id = rule_references.course_rule_id
    join published_versions as versions on versions.id = rules.course_version_id
    where rules.rule_kind = 'prerequisite'

    union

    select
      conditions.required_course_id as from_course_id,
      versions.course_id as to_course_id
    from course_rule_conditions as conditions
    join course_rules as rules on rules.id = conditions.course_rule_id
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
  join courses as source_course on source_course.id = graph_edges.from_course_id
  join courses as target_course on target_course.id = graph_edges.to_course_id
  left join published_versions as source_version
    on source_version.course_id = graph_edges.from_course_id
  left join published_versions as target_version
    on target_version.course_id = graph_edges.to_course_id
  order by source_course.code, target_course.code;
$function$;

revoke all on function public.published_course_requisite_graph(text) from public;
grant execute on function public.published_course_requisite_graph(text)
to anon, authenticated;

-- The public course page consumes this in a single request. Keeping the
-- aggregation in Postgres prevents an otherwise unbounded sequence of client
-- queries as the prerequisite chain grows.
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
        select string_agg(rules.source_text, E'\\n\\n' order by rules.id)
        from course_rules as rules
        where rules.course_version_id = target.course_version_id
          and rules.rule_kind = 'prerequisite'
      ),
      'No prerequisites listed.'
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
        select string_agg(rules.source_text, E'\\n\\n' order by rules.id)
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
