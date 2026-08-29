-- Transactional snapshot-native course editing, publication and archival.
-- JSON is accepted only as a transport representation of the complete
-- relational projection. Canonical course data remains in typed tables.

create extension if not exists pgcrypto with schema extensions;

-- Projection keys preserve the natural keys used by the parser and editor so
-- a relational snapshot can be reconstructed byte-for-byte for review.
alter table public.course_rule_groups
  add column projection_key text not null;

alter table public.course_rule_conditions
  add column projection_key text not null;

-- Imported and manually edited snapshots share the extraction contract's
-- stable career codes.
alter table public.course_snapshots
  add constraint course_snapshots_academic_career_check check (
    academic_career is null
    or academic_career in ('UGRD', 'PGRD', 'RSCH', 'OTHER')
  );

alter table public.course_rule_groups
  add constraint course_rule_groups_projection_key_check check (
    btrim(projection_key) <> ''
  );

alter table public.course_rule_conditions
  add constraint course_rule_conditions_projection_key_check check (
    btrim(projection_key) <> ''
  );

create unique index course_rule_groups_snapshot_projection_key_idx
  on public.course_rule_groups (course_snapshot_id, projection_key);

create unique index course_rule_conditions_snapshot_projection_key_idx
  on public.course_rule_conditions (course_snapshot_id, projection_key);

create or replace function private.jsonb_has_exact_keys(
  p_value jsonb,
  p_keys text[]
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select case
    when jsonb_typeof(p_value) <> 'object' then false
    else (
      select coalesce(array_agg(keys.key order by keys.key), array[]::text[])
      from jsonb_object_keys(p_value) as keys(key)
    ) = (
      select coalesce(array_agg(keys.key order by keys.key), array[]::text[])
      from unnest(p_keys) as keys(key)
    )
  end;
$function$;

create or replace function private.jsonb_is_text(
  p_value jsonb,
  p_nullable boolean default false,
  p_allow_blank boolean default false
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_value is null then false
    when p_value = 'null'::jsonb then p_nullable
    when jsonb_typeof(p_value) <> 'string' then false
    else p_allow_blank or btrim(p_value #>> '{}') <> ''
  end;
$function$;

create or replace function private.jsonb_is_number(
  p_value jsonb,
  p_nullable boolean default false,
  p_integer boolean default false
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_value is null then false
    when p_value = 'null'::jsonb then p_nullable
    when jsonb_typeof(p_value) <> 'number' then false
    when p_integer then (p_value #>> '{}')::numeric =
      trunc((p_value #>> '{}')::numeric)
    else true
  end;
$function$;

create or replace function private.jsonb_is_boolean(
  p_value jsonb,
  p_nullable boolean default false
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_value is null then false
    when p_value = 'null'::jsonb then p_nullable
    else jsonb_typeof(p_value) = 'boolean'
  end;
$function$;

create or replace function private.jsonb_positions_are_contiguous(
  p_rows jsonb,
  p_position_key text default 'position'
)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select case
    when jsonb_typeof(p_rows) <> 'array' then false
    else not exists (
      select 1
      from jsonb_array_elements(p_rows)
        with ordinality as rows(value, array_position)
      where not private.jsonb_is_number(
          rows.value -> p_position_key,
          false,
          true
        )
        or (rows.value ->> p_position_key)::numeric
          <> rows.array_position::numeric
    )
  end;
$function$;

revoke all on function private.jsonb_positions_are_contiguous(jsonb, text)
from public, anon, authenticated;

create or replace function private.canonical_jsonb_text(p_value jsonb)
returns text
language plpgsql
stable
strict
set search_path = ''
as $function$
declare
  result text;
begin
  case jsonb_typeof(p_value)
    when 'object' then
      select '{' || coalesce(
        string_agg(
          to_jsonb(entries.key)::text || ':' ||
            private.canonical_jsonb_text(entries.value),
          ',' order by entries.key
        ),
        ''
      ) || '}'
      into result
      from jsonb_each(p_value) as entries(key, value);
    when 'array' then
      select '[' || coalesce(
        string_agg(
          private.canonical_jsonb_text(items.value),
          ',' order by items.position
        ),
        ''
      ) || ']'
      into result
      from jsonb_array_elements(p_value)
        with ordinality as items(value, position);
    else
      result := p_value::text;
  end case;

  return result;
end;
$function$;

create or replace function private.course_snapshot_projection_sha256(
  p_projection jsonb
)
returns text
language sql
stable
strict
set search_path = ''
as $function$
  select encode(
    extensions.digest(
      convert_to(
        private.canonical_jsonb_text(
          jsonb_set(
            p_projection,
            '{snapshot,sourceUpdatedAt}',
            'null'::jsonb,
            false
          )
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$function$;

create or replace function private.course_snapshot_projection_diff(
  p_old jsonb,
  p_new jsonb,
  p_path text default '$'
)
returns table (
  field_path text,
  old_value jsonb,
  new_value jsonb
)
language plpgsql
immutable
set search_path = ''
as $function$
declare
  key text;
  maximum_length integer;
begin
  if p_old is not distinct from p_new then
    return;
  end if;

  if jsonb_typeof(p_old) = 'object' and jsonb_typeof(p_new) = 'object' then
    for key in
      select object_keys.key
      from (
        select jsonb_object_keys(p_old) as key
        union
        select jsonb_object_keys(p_new) as key
      ) as object_keys
      order by object_keys.key
    loop
      return query
      select *
      from private.course_snapshot_projection_diff(
        p_old -> key,
        p_new -> key,
        p_path || '.' || key
      );
    end loop;
    return;
  end if;

  if jsonb_typeof(p_old) = 'array' and jsonb_typeof(p_new) = 'array' then
    maximum_length := greatest(jsonb_array_length(p_old), jsonb_array_length(p_new));
    if maximum_length = 0 then
      return;
    end if;
    for array_position in 0..maximum_length - 1 loop
      return query
      select *
      from private.course_snapshot_projection_diff(
        case
          when array_position < jsonb_array_length(p_old)
            then p_old -> array_position
          else null
        end,
        case
          when array_position < jsonb_array_length(p_new)
            then p_new -> array_position
          else null
        end,
        p_path || '[' || array_position::text || ']'
      );
    end loop;
    return;
  end if;

  field_path := p_path;
  old_value := p_old;
  new_value := p_new;
  return next;
end;
$function$;

create or replace function private.course_snapshot_projection(
  p_course_snapshot_id bigint
)
returns jsonb
language sql
stable
set search_path = ''
as $function$
  with selected_snapshot as (
    select
      snapshots.*,
      courses.code as course_code,
      academic_years.year as academic_year
    from public.course_snapshots as snapshots
    join public.course_years as course_years
      on course_years.id = snapshots.course_year_id
    join public.courses as courses on courses.id = course_years.course_id
    join public.academic_years
      on academic_years.id = snapshots.academic_year_id
    where snapshots.id = p_course_snapshot_id
  ),
  selected_offering as (
    select offerings.*
    from public.course_offerings as offerings
    where offerings.course_snapshot_id = p_course_snapshot_id
  )
  select jsonb_build_object(
    'courseCode', snapshot.course_code,
    'academicYear', snapshot.academic_year,
    'snapshot', jsonb_build_object(
      'title', snapshot.title,
      'unitValueKind', snapshot.unit_value_kind,
      'units', snapshot.units,
      'minimumUnits', snapshot.minimum_units,
      'maximumUnits', snapshot.maximum_units,
      'eftsl', snapshot.eftsl,
      'level', snapshot.level,
      'subjectCode', snapshot.subject_code,
      'subjectName', snapshot.subject_name,
      'school', snapshot.school,
      'college', snapshot.college,
      'academicCareer', snapshot.academic_career,
      'convenerText', snapshot.convener_text,
      'deliverySummary', snapshot.delivery_summary,
      'introduction', snapshot.introduction,
      'description', snapshot.description,
      'workloadText', snapshot.workload_text,
      'workloadHours', snapshot.workload_hours,
      'inherentRequirements', snapshot.inherent_requirements,
      'prescribedTexts', snapshot.prescribed_texts,
      'offeringStatus', snapshot.offering_status,
      'sourceUpdatedAt', snapshot.source_updated_at
    ),
    'unitOptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', options.position,
        'units', options.units,
        'label', options.label,
        'sourceText', options.source_text
      ) order by options.position)
      from public.course_unit_options as options
      where options.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'fees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', fees.position,
        'feeYear', fees.fee_year,
        'audience', fees.audience,
        'feeType', fees.fee_type,
        'amount', fees.amount,
        'currency', fees.currency,
        'basis', fees.basis,
        'studentContributionBand', fees.student_contribution_band,
        'sourceLabel', fees.source_label,
        'sourceText', fees.source_text
      ) order by fees.position)
      from public.course_fees as fees
      where fees.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'areasOfInterest', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', areas.position,
        'name', areas.name
      ) order by areas.position)
      from public.course_areas_of_interest as areas
      where areas.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'attributes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', attributes.position,
        'attributeKind', attributes.attribute_kind,
        'value', attributes.value,
        'sourceText', attributes.source_text
      ) order by attributes.position)
      from public.course_attributes as attributes
      where attributes.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'relatedCourses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', related.position,
        'relationKind', related.relation_kind,
        'sourceCourseCode', related.source_course_code,
        'sourceCourseTitle', related.source_course_title,
        'sourceText', related.source_text
      ) order by related.position)
      from public.course_related_courses as related
      where related.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'courseOffering', (
      select jsonb_build_object(
        'deliveryMode', offerings.delivery_mode,
        'location', offerings.location
      )
      from selected_offering as offerings
    ),
    'offeringSessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', sessions.position,
        'calendarYear', snapshot.academic_year,
        'academicPeriodCode', sessions.academic_period_code,
        'academicPeriodName', sessions.academic_period_name,
        'classNumber', sessions.class_number,
        'startsOn', sessions.starts_on,
        'enrolClosesOn', sessions.enrol_closes_on,
        'censusOn', sessions.census_on,
        'endsOn', sessions.ends_on,
        'deliveryMode', sessions.delivery_mode,
        'location', sessions.location,
        'classSummaryUrl', sessions.class_summary_url,
        'sourceText', sessions.source_text
      ) order by sessions.position)
      from public.offering_sessions as sessions
      where sessions.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'learningOutcomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', outcomes.position,
        'body', outcomes.body
      ) order by outcomes.position)
      from public.course_learning_outcomes as outcomes
      where outcomes.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'assessmentItems', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', items.position,
        'title', items.title,
        'weight', items.weight,
        'hurdle', items.hurdle,
        'dueText', items.due_text,
        'sourceText', items.source_text
      ) order by items.position)
      from public.course_assessment_items as items
      where items.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'assessmentOutcomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'assessmentPosition', items.position,
        'learningOutcomePosition', outcomes.position
      ) order by items.position, outcomes.position)
      from public.course_assessment_outcomes as links
      join public.course_assessment_items as items
        on items.id = links.assessment_item_id
      join public.course_learning_outcomes as outcomes
        on outcomes.id = links.learning_outcome_id
      where links.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', rules.rule_kind,
        'ruleKind', rules.rule_kind,
        'hardness', rules.hardness,
        'sourceText', rules.source_text
      ) order by case rules.rule_kind
        when 'prerequisite' then 1
        when 'corequisite' then 2
        when 'incompatibility' then 3
        when 'permission' then 4
        when 'assumed_knowledge' then 5
        else 6
      end)
      from public.course_rules as rules
      where rules.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'ruleGroups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', groups.projection_key,
        'ruleKey', rules.rule_kind,
        'parentGroupKey', parents.projection_key,
        'operator', groups.operator,
        'minimumCount', groups.minimum_count,
        'position', groups.position
      ) order by case rules.rule_kind
        when 'prerequisite' then 1
        when 'corequisite' then 2
        when 'incompatibility' then 3
        when 'permission' then 4
        when 'assumed_knowledge' then 5
        else 6
      end, groups.projection_key)
      from public.course_rule_groups as groups
      join public.course_rules as rules on rules.id = groups.course_rule_id
      left join public.course_rule_groups as parents
        on parents.id = groups.parent_group_id
      where groups.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'ruleConditions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', conditions.projection_key,
        'ruleKey', rules.rule_kind,
        'groupKey', groups.projection_key,
        'position', conditions.position,
        'conditionKind', conditions.condition_kind,
        'requiredCourseCode', required_courses.code,
        'requiredStructureCode', required_structures.code,
        'minimumUnits', conditions.minimum_units,
        'minimumMark', conditions.minimum_mark,
        'subjectCode', conditions.subject_code,
        'minimumCourseLevel', conditions.minimum_course_level,
        'maximumCourseLevel', conditions.maximum_course_level,
        'minimumGpa', conditions.minimum_gpa,
        'minimumYear', conditions.minimum_year,
        'minimumWam', conditions.minimum_wam,
        'freeText', conditions.free_text,
        'courseRequirementMode', conditions.course_requirement_mode,
        'hardness', conditions.hardness,
        'sourceText', conditions.source_text
      ) order by case rules.rule_kind
        when 'prerequisite' then 1
        when 'corequisite' then 2
        when 'incompatibility' then 3
        when 'permission' then 4
        when 'assumed_knowledge' then 5
        else 6
      end, conditions.projection_key)
      from public.course_rule_conditions as conditions
      join public.course_rules as rules on rules.id = conditions.course_rule_id
      join public.course_rule_groups as groups on groups.id = conditions.group_id
      left join public.courses as required_courses
        on required_courses.id = conditions.required_course_id
      left join public.academic_structures as required_structures
        on required_structures.id = conditions.required_structure_id
      where conditions.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'ruleConditionCourses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'conditionKey', conditions.projection_key,
        'position', members.position,
        'sourceCourseCode', members.source_course_code,
        'sourceText', members.source_text
      ) order by conditions.projection_key, members.position)
      from public.course_rule_condition_courses as members
      join public.course_rule_conditions as conditions
        on conditions.id = members.condition_id
      where members.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb),
    'ruleCourseReferences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ruleKey', rules.rule_kind,
        'referencedCourseCode', courses.code,
        'sourceText', rule_references.source_text
      ) order by rules.rule_kind, courses.code)
      from public.course_rule_course_references as rule_references
      join public.course_rules as rules
        on rules.id = rule_references.course_rule_id
      join public.courses on courses.id = rule_references.referenced_course_id
      where rule_references.course_snapshot_id = p_course_snapshot_id
    ), '[]'::jsonb)
  )
  from selected_snapshot as snapshot;
$function$;

revoke all on function private.jsonb_has_exact_keys(jsonb, text[])
from public, anon, authenticated;
revoke all on function private.jsonb_is_text(jsonb, boolean, boolean)
from public, anon, authenticated;
revoke all on function private.jsonb_is_number(jsonb, boolean, boolean)
from public, anon, authenticated;
revoke all on function private.jsonb_is_boolean(jsonb, boolean)
from public, anon, authenticated;
revoke all on function private.canonical_jsonb_text(jsonb)
from public, anon, authenticated;
revoke all on function private.course_snapshot_projection_sha256(jsonb)
from public, anon, authenticated;
revoke all on function private.course_snapshot_projection_diff(jsonb, jsonb, text)
from public, anon, authenticated;
revoke all on function private.course_snapshot_projection(bigint)
from public, anon, authenticated;

create or replace function private.validate_course_snapshot_projection(
  p_projection jsonb,
  p_expected_course_code text,
  p_expected_academic_year smallint
)
returns void
language plpgsql
set search_path = ''
as $function$
declare
  collection_name text;
  expected_keys text[];
  scalar_name text;
  snapshot_data jsonb;
  unit_kind text;
  unit_count integer;
  minimum_units numeric;
  maximum_units numeric;
begin
  if not private.jsonb_has_exact_keys(
    p_projection,
    array[
      'courseCode', 'academicYear', 'snapshot', 'unitOptions', 'fees',
      'areasOfInterest', 'attributes', 'relatedCourses', 'courseOffering',
      'offeringSessions', 'learningOutcomes', 'assessmentItems',
      'assessmentOutcomes', 'rules', 'ruleGroups', 'ruleConditions',
      'ruleConditionCourses', 'ruleCourseReferences'
    ]
  ) then
    raise exception 'The course projection fields do not match the current schema.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_projection -> 'courseCode') <> 'string'
    or p_projection ->> 'courseCode' !~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
    or jsonb_typeof(p_projection -> 'academicYear') <> 'number'
  then
    raise exception 'The course identity fields have invalid types or formats.'
      using errcode = '22023';
  end if;

  if (p_projection ->> 'academicYear')::numeric
      <> trunc((p_projection ->> 'academicYear')::numeric)
    or p_projection ->> 'courseCode' is distinct from p_expected_course_code
    or (p_projection ->> 'academicYear')::numeric
      is distinct from p_expected_academic_year::numeric
  then
    raise exception 'The course projection belongs to a different course or year.'
      using errcode = '22023';
  end if;

  snapshot_data := p_projection -> 'snapshot';
  if not private.jsonb_has_exact_keys(
    snapshot_data,
    array[
      'title', 'unitValueKind', 'units', 'minimumUnits', 'maximumUnits',
      'eftsl', 'level', 'subjectCode', 'subjectName', 'school', 'college',
      'academicCareer', 'convenerText', 'deliverySummary', 'introduction',
      'description', 'workloadText', 'workloadHours', 'inherentRequirements',
      'prescribedTexts', 'offeringStatus', 'sourceUpdatedAt'
    ]
  ) then
    raise exception 'The course snapshot fields do not match the current schema.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(snapshot_data -> 'title') <> 'string'
    or btrim(snapshot_data ->> 'title') = ''
    or jsonb_typeof(snapshot_data -> 'unitValueKind') <> 'string'
    or snapshot_data ->> 'unitValueKind' not in (
      'fixed', 'range', 'variable', 'unknown'
    )
    or jsonb_typeof(snapshot_data -> 'level') <> 'number'
    or (snapshot_data ->> 'level')::numeric
      <> trunc((snapshot_data ->> 'level')::numeric)
    or (snapshot_data ->> 'level')::numeric not between 0 and 9999
    or jsonb_typeof(snapshot_data -> 'subjectCode') <> 'string'
    or snapshot_data ->> 'subjectCode' !~ '^[A-Z]{4}$'
    or jsonb_typeof(snapshot_data -> 'offeringStatus') <> 'string'
    or snapshot_data ->> 'offeringStatus' not in (
      'offered', 'not_offered', 'unknown'
    )
  then
    raise exception 'The required course snapshot values are invalid.'
      using errcode = '22023';
  end if;

  foreach scalar_name in array array[
    'units', 'minimumUnits', 'maximumUnits', 'eftsl', 'workloadHours'
  ]
  loop
    if jsonb_typeof(snapshot_data -> scalar_name) not in ('number', 'null') then
      raise exception 'Snapshot field % must be a number or null.', scalar_name
        using errcode = '22023';
    end if;
  end loop;

  foreach scalar_name in array array[
    'subjectName', 'school', 'college', 'convenerText', 'deliverySummary',
    'introduction', 'description', 'workloadText', 'inherentRequirements',
    'prescribedTexts', 'sourceUpdatedAt'
  ]
  loop
    if jsonb_typeof(snapshot_data -> scalar_name) not in ('string', 'null') then
      raise exception 'Snapshot field % must be text or null.', scalar_name
        using errcode = '22023';
    end if;
  end loop;

  if jsonb_typeof(snapshot_data -> 'academicCareer') not in ('string', 'null')
    or (
      snapshot_data -> 'academicCareer' <> 'null'::jsonb
      and snapshot_data ->> 'academicCareer' not in (
        'UGRD', 'PGRD', 'RSCH', 'OTHER'
      )
    )
  then
    raise exception 'Academic career must use a canonical career code or null.'
      using errcode = '22023';
  end if;

  foreach collection_name in array array[
    'unitOptions', 'fees', 'areasOfInterest', 'attributes', 'relatedCourses',
    'offeringSessions', 'learningOutcomes', 'assessmentItems',
    'assessmentOutcomes', 'rules', 'ruleGroups', 'ruleConditions',
    'ruleConditionCourses', 'ruleCourseReferences'
  ]
  loop
    if jsonb_typeof(p_projection -> collection_name) <> 'array' then
      raise exception 'Projection collection % must be an array.', collection_name
        using errcode = '22023';
    end if;
  end loop;

  for collection_name, expected_keys in
    select * from (values
      ('unitOptions', array['position','units','label','sourceText']::text[]),
      ('fees', array[
        'position','feeYear','audience','feeType','amount','currency','basis',
        'studentContributionBand','sourceLabel','sourceText'
      ]::text[]),
      ('areasOfInterest', array['position','name']::text[]),
      ('attributes', array[
        'position','attributeKind','value','sourceText'
      ]::text[]),
      ('relatedCourses', array[
        'position','relationKind','sourceCourseCode','sourceCourseTitle','sourceText'
      ]::text[]),
      ('offeringSessions', array[
        'position','calendarYear','academicPeriodCode','academicPeriodName',
        'classNumber','startsOn','enrolClosesOn','censusOn','endsOn',
        'deliveryMode','location','classSummaryUrl','sourceText'
      ]::text[]),
      ('learningOutcomes', array['position','body']::text[]),
      ('assessmentItems', array[
        'position','title','weight','hurdle','dueText','sourceText'
      ]::text[]),
      ('assessmentOutcomes', array[
        'assessmentPosition','learningOutcomePosition'
      ]::text[]),
      ('rules', array['key','ruleKind','hardness','sourceText']::text[]),
      ('ruleGroups', array[
        'key','ruleKey','parentGroupKey','operator','minimumCount','position'
      ]::text[]),
      ('ruleConditions', array[
        'key','ruleKey','groupKey','position','conditionKind',
        'requiredCourseCode','requiredStructureCode','minimumUnits','minimumMark','subjectCode',
        'minimumCourseLevel','maximumCourseLevel','minimumGpa','minimumYear',
        'minimumWam','freeText','courseRequirementMode','hardness','sourceText'
      ]::text[]),
      ('ruleConditionCourses', array[
        'conditionKey','position','sourceCourseCode','sourceText'
      ]::text[]),
      ('ruleCourseReferences', array[
        'ruleKey','referencedCourseCode','sourceText'
      ]::text[])
    ) as schemas(collection_name, expected_keys)
  loop
    if exists (
      select 1
      from jsonb_array_elements(p_projection -> collection_name) as items(value)
      where not private.jsonb_has_exact_keys(items.value, expected_keys)
    ) then
      raise exception 'Projection collection % has invalid row fields.', collection_name
        using errcode = '22023';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'unitOptions') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_number(rows.value -> 'units')
      or not private.jsonb_is_text(rows.value -> 'label', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'fees') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_number(rows.value -> 'feeYear', true, true)
      or not private.jsonb_is_text(rows.value -> 'audience')
      or rows.value ->> 'audience' not in (
        'domestic', 'international', 'commonwealth_supported', 'other'
      )
      or not private.jsonb_is_text(rows.value -> 'feeType')
      or rows.value ->> 'feeType' not in (
        'student_contribution', 'tuition', 'indicative', 'other'
      )
      or not private.jsonb_is_number(rows.value -> 'amount', true)
      or not private.jsonb_is_text(rows.value -> 'currency', true)
      or not private.jsonb_is_text(rows.value -> 'basis')
      or rows.value ->> 'basis' not in (
        'course', 'unit', 'eftsl', 'annual', 'unknown'
      )
      or not private.jsonb_is_number(
        rows.value -> 'studentContributionBand', true, true
      )
      or not private.jsonb_is_text(rows.value -> 'sourceLabel', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'areasOfInterest') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_text(rows.value -> 'name')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'attributes') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_text(rows.value -> 'attributeKind')
      or rows.value ->> 'attributeKind' not in (
        'graduate_attribute', 'stem', 'other'
      )
      or not private.jsonb_is_text(rows.value -> 'value')
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'relatedCourses') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_text(rows.value -> 'relationKind')
      or rows.value ->> 'relationKind' not in ('co_taught', 'equivalent', 'other')
      or not private.jsonb_is_text(rows.value -> 'sourceCourseCode')
      or rows.value ->> 'sourceCourseCode' !~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
      or not private.jsonb_is_text(rows.value -> 'sourceCourseTitle', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) then
    raise exception 'A basic course collection contains invalid values.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'offeringSessions') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_number(rows.value -> 'calendarYear', false, true)
      or not private.jsonb_is_text(rows.value -> 'academicPeriodCode')
      or not private.jsonb_is_text(rows.value -> 'academicPeriodName')
      or not private.jsonb_is_text(rows.value -> 'classNumber', true)
      or not private.jsonb_is_text(rows.value -> 'startsOn', true)
      or not private.jsonb_is_text(rows.value -> 'enrolClosesOn', true)
      or not private.jsonb_is_text(rows.value -> 'censusOn', true)
      or not private.jsonb_is_text(rows.value -> 'endsOn', true)
      or not private.jsonb_is_text(rows.value -> 'deliveryMode', true)
      or not private.jsonb_is_text(rows.value -> 'location', true)
      or not private.jsonb_is_text(rows.value -> 'classSummaryUrl', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'learningOutcomes') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_text(rows.value -> 'body')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'assessmentItems') as rows(value)
    where case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 1
      else true
    end
      or not private.jsonb_is_text(rows.value -> 'title')
      or not private.jsonb_is_number(rows.value -> 'weight', true)
      or not private.jsonb_is_boolean(rows.value -> 'hurdle', true)
      or not private.jsonb_is_text(rows.value -> 'dueText', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'assessmentOutcomes') as rows(value)
    where case
      when private.jsonb_is_number(
        rows.value -> 'assessmentPosition', false, true
      ) then (rows.value ->> 'assessmentPosition')::numeric < 1
      else true
    end
      or case
        when private.jsonb_is_number(
          rows.value -> 'learningOutcomePosition', false, true
        ) then (rows.value ->> 'learningOutcomePosition')::numeric < 1
        else true
      end
  ) then
    raise exception 'An offering, outcome or assessment contains invalid values.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'rules') as rows(value)
    where not private.jsonb_is_text(rows.value -> 'key')
      or not private.jsonb_is_text(rows.value -> 'ruleKind')
      or rows.value ->> 'ruleKind' not in (
        'prerequisite', 'corequisite', 'incompatibility', 'permission',
        'assumed_knowledge'
      )
      or not private.jsonb_is_text(rows.value -> 'hardness')
      or rows.value ->> 'hardness' not in ('hard', 'advisory')
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'ruleGroups') as rows(value)
    where not private.jsonb_is_text(rows.value -> 'key')
      or not private.jsonb_is_text(rows.value -> 'ruleKey')
      or not private.jsonb_is_text(rows.value -> 'parentGroupKey', true)
      or not private.jsonb_is_text(rows.value -> 'operator')
      or rows.value ->> 'operator' not in ('all_of', 'any_of', 'at_least')
      or not private.jsonb_is_number(rows.value -> 'minimumCount', true, true)
      or case
        when private.jsonb_is_number(rows.value -> 'position', false, true)
          then (rows.value ->> 'position')::numeric < 0
        else true
      end
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'ruleConditions') as rows(value)
    where not private.jsonb_is_text(rows.value -> 'key')
      or not private.jsonb_is_text(rows.value -> 'ruleKey')
      or not private.jsonb_is_text(rows.value -> 'groupKey')
      or case
      when private.jsonb_is_number(rows.value -> 'position', false, true)
        then (rows.value ->> 'position')::numeric < 0
      else true
    end
      or not private.jsonb_is_text(rows.value -> 'conditionKind')
      or rows.value ->> 'conditionKind' not in (
        'course', 'incompatible', 'units_total', 'subject_units',
        'level_units', 'course_set_units', 'year_standing', 'permission',
        'admission', 'gpa', 'wam', 'other'
      )
      or not private.jsonb_is_text(rows.value -> 'requiredCourseCode', true)
      or (
        rows.value ->> 'requiredCourseCode' is not null
        and rows.value ->> 'requiredCourseCode' !~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
      )
      or not private.jsonb_is_text(rows.value -> 'requiredStructureCode', true)
      or not private.jsonb_is_number(rows.value -> 'minimumUnits', true)
      or not private.jsonb_is_number(rows.value -> 'minimumMark', true)
      or not private.jsonb_is_text(rows.value -> 'subjectCode', true)
      or not private.jsonb_is_number(
        rows.value -> 'minimumCourseLevel', true, true
      )
      or not private.jsonb_is_number(
        rows.value -> 'maximumCourseLevel', true, true
      )
      or not private.jsonb_is_number(rows.value -> 'minimumGpa', true)
      or not private.jsonb_is_number(rows.value -> 'minimumYear', true, true)
      or not private.jsonb_is_number(rows.value -> 'minimumWam', true)
      or not private.jsonb_is_text(rows.value -> 'freeText', true)
      or (
        rows.value -> 'courseRequirementMode' <> 'null'::jsonb
        and rows.value ->> 'courseRequirementMode' not in (
          'completed', 'completed_or_concurrent'
        )
      )
      or not private.jsonb_is_text(rows.value -> 'hardness')
      or rows.value ->> 'hardness' not in ('hard', 'advisory')
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'ruleConditionCourses')
      as rows(value)
    where not private.jsonb_is_text(rows.value -> 'conditionKey')
      or case
        when private.jsonb_is_number(rows.value -> 'position', false, true)
          then (rows.value ->> 'position')::numeric < 1
        else true
      end
      or not private.jsonb_is_text(rows.value -> 'sourceCourseCode')
      or rows.value ->> 'sourceCourseCode' !~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'ruleCourseReferences')
      as rows(value)
    where not private.jsonb_is_text(rows.value -> 'ruleKey')
      or not private.jsonb_is_text(rows.value -> 'referencedCourseCode')
      or rows.value ->> 'referencedCourseCode' !~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) then
    raise exception 'A course rule collection contains invalid values.'
      using errcode = '22023';
  end if;

  foreach collection_name in array array[
    'unitOptions', 'fees', 'areasOfInterest', 'attributes', 'relatedCourses',
    'offeringSessions', 'learningOutcomes', 'assessmentItems'
  ]
  loop
    if not private.jsonb_positions_are_contiguous(
      p_projection -> collection_name
    ) then
      raise exception 'Positioned course collections must use contiguous positions.'
        using errcode = '22023';
    end if;
  end loop;

  if p_projection -> 'courseOffering' <> 'null'::jsonb
    and not private.jsonb_has_exact_keys(
      p_projection -> 'courseOffering',
      array['deliveryMode', 'location']
    )
  then
    raise exception 'The course offering fields do not match the current schema.'
      using errcode = '22023';
  end if;

  if p_projection -> 'courseOffering' <> 'null'::jsonb
    and (
      jsonb_typeof(p_projection -> 'courseOffering' -> 'deliveryMode')
        not in ('string', 'null')
      or jsonb_typeof(p_projection -> 'courseOffering' -> 'location')
        not in ('string', 'null')
    )
  then
    raise exception 'Course offering values must be text or null.'
      using errcode = '22023';
  end if;

  if (
    p_projection -> 'courseOffering' = 'null'::jsonb
  ) <> (
    jsonb_array_length(p_projection -> 'offeringSessions') = 0
  ) then
    raise exception 'A course offering and its sessions must be supplied together.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'offeringSessions') as sessions(value)
    where (sessions.value ->> 'calendarYear')::smallint
      <> p_expected_academic_year
  ) then
    raise exception 'Offering sessions must belong to the selected academic year.'
      using errcode = '22023';
  end if;

  unit_kind := snapshot_data ->> 'unitValueKind';
  unit_count := jsonb_array_length(p_projection -> 'unitOptions');
  minimum_units := (snapshot_data ->> 'minimumUnits')::numeric;
  maximum_units := (snapshot_data ->> 'maximumUnits')::numeric;

  if not (
    (
      unit_kind = 'fixed'
      and snapshot_data ->> 'units' is not null
      and minimum_units is null
      and maximum_units is null
      and unit_count = 0
    )
    or (
      unit_kind = 'range'
      and snapshot_data ->> 'units' is null
      and minimum_units is not null
      and maximum_units is not null
      and maximum_units >= minimum_units
      and unit_count = 0
    )
    or (
      unit_kind = 'variable'
      and snapshot_data ->> 'units' is null
      and unit_count > 0
      and minimum_units = (
        select min((options.value ->> 'units')::numeric)
        from jsonb_array_elements(p_projection -> 'unitOptions') as options(value)
      )
      and maximum_units = (
        select max((options.value ->> 'units')::numeric)
        from jsonb_array_elements(p_projection -> 'unitOptions') as options(value)
      )
    )
    or (
      unit_kind = 'unknown'
      and snapshot_data ->> 'units' is null
      and minimum_units is null
      and maximum_units is null
      and unit_count = 0
    )
  ) then
    raise exception 'The unit value and unit options are inconsistent.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'rules') as rules(value)
    where rules.value ->> 'key' is distinct from rules.value ->> 'ruleKind'
      or rules.value ->> 'ruleKind' not in (
        'prerequisite', 'corequisite', 'incompatibility', 'permission',
        'assumed_knowledge'
      )
  ) then
    raise exception 'Course rule keys must match supported rule kinds.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'rules') as rules(value)
    group by rules.value ->> 'key'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'ruleGroups') as groups(value)
    group by groups.value ->> 'key'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'ruleConditions')
      as conditions(value)
    group by conditions.value ->> 'key'
    having count(*) > 1
  ) then
    raise exception 'Course rule, group and condition keys must be unique.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'ruleConditions')
      as conditions(value)
    where conditions.value ->> 'requiredStructureCode' is not null
      and not exists (
        select 1
        from public.academic_structures as structures
        where structures.code = conditions.value ->> 'requiredStructureCode'
      )
  ) then
    raise exception 'A rule condition references an unknown academic structure.'
      using errcode = '22023';
  end if;
end;
$function$;

revoke all on function private.validate_course_snapshot_projection(
  jsonb,
  text,
  smallint
) from public, anon, authenticated;

create or replace function public.create_course_manual_snapshot(
  p_course_year_id bigint,
  p_expected_base_snapshot_id bigint,
  p_projection jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_user_id uuid;
  selected_course_year public.course_years;
  base_snapshot public.course_snapshots;
  base_snapshot_id bigint;
  selected_course_code text;
  selected_academic_year smallint;
  base_projection jsonb;
  snapshot_data jsonb;
  new_snapshot_id bigint;
  next_snapshot_number integer;
  new_offering_id bigint;
  new_rule_id bigint;
  new_group_id bigint;
  new_condition_id bigint;
  rule_ids jsonb := '{}'::jsonb;
  group_ids jsonb := '{}'::jsonb;
  condition_ids jsonb := '{}'::jsonb;
  item jsonb;
  inserted_count integer;
  pending_count integer;
begin
  selected_user_id := (select auth.uid());
  if selected_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if not (select private.has_permission('courses.write')) then
    raise exception 'Course write permission is required.' using errcode = '42501';
  end if;

  select course_years.*
  into selected_course_year
  from public.course_years as course_years
  where course_years.id = p_course_year_id
  for update;

  if not found then
    raise exception 'The course year was not found.' using errcode = 'P0002';
  end if;
  if selected_course_year.lifecycle_status <> 'active' then
    raise exception 'Archived course years cannot be edited.' using errcode = '55000';
  end if;

  base_snapshot_id := coalesce(
    selected_course_year.draft_snapshot_id,
    selected_course_year.published_snapshot_id
  );
  if base_snapshot_id is distinct from p_expected_base_snapshot_id then
    raise exception 'The course draft changed while it was being edited.'
      using errcode = '40001';
  end if;
  if base_snapshot_id is null then
    raise exception 'The course year does not have a saved snapshot to edit.'
      using errcode = '55000';
  end if;

  select snapshots.*
  into base_snapshot
  from public.course_snapshots as snapshots
  where snapshots.id = base_snapshot_id
    and snapshots.course_year_id = p_course_year_id;

  if not found or base_snapshot.sealed_at is null then
    raise exception 'The current course snapshot is not sealed.'
      using errcode = '55000';
  end if;
  if base_snapshot.source_page_id is null then
    raise exception 'The current course snapshot has no source provenance.'
      using errcode = '55000';
  end if;

  select courses.code, academic_years.year
  into selected_course_code, selected_academic_year
  from public.courses
  join public.academic_years
    on academic_years.id = selected_course_year.academic_year_id
  where courses.id = selected_course_year.course_id;

  perform private.validate_course_snapshot_projection(
    p_projection,
    selected_course_code,
    selected_academic_year
  );

  base_projection := private.course_snapshot_projection(base_snapshot_id);
  if base_projection is null then
    raise exception 'The current course snapshot projection could not be reconstructed.'
      using errcode = '55000';
  end if;
  if p_projection -> 'snapshot' -> 'sourceUpdatedAt'
    is distinct from base_projection -> 'snapshot' -> 'sourceUpdatedAt'
  then
    raise exception 'Source update provenance cannot be edited.'
      using errcode = '22023';
  end if;
  if p_projection = base_projection and not base_snapshot.has_critical_uncertainty then
    raise exception 'No canonical course fields changed.' using errcode = '22023';
  end if;

  insert into public.courses (code)
  select distinct referenced.code
  from (
    select related.value ->> 'sourceCourseCode' as code
    from jsonb_array_elements(p_projection -> 'relatedCourses') as related(value)
    union
    select conditions.value ->> 'requiredCourseCode'
    from jsonb_array_elements(p_projection -> 'ruleConditions') as conditions(value)
    where conditions.value ->> 'requiredCourseCode' is not null
    union
    select members.value ->> 'sourceCourseCode'
    from jsonb_array_elements(p_projection -> 'ruleConditionCourses') as members(value)
    union
    select rule_references.value ->> 'referencedCourseCode'
    from jsonb_array_elements(p_projection -> 'ruleCourseReferences')
      as rule_references(value)
  ) as referenced
  where referenced.code ~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  on conflict (code) do nothing;

  if exists (
    select 1
    from (
      select related.value ->> 'sourceCourseCode' as code
      from jsonb_array_elements(p_projection -> 'relatedCourses') as related(value)
      union all
      select conditions.value ->> 'requiredCourseCode'
      from jsonb_array_elements(p_projection -> 'ruleConditions') as conditions(value)
      where conditions.value ->> 'requiredCourseCode' is not null
      union all
      select members.value ->> 'sourceCourseCode'
      from jsonb_array_elements(p_projection -> 'ruleConditionCourses') as members(value)
      union all
      select rule_references.value ->> 'referencedCourseCode'
      from jsonb_array_elements(p_projection -> 'ruleCourseReferences')
        as rule_references(value)
    ) as referenced
    where referenced.code !~ '^[A-Z]{4}[0-9]{4}[A-Z]?$'
  ) then
    raise exception 'A related course code is invalid.' using errcode = '22023';
  end if;

  select coalesce(max(snapshots.snapshot_number), 0) + 1
  into next_snapshot_number
  from public.course_snapshots as snapshots
  where snapshots.course_year_id = p_course_year_id;

  snapshot_data := p_projection -> 'snapshot';
  insert into public.course_snapshots (
    course_year_id,
    academic_year_id,
    snapshot_number,
    origin,
    based_on_snapshot_id,
    source_page_id,
    projection_sha256,
    schema_version,
    validation_status,
    overall_confidence,
    has_critical_uncertainty,
    title,
    unit_value_kind,
    units,
    minimum_units,
    maximum_units,
    eftsl,
    level,
    subject_code,
    subject_name,
    school,
    college,
    academic_career,
    convener_text,
    delivery_summary,
    introduction,
    description,
    workload_text,
    workload_hours,
    inherent_requirements,
    prescribed_texts,
    offering_status,
    source_updated_at,
    created_by
  ) values (
    p_course_year_id,
    selected_course_year.academic_year_id,
    next_snapshot_number,
    'manual_edit',
    base_snapshot_id,
    base_snapshot.source_page_id,
    private.course_snapshot_projection_sha256(p_projection),
    base_snapshot.schema_version,
    'valid',
    base_snapshot.overall_confidence,
    false,
    snapshot_data ->> 'title',
    snapshot_data ->> 'unitValueKind',
    (snapshot_data ->> 'units')::numeric,
    (snapshot_data ->> 'minimumUnits')::numeric,
    (snapshot_data ->> 'maximumUnits')::numeric,
    (snapshot_data ->> 'eftsl')::numeric,
    (snapshot_data ->> 'level')::smallint,
    snapshot_data ->> 'subjectCode',
    snapshot_data ->> 'subjectName',
    snapshot_data ->> 'school',
    snapshot_data ->> 'college',
    snapshot_data ->> 'academicCareer',
    snapshot_data ->> 'convenerText',
    snapshot_data ->> 'deliverySummary',
    snapshot_data ->> 'introduction',
    snapshot_data ->> 'description',
    snapshot_data ->> 'workloadText',
    (snapshot_data ->> 'workloadHours')::numeric,
    snapshot_data ->> 'inherentRequirements',
    snapshot_data ->> 'prescribedTexts',
    snapshot_data ->> 'offeringStatus',
    base_snapshot.source_updated_at,
    selected_user_id
  )
  returning id into new_snapshot_id;

  insert into public.course_unit_options (
    course_snapshot_id, position, units, label, source_text
  )
  select
    new_snapshot_id,
    (options.value ->> 'position')::integer,
    (options.value ->> 'units')::numeric,
    options.value ->> 'label',
    options.value ->> 'sourceText'
  from jsonb_array_elements(p_projection -> 'unitOptions') as options(value);

  insert into public.course_fees (
    course_snapshot_id, position, fee_year, audience, fee_type, amount,
    currency, basis, student_contribution_band, source_label, source_text
  )
  select
    new_snapshot_id,
    (fees.value ->> 'position')::integer,
    (fees.value ->> 'feeYear')::smallint,
    fees.value ->> 'audience',
    fees.value ->> 'feeType',
    (fees.value ->> 'amount')::numeric,
    fees.value ->> 'currency',
    fees.value ->> 'basis',
    (fees.value ->> 'studentContributionBand')::smallint,
    fees.value ->> 'sourceLabel',
    fees.value ->> 'sourceText'
  from jsonb_array_elements(p_projection -> 'fees') as fees(value);

  insert into public.course_areas_of_interest (
    course_snapshot_id, position, name
  )
  select
    new_snapshot_id,
    (areas.value ->> 'position')::integer,
    areas.value ->> 'name'
  from jsonb_array_elements(p_projection -> 'areasOfInterest') as areas(value);

  insert into public.course_attributes (
    course_snapshot_id, position, attribute_kind, value, source_text
  )
  select
    new_snapshot_id,
    (attributes.value ->> 'position')::integer,
    attributes.value ->> 'attributeKind',
    attributes.value ->> 'value',
    attributes.value ->> 'sourceText'
  from jsonb_array_elements(p_projection -> 'attributes') as attributes(value);

  insert into public.course_related_courses (
    course_snapshot_id, position, relation_kind, related_course_id,
    source_course_code, source_course_title, source_text
  )
  select
    new_snapshot_id,
    (related.value ->> 'position')::integer,
    related.value ->> 'relationKind',
    courses.id,
    related.value ->> 'sourceCourseCode',
    related.value ->> 'sourceCourseTitle',
    related.value ->> 'sourceText'
  from jsonb_array_elements(p_projection -> 'relatedCourses') as related(value)
  join public.courses on courses.code = related.value ->> 'sourceCourseCode';

  if p_projection -> 'courseOffering' <> 'null'::jsonb then
    insert into public.course_offerings (
      course_snapshot_id,
      academic_year_id,
      course_source_page_id,
      delivery_mode,
      location
    ) values (
      new_snapshot_id,
      selected_course_year.academic_year_id,
      base_snapshot.source_page_id,
      p_projection -> 'courseOffering' ->> 'deliveryMode',
      p_projection -> 'courseOffering' ->> 'location'
    )
    returning id into new_offering_id;

    insert into public.offering_sessions (
      course_offering_id,
      course_snapshot_id,
      academic_year_id,
      course_source_page_id,
      academic_period_id,
      academic_period_code,
      academic_period_name,
      position,
      class_number,
      starts_on,
      enrol_closes_on,
      census_on,
      ends_on,
      delivery_mode,
      location,
      class_summary_url,
      source_text
    )
    select
      new_offering_id,
      new_snapshot_id,
      selected_course_year.academic_year_id,
      base_snapshot.source_page_id,
      periods.id,
      sessions.value ->> 'academicPeriodCode',
      sessions.value ->> 'academicPeriodName',
      (sessions.value ->> 'position')::integer,
      sessions.value ->> 'classNumber',
      (sessions.value ->> 'startsOn')::date,
      (sessions.value ->> 'enrolClosesOn')::date,
      (sessions.value ->> 'censusOn')::date,
      (sessions.value ->> 'endsOn')::date,
      sessions.value ->> 'deliveryMode',
      sessions.value ->> 'location',
      sessions.value ->> 'classSummaryUrl',
      sessions.value ->> 'sourceText'
    from jsonb_array_elements(p_projection -> 'offeringSessions') as sessions(value)
    left join public.academic_periods as periods
      on periods.calendar_year = selected_academic_year
     and periods.code = sessions.value ->> 'academicPeriodCode'
     and periods.name = sessions.value ->> 'academicPeriodName';
  end if;

  insert into public.course_learning_outcomes (
    course_snapshot_id, position, body
  )
  select
    new_snapshot_id,
    (outcomes.value ->> 'position')::integer,
    outcomes.value ->> 'body'
  from jsonb_array_elements(p_projection -> 'learningOutcomes') as outcomes(value);

  insert into public.course_assessment_items (
    course_snapshot_id, position, title, weight, hurdle, due_text, source_text
  )
  select
    new_snapshot_id,
    (items.value ->> 'position')::integer,
    items.value ->> 'title',
    (items.value ->> 'weight')::numeric,
    (items.value ->> 'hurdle')::boolean,
    items.value ->> 'dueText',
    items.value ->> 'sourceText'
  from jsonb_array_elements(p_projection -> 'assessmentItems') as items(value);

  insert into public.course_assessment_outcomes (
    course_snapshot_id, assessment_item_id, learning_outcome_id
  )
  select new_snapshot_id, assessments.id, outcomes.id
  from jsonb_array_elements(p_projection -> 'assessmentOutcomes') as links(value)
  join public.course_assessment_items as assessments
    on assessments.course_snapshot_id = new_snapshot_id
   and assessments.position = (links.value ->> 'assessmentPosition')::integer
  join public.course_learning_outcomes as outcomes
    on outcomes.course_snapshot_id = new_snapshot_id
   and outcomes.position = (links.value ->> 'learningOutcomePosition')::integer;

  for item in
    select rules.value
    from jsonb_array_elements(p_projection -> 'rules')
      with ordinality as rules(value, position)
    order by rules.position
  loop
    insert into public.course_rules (
      course_snapshot_id,
      academic_year_id,
      course_source_page_id,
      rule_kind,
      hardness,
      source_text,
      review_state,
      confidence
    ) values (
      new_snapshot_id,
      selected_course_year.academic_year_id,
      base_snapshot.source_page_id,
      item ->> 'ruleKind',
      item ->> 'hardness',
      item ->> 'sourceText',
      'verified',
      coalesce(base_snapshot.overall_confidence, 1)
    ) returning id into new_rule_id;
    rule_ids := rule_ids || jsonb_build_object(item ->> 'key', new_rule_id);
  end loop;

  pending_count := jsonb_array_length(p_projection -> 'ruleGroups');
  while pending_count > 0 loop
    inserted_count := 0;
    for item in
      select groups.value
      from jsonb_array_elements(p_projection -> 'ruleGroups')
        with ordinality as groups(value, position)
      where not group_ids ? (groups.value ->> 'key')
        and (
          groups.value -> 'parentGroupKey' = 'null'::jsonb
          or group_ids ? (groups.value ->> 'parentGroupKey')
        )
      order by groups.position
    loop
      if not rule_ids ? (item ->> 'ruleKey') then
        raise exception 'A rule group references a missing rule.'
          using errcode = '22023';
      end if;
      insert into public.course_rule_groups (
        course_rule_id,
        course_snapshot_id,
        projection_key,
        parent_group_id,
        operator,
        minimum_count,
        position
      ) values (
        (rule_ids ->> (item ->> 'ruleKey'))::bigint,
        new_snapshot_id,
        item ->> 'key',
        (group_ids ->> (item ->> 'parentGroupKey'))::bigint,
        item ->> 'operator',
        (item ->> 'minimumCount')::smallint,
        (item ->> 'position')::integer
      ) returning id into new_group_id;
      group_ids := group_ids || jsonb_build_object(item ->> 'key', new_group_id);
      inserted_count := inserted_count + 1;
    end loop;
    if inserted_count = 0 then
      raise exception 'The rule group tree has a missing parent or cycle.'
        using errcode = '22023';
    end if;
    pending_count := pending_count - inserted_count;
  end loop;

  for item in
    select conditions.value
    from jsonb_array_elements(p_projection -> 'ruleConditions')
      with ordinality as conditions(value, position)
    order by conditions.position
  loop
    if not rule_ids ? (item ->> 'ruleKey')
      or not group_ids ? (item ->> 'groupKey')
    then
      raise exception 'A rule condition references a missing rule or group.'
        using errcode = '22023';
    end if;
    insert into public.course_rule_conditions (
      course_rule_id,
      course_snapshot_id,
      projection_key,
      group_id,
      condition_kind,
      required_course_id,
      required_structure_id,
      minimum_units,
      minimum_mark,
      subject_code,
      minimum_course_level,
      maximum_course_level,
      free_text,
      minimum_gpa,
      minimum_year,
      minimum_wam,
      course_requirement_mode,
      hardness,
      source_text,
      confidence,
      review_state,
      position
    ) values (
      (rule_ids ->> (item ->> 'ruleKey'))::bigint,
      new_snapshot_id,
      item ->> 'key',
      (group_ids ->> (item ->> 'groupKey'))::bigint,
      item ->> 'conditionKind',
      (
        select courses.id
        from public.courses
        where courses.code = item ->> 'requiredCourseCode'
      ),
      (
        select structures.id
        from public.academic_structures as structures
        where structures.code = item ->> 'requiredStructureCode'
      ),
      (item ->> 'minimumUnits')::numeric,
      (item ->> 'minimumMark')::numeric,
      item ->> 'subjectCode',
      (item ->> 'minimumCourseLevel')::smallint,
      (item ->> 'maximumCourseLevel')::smallint,
      item ->> 'freeText',
      (item ->> 'minimumGpa')::numeric,
      (item ->> 'minimumYear')::smallint,
      (item ->> 'minimumWam')::numeric,
      item ->> 'courseRequirementMode',
      item ->> 'hardness',
      item ->> 'sourceText',
      coalesce(base_snapshot.overall_confidence, 1),
      'verified',
      (item ->> 'position')::integer
    ) returning id into new_condition_id;
    condition_ids := condition_ids ||
      jsonb_build_object(item ->> 'key', new_condition_id);
  end loop;

  insert into public.course_rule_condition_courses (
    condition_id,
    course_snapshot_id,
    position,
    referenced_course_id,
    source_course_code,
    source_text
  )
  select
    (condition_ids ->> (members.value ->> 'conditionKey'))::bigint,
    new_snapshot_id,
    (members.value ->> 'position')::integer,
    courses.id,
    members.value ->> 'sourceCourseCode',
    members.value ->> 'sourceText'
  from jsonb_array_elements(p_projection -> 'ruleConditionCourses') as members(value)
  join public.courses on courses.code = members.value ->> 'sourceCourseCode'
  where condition_ids ? (members.value ->> 'conditionKey');

  if (
    select count(*)
    from public.course_rule_condition_courses
    where course_snapshot_id = new_snapshot_id
  ) <> jsonb_array_length(p_projection -> 'ruleConditionCourses') then
    raise exception 'A course-set member references a missing condition.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.course_rule_conditions as conditions
    where conditions.course_snapshot_id = new_snapshot_id
      and conditions.condition_kind = 'course_set_units'
      and not exists (
        select 1
        from public.course_rule_condition_courses as members
        where members.condition_id = conditions.id
      )
  ) then
    raise exception 'Every course-set condition requires at least one course.'
      using errcode = '22023';
  end if;

  insert into public.course_rule_course_references (
    course_rule_id,
    course_snapshot_id,
    referenced_course_id,
    source_text,
    confidence,
    review_state
  )
  select
    (rule_ids ->> (rule_references.value ->> 'ruleKey'))::bigint,
    new_snapshot_id,
    courses.id,
    rule_references.value ->> 'sourceText',
    coalesce(base_snapshot.overall_confidence, 1),
    'verified'
  from jsonb_array_elements(p_projection -> 'ruleCourseReferences')
    as rule_references(value)
  join public.courses
    on courses.code = rule_references.value ->> 'referencedCourseCode'
  where rule_ids ? (rule_references.value ->> 'ruleKey');

  if (
    select count(*)
    from public.course_rule_course_references
    where course_snapshot_id = new_snapshot_id
  ) <> jsonb_array_length(p_projection -> 'ruleCourseReferences') then
    raise exception 'A course reference points to a missing rule.'
      using errcode = '22023';
  end if;

  insert into public.course_snapshot_field_evidence (
    course_snapshot_id,
    academic_year_id,
    source_page_id,
    entity_kind,
    entity_key,
    field_key,
    importance,
    extraction_state,
    confidence,
    confidence_band,
    verification_status,
    source_locator,
    evidence_excerpt,
    note
  )
  select
    new_snapshot_id,
    evidence.academic_year_id,
    evidence.source_page_id,
    evidence.entity_kind,
    evidence.entity_key,
    evidence.field_key,
    evidence.importance,
    evidence.extraction_state,
    case
      when base_snapshot.has_critical_uncertainty then 1
      else evidence.confidence
    end,
    case
      when base_snapshot.has_critical_uncertainty then 'high'
      else evidence.confidence_band
    end,
    case
      when base_snapshot.has_critical_uncertainty then 'human_confirmed'
      else evidence.verification_status
    end,
    evidence.source_locator,
    evidence.evidence_excerpt,
    case
      when base_snapshot.has_critical_uncertainty
        then 'Administrator confirmed this evidence while clearing critical uncertainty.'
      else evidence.note
    end
  from public.course_snapshot_field_evidence as evidence
  where evidence.course_snapshot_id = base_snapshot_id
    and not (
      evidence.entity_kind = 'manual_edit'
      and evidence.entity_key = 'root'
      and exists (
        select 1
        from private.course_snapshot_projection_diff(
          base_projection,
          p_projection
        ) as changes
        where changes.field_path = evidence.field_key
      )
    )
    and not (
      base_snapshot.has_critical_uncertainty
      and evidence.entity_kind = 'manual_edit'
      and evidence.entity_key = 'root'
      and evidence.field_key = '$'
    );

  insert into public.course_snapshot_field_evidence (
    course_snapshot_id,
    academic_year_id,
    source_page_id,
    entity_kind,
    entity_key,
    field_key,
    importance,
    extraction_state,
    confidence,
    confidence_band,
    verification_status,
    note
  )
  select
    new_snapshot_id,
    selected_course_year.academic_year_id,
    base_snapshot.source_page_id,
    'manual_edit',
    'root',
    changes.field_path,
    case
      when changes.field_path ~ '^\\$\\.(courseCode|academicYear|snapshot\\.(title|unitValueKind|units|minimumUnits|maximumUnits)|rules|ruleGroups|ruleConditions)'
        then 'critical'
      else 'high'
    end,
    case
      when changes.new_value is null or changes.new_value = 'null'::jsonb
        then 'missing'
      else 'present'
    end,
    1,
    'high',
    'human_confirmed',
    'Administrator confirmed this manual change.'
  from private.course_snapshot_projection_diff(
    base_projection,
    p_projection
  ) as changes;

  if base_snapshot.has_critical_uncertainty then
    insert into public.course_snapshot_field_evidence (
      course_snapshot_id,
      academic_year_id,
      source_page_id,
      entity_kind,
      entity_key,
      field_key,
      importance,
      extraction_state,
      confidence,
      confidence_band,
      verification_status,
      note
    ) values (
      new_snapshot_id,
      selected_course_year.academic_year_id,
      base_snapshot.source_page_id,
      'manual_edit',
      'root',
      '$',
      'critical',
      'present',
      1,
      'high',
      'human_confirmed',
      'Administrator confirmed the complete critical snapshot while creating this manual draft.'
    );

    -- Manual confirmation supersedes import review blockers on the critical
    -- base. Keep their history and record who accepted them, rather than making
    -- them disappear merely because the new manual snapshot has no import
    -- target of its own.
    update public.course_review_items
    set
      status = 'accepted',
      resolved_by = selected_user_id,
      resolved_at = statement_timestamp(),
      resolution_note =
        'Superseded by administrator-confirmed manual snapshot ' ||
        new_snapshot_id::text || '.'
    where course_snapshot_id = base_snapshot_id
      and status = 'open';
  end if;

  if private.course_snapshot_projection(new_snapshot_id)
    is distinct from p_projection
  then
    raise exception 'The submitted projection is not a complete canonical relational projection.'
      using errcode = '22023';
  end if;

  -- The pointer is updated last. Its existing trigger applies the permanent
  -- seal only after every canonical child and evidence row has been written.
  update public.course_years
  set draft_snapshot_id = new_snapshot_id
  where id = p_course_year_id;

  return new_snapshot_id;
end;
$function$;

create or replace function public.publish_course_snapshot(
  p_course_year_id bigint,
  p_snapshot_id bigint,
  p_expected_published_snapshot_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_user_id uuid;
  selected_course_year public.course_years;
  selected_snapshot public.course_snapshots;
begin
  selected_user_id := (select auth.uid());
  if selected_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if not (select private.has_permission('courses.write')) then
    raise exception 'Course write permission is required.' using errcode = '42501';
  end if;

  select course_years.*
  into selected_course_year
  from public.course_years as course_years
  where course_years.id = p_course_year_id
  for update;

  if not found then
    raise exception 'The course year was not found.' using errcode = 'P0002';
  end if;
  if selected_course_year.lifecycle_status <> 'active' then
    raise exception 'Archived course years cannot be published.' using errcode = '55000';
  end if;
  if selected_course_year.published_snapshot_id
    is distinct from p_expected_published_snapshot_id
  then
    raise exception 'The published course changed while it was being reviewed.'
      using errcode = '40001';
  end if;
  if selected_course_year.draft_snapshot_id is distinct from p_snapshot_id then
    raise exception 'Only the current draft snapshot can be published.'
      using errcode = '40001';
  end if;

  select snapshots.*
  into selected_snapshot
  from public.course_snapshots as snapshots
  where snapshots.id = p_snapshot_id
    and snapshots.course_year_id = p_course_year_id;

  if not found
    or selected_snapshot.sealed_at is null
    or selected_snapshot.validation_status not in ('valid', 'valid_with_warnings')
  then
    raise exception 'The current draft is not a sealed valid snapshot.'
      using errcode = '55000';
  end if;
  if selected_snapshot.has_critical_uncertainty then
    raise exception 'Resolve critical uncertainty before publishing this course.'
      using errcode = '55000';
  end if;
  if exists (
    select 1
    from public.course_review_items as reviews
    where reviews.course_snapshot_id = p_snapshot_id
      and reviews.is_blocking
      and reviews.status = 'open'
  ) then
    raise exception 'Resolve blocking review items before publishing this course.'
      using errcode = '55000';
  end if;

  update public.course_years
  set
    published_snapshot_id = p_snapshot_id,
    draft_snapshot_id = null
  where id = p_course_year_id;

  return p_snapshot_id;
end;
$function$;

create or replace function public.archive_course_year(
  p_course_year_id bigint,
  p_expected_draft_snapshot_id bigint,
  p_expected_published_snapshot_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  selected_user_id uuid;
  selected_course_year public.course_years;
begin
  selected_user_id := (select auth.uid());
  if selected_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if not (select private.has_permission('courses.write')) then
    raise exception 'Course write permission is required.' using errcode = '42501';
  end if;

  select course_years.*
  into selected_course_year
  from public.course_years as course_years
  where course_years.id = p_course_year_id
  for update;

  if not found then
    raise exception 'The course year was not found.' using errcode = 'P0002';
  end if;
  if selected_course_year.lifecycle_status <> 'active' then
    raise exception 'The course year is already archived.' using errcode = '55000';
  end if;
  if selected_course_year.draft_snapshot_id
      is distinct from p_expected_draft_snapshot_id
    or selected_course_year.published_snapshot_id
      is distinct from p_expected_published_snapshot_id
  then
    raise exception 'The course changed while it was being archived.'
      using errcode = '40001';
  end if;

  update public.course_years
  set lifecycle_status = 'archived'
  where id = p_course_year_id;

  return p_course_year_id;
end;
$function$;

create or replace function private.guard_archived_course_year()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.lifecycle_status = 'archived' then
    if new is distinct from old then
      raise exception 'Archived course years are immutable.' using errcode = '55000';
    end if;
    return new;
  end if;

  if new.lifecycle_status = 'archived'
    and (
      new.draft_snapshot_id is distinct from old.draft_snapshot_id
      or new.published_snapshot_id is distinct from old.published_snapshot_id
      or new.course_id is distinct from old.course_id
      or new.academic_year_id is distinct from old.academic_year_id
    )
  then
    raise exception 'Archival cannot change course snapshot pointers.'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

-- The zz prefix runs this after the existing updated_at and sealing triggers,
-- so even a nominal no-op cannot change an archived row's timestamp.
create trigger course_years_zz_guard_archived
before update on public.course_years
for each row execute function private.guard_archived_course_year();

revoke all on function private.guard_archived_course_year()
from public, anon, authenticated;

-- A user trusted to write course data must be able to assemble the exact
-- draft they are about to replace. Keep import-run artefacts behind the
-- separate imports.manage permission, but make the complete canonical
-- snapshot and its source/evidence readable to course writers.
do $policy$
declare
  table_name text;
begin
  foreach table_name in array array[
    'courses',
    'academic_structures',
    'course_source_pages',
    'course_snapshots',
    'course_fees',
    'course_areas_of_interest',
    'course_related_courses',
    'course_attributes',
    'course_unit_options',
    'course_offerings',
    'offering_sessions',
    'course_learning_outcomes',
    'course_assessment_items',
    'course_assessment_outcomes',
    'course_rules',
    'course_rule_groups',
    'course_rule_conditions',
    'course_rule_condition_courses',
    'course_rule_course_references',
    'course_snapshot_field_evidence'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.has_permission(''courses.write'')))',
      case
        when table_name = 'academic_structures'
          then table_name || '_course_writer_read'
        else table_name || '_course_writer_read'
      end,
      table_name
    );
  end loop;
end;
$policy$;

grant select on table
  public.courses,
  public.academic_structures,
  public.course_source_pages,
  public.course_snapshots,
  public.course_fees,
  public.course_areas_of_interest,
  public.course_related_courses,
  public.course_attributes,
  public.course_unit_options,
  public.course_offerings,
  public.offering_sessions,
  public.course_learning_outcomes,
  public.course_assessment_items,
  public.course_assessment_outcomes,
  public.course_rules,
  public.course_rule_groups,
  public.course_rule_conditions,
  public.course_rule_condition_courses,
  public.course_rule_course_references,
  public.course_snapshot_field_evidence
to authenticated;

-- Canonical writes now enter through the import worker or the transactional
-- RPCs above. Removing direct authenticated writes prevents pointer bypasses,
-- orphan snapshots and mutation during an unsealed retry window.
revoke insert, update, delete on table public.courses from authenticated;
revoke insert, update, delete on table public.course_years from authenticated;
revoke insert, update, delete on table public.course_snapshots from authenticated;
revoke insert, update, delete on table public.course_fees from authenticated;
revoke insert, update, delete on table public.course_areas_of_interest from authenticated;
revoke insert, update, delete on table public.course_related_courses from authenticated;
revoke insert, update, delete on table public.course_attributes from authenticated;
revoke insert, update, delete on table public.course_unit_options from authenticated;
revoke insert, update, delete on table public.course_offerings from authenticated;
revoke insert, update, delete on table public.offering_sessions from authenticated;
revoke insert, update, delete on table public.course_learning_outcomes from authenticated;
revoke insert, update, delete on table public.course_assessment_items from authenticated;
revoke insert, update, delete on table public.course_assessment_outcomes from authenticated;
revoke insert, update, delete on table public.course_rules from authenticated;
revoke insert, update, delete on table public.course_rule_groups from authenticated;
revoke insert, update, delete on table public.course_rule_conditions from authenticated;
revoke insert, update, delete on table public.course_rule_condition_courses from authenticated;
revoke insert, update, delete on table public.course_rule_course_references from authenticated;
revoke insert, update, delete on table public.course_snapshot_field_evidence from authenticated;

grant all on table
  public.courses,
  public.course_years,
  public.course_snapshots,
  public.course_fees,
  public.course_areas_of_interest,
  public.course_related_courses,
  public.course_attributes,
  public.course_unit_options,
  public.course_offerings,
  public.offering_sessions,
  public.course_learning_outcomes,
  public.course_assessment_items,
  public.course_assessment_outcomes,
  public.course_rules,
  public.course_rule_groups,
  public.course_rule_conditions,
  public.course_rule_condition_courses,
  public.course_rule_course_references,
  public.course_snapshot_field_evidence
to service_role;

-- Snapshot persistence resolves imported offering codes against the retained
-- academic calendar and allocates every relational child identity itself.
-- Keep these worker capabilities explicit because BYPASSRLS does not grant
-- table or sequence privileges, and hosted role defaults are not portable.
grant select on table
  public.academic_periods,
  public.academic_years
to service_role;

grant usage, select on sequence
  public.courses_id_seq,
  public.course_years_id_seq,
  public.course_snapshots_id_seq,
  public.course_fees_id_seq,
  public.course_areas_of_interest_id_seq,
  public.course_related_courses_id_seq,
  public.course_offerings_id_seq,
  public.offering_sessions_id_seq,
  public.course_learning_outcomes_id_seq,
  public.course_assessment_items_id_seq,
  public.course_rules_id_seq,
  public.course_rule_groups_id_seq,
  public.course_rule_conditions_id_seq,
  public.course_rule_course_references_id_seq,
  public.course_snapshot_field_evidence_id_seq
to service_role;

revoke all on function public.create_course_manual_snapshot(bigint, bigint, jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.publish_course_snapshot(bigint, bigint, bigint)
from public, anon, authenticated, service_role;
revoke all on function public.archive_course_year(bigint, bigint, bigint)
from public, anon, authenticated, service_role;

grant execute on function public.create_course_manual_snapshot(bigint, bigint, jsonb)
to authenticated;
grant execute on function public.publish_course_snapshot(bigint, bigint, bigint)
to authenticated;
grant execute on function public.archive_course_year(bigint, bigint, bigint)
to authenticated;

comment on function public.create_course_manual_snapshot(bigint, bigint, jsonb) is
  'Creates and installs a complete sealed manual draft from a reviewed relational projection using an optimistic base pointer.';
comment on function public.publish_course_snapshot(bigint, bigint, bigint) is
  'Atomically publishes the current sealed valid draft after optimistic and review checks.';
comment on function public.archive_course_year(bigint, bigint, bigint) is
  'Archives an active course year without deleting or changing its immutable snapshot history.';
