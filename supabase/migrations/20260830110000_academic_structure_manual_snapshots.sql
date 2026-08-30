-- Transactional manual correction for immutable academic structure snapshots.
-- JSON is transport only. The canonical result is written to the normalised
-- snapshot tables and publication remains a separate explicit operation.

create or replace function private.academic_structure_manual_projection(
  p_snapshot_id bigint
)
returns jsonb
language sql
stable
set search_path = ''
as $function$
  select jsonb_build_object(
    'schemaVersion', snapshots.schema_version,
    'structureKind', structures.kind,
    'structureCode', structures.code,
    'academicYear', academic_years.year,
    'snapshot', jsonb_build_object(
      'title', snapshots.name,
      'acronym', snapshots.acronym,
      'shortName', snapshots.short_name,
      'introduction', snapshots.introduction,
      'description', snapshots.description,
      'totalUnits', snapshots.units,
      'durationYears', snapshots.duration_years,
      'academicCareer', snapshots.academic_career,
      'college', snapshots.college,
      'deliveryMode', snapshots.mode_of_delivery,
      'selectionRank', snapshots.selection_rank,
      'atar', snapshots.atar,
      'canCombine', snapshots.can_combine,
      'canCombineVertical', snapshots.can_combine_vertical,
      'studyAs', snapshots.study_as,
      'contactText', snapshots.contact_text,
      'overallConfidence', snapshots.overall_confidence
    ),
    'summaryFields', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', rows.position,
        'valuePosition', rows.value_position,
        'fieldKey', rows.field_key,
        'label', rows.label,
        'fieldValue', rows.field_value,
        'sourceText', rows.source_text
      ) order by rows.position, rows.value_position, rows.id)
      from public.academic_structure_summary_fields as rows
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', rows.position,
        'sectionKey', rows.section_key,
        'heading', rows.heading,
        'markdown', rows.markdown,
        'sourceText', rows.source_text,
        'sourceLocator', rows.source_locator
      ) order by rows.position, rows.id)
      from public.academic_structure_snapshot_sections as rows
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'learningOutcomes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', rows.position,
        'outcomeText', rows.outcome_text,
        'sourceText', rows.source_text,
        'sourceLocator', rows.source_locator
      ) order by rows.position, rows.id)
      from public.academic_structure_learning_outcomes as rows
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'fees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', rows.position,
        'feeYear', rows.fee_year,
        'audience', rows.audience,
        'feeType', rows.fee_type,
        'amount', rows.amount,
        'currency', btrim(rows.currency),
        'basis', rows.basis,
        'sourceLabel', rows.source_label,
        'sourceText', rows.source_text,
        'sourceLocator', rows.source_locator
      ) order by rows.position, rows.id)
      from public.academic_structure_fees as rows
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', rows.position,
        'relationshipKind', rows.relationship_kind,
        'targetKind', rows.target_kind,
        'targetCode', rows.target_code,
        'targetTitle', rows.target_title,
        'sourceText', rows.source_text,
        'sourceLocator', rows.source_locator
      ) order by rows.position, rows.id)
      from public.academic_structure_snapshot_relationships as rows
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'requirementRootKey', (
      select rows.group_key
      from public.academic_structure_requirement_groups as rows
      where rows.snapshot_id = snapshots.id
        and rows.parent_group_id is null
      limit 1
    ),
    'requirementGroups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', rows.group_key,
        'parentGroupKey', parents.group_key,
        'position', rows.position,
        'operator', rows.operator,
        'minimumCount', rows.minimum_count,
        'minimumUnits', rows.minimum_units,
        'maximumUnits', rows.maximum_units,
        'title', rows.title,
        'description', rows.description,
        'sourceText', rows.source_text,
        'sourceLocator', rows.source_locator
      ) order by rows.position, rows.id)
      from public.academic_structure_requirement_groups as rows
      left join public.academic_structure_requirement_groups as parents
        on parents.id = rows.parent_group_id
       and parents.snapshot_id = rows.snapshot_id
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'requirementConditions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', rows.projection_key,
        'groupKey', groups.group_key,
        'position', rows.position,
        'conditionKind', rows.condition_kind,
        'minimumUnits', rows.minimum_units,
        'maximumUnits', rows.maximum_units,
        'minimumCourses', rows.minimum_courses,
        'structureKind', rows.structure_kind,
        'subjectCode', rows.subject_code,
        'minimumLevel', rows.minimum_level,
        'maximumLevel', rows.maximum_level,
        'tag', rows.tag,
        'freeText', rows.free_text,
        'sourceText', rows.source_text,
        'sourceLocator', rows.source_locator
      ) order by rows.position, rows.id)
      from public.academic_structure_requirement_conditions as rows
      join public.academic_structure_requirement_groups as groups
        on groups.id = rows.requirement_group_id
       and groups.snapshot_id = rows.snapshot_id
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'requirementOptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'conditionKey', conditions.projection_key,
        'position', rows.position,
        'optionKind', rows.option_kind,
        'optionCode', rows.option_code,
        'structureKind', rows.structure_kind
      ) order by rows.position, rows.id)
      from public.academic_structure_requirement_options as rows
      join public.academic_structure_requirement_conditions as conditions
        on conditions.id = rows.requirement_condition_id
       and conditions.snapshot_id = rows.snapshot_id
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'unmodelledRequirements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', rows.position,
        'sourceText', rows.source_text,
        'sourceLocator', rows.source_locator
      ) order by rows.position, rows.id)
      from public.academic_structure_unmodelled_requirements as rows
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', rows.position,
        'fieldKey', rows.field_key,
        'sourceLocator', rows.source_locator,
        'evidenceExcerpt', rows.evidence_excerpt,
        'confidence', rows.confidence,
        'method', rows.method
      ) order by rows.position, rows.id)
      from public.academic_structure_snapshot_evidence as rows
      where rows.snapshot_id = snapshots.id
    ), '[]'::jsonb)
  )
  from public.academic_structure_snapshots as snapshots
  join public.academic_structure_years as structure_years
    on structure_years.id = snapshots.structure_year_id
  join public.academic_structures as structures
    on structures.id = structure_years.structure_id
  join public.academic_years
    on academic_years.id = snapshots.academic_year_id
  where snapshots.id = p_snapshot_id;
$function$;

revoke all on function private.academic_structure_manual_projection(bigint)
from public, anon, authenticated;

create or replace function private.validate_academic_structure_manual_projection(
  p_projection jsonb,
  p_expected_kind text,
  p_expected_code text,
  p_expected_year smallint
)
returns void
language plpgsql
set search_path = ''
as $function$
declare
  snapshot_data jsonb;
  collection_name text;
begin
  if not private.jsonb_has_exact_keys(
    p_projection,
    array[
      'schemaVersion', 'structureKind', 'structureCode', 'academicYear',
      'snapshot', 'summaryFields', 'sections', 'learningOutcomes', 'fees',
      'relationships',
      'requirementRootKey', 'requirementGroups', 'requirementConditions',
      'requirementOptions', 'unmodelledRequirements', 'evidence'
    ]
  ) then
    raise exception 'The manual academic structure projection has unexpected fields.'
      using errcode = '22023';
  end if;
  if not private.jsonb_is_text(p_projection -> 'schemaVersion')
    or p_projection ->> 'schemaVersion' <> 'academic-structure-snapshot.v2'
    or not private.jsonb_is_text(p_projection -> 'structureKind')
    or p_projection ->> 'structureKind' <> p_expected_kind
    or not private.jsonb_is_text(p_projection -> 'structureCode')
    or p_projection ->> 'structureCode' <> p_expected_code
    or not private.jsonb_is_number(p_projection -> 'academicYear', false, true)
    or (p_projection ->> 'academicYear')::smallint <> p_expected_year
    or jsonb_typeof(p_projection -> 'snapshot') <> 'object'
  then
    raise exception 'The manual projection does not match the selected structure year.'
      using errcode = '22023';
  end if;

  snapshot_data := p_projection -> 'snapshot';
  if not private.jsonb_has_exact_keys(
    snapshot_data,
    array[
      'title', 'acronym', 'shortName', 'introduction', 'description',
      'totalUnits', 'durationYears', 'academicCareer', 'college',
      'deliveryMode', 'selectionRank', 'atar', 'canCombine',
      'canCombineVertical', 'studyAs', 'contactText', 'overallConfidence'
    ]
  )
    or not private.jsonb_is_text(snapshot_data -> 'title')
    or not private.jsonb_is_text(snapshot_data -> 'acronym', true)
    or not private.jsonb_is_text(snapshot_data -> 'shortName', true)
    or not private.jsonb_is_text(snapshot_data -> 'introduction', true)
    or not private.jsonb_is_text(snapshot_data -> 'description', true)
    or not private.jsonb_is_number(snapshot_data -> 'totalUnits', true)
    or not private.jsonb_is_number(snapshot_data -> 'durationYears', true)
    or not private.jsonb_is_text(snapshot_data -> 'academicCareer', true)
    or not private.jsonb_is_text(snapshot_data -> 'college', true)
    or not private.jsonb_is_text(snapshot_data -> 'deliveryMode', true)
    or not private.jsonb_is_number(snapshot_data -> 'selectionRank', true)
    or not private.jsonb_is_number(snapshot_data -> 'atar', true)
    or not private.jsonb_is_boolean(snapshot_data -> 'canCombine', true)
    or not private.jsonb_is_boolean(snapshot_data -> 'canCombineVertical', true)
    or not private.jsonb_is_text(snapshot_data -> 'studyAs', true)
    or not private.jsonb_is_text(snapshot_data -> 'contactText', true)
    or not private.jsonb_is_number(snapshot_data -> 'overallConfidence', true)
  then
    raise exception 'The manual academic structure fields are invalid.'
      using errcode = '22023';
  end if;
  if (snapshot_data ->> 'totalUnits')::numeric <= 0
      or (snapshot_data ->> 'durationYears')::numeric <= 0
      or (snapshot_data ->> 'selectionRank')::numeric not between 0 and 100
      or (snapshot_data ->> 'atar')::numeric not between 0 and 100
      or (snapshot_data ->> 'overallConfidence')::numeric not between 0 and 1
  then
    raise exception 'A manual academic structure number is outside its valid range.'
      using errcode = '22023';
  end if;

  foreach collection_name in array array[
    'summaryFields', 'sections', 'learningOutcomes', 'fees', 'relationships',
    'requirementGroups', 'requirementConditions', 'requirementOptions',
    'unmodelledRequirements', 'evidence'
  ]
  loop
    if jsonb_typeof(p_projection -> collection_name) <> 'array' then
      raise exception 'Manual academic structure collections must be arrays.'
        using errcode = '22023';
    end if;
  end loop;
  foreach collection_name in array array[
    'sections', 'learningOutcomes', 'fees', 'relationships',
    'unmodelledRequirements', 'evidence'
  ]
  loop
    if not private.jsonb_positions_are_contiguous(
      p_projection -> collection_name
    ) then
      raise exception 'Positioned manual collections must be contiguous.'
        using errcode = '22023';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'summaryFields') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'position', 'valuePosition', 'fieldKey', 'label', 'fieldValue',
      'sourceText'
    ])
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_number(rows.value -> 'valuePosition', false, true)
      or not private.jsonb_is_text(rows.value -> 'fieldKey')
      or rows.value ->> 'fieldKey' !~ '^[a-z0-9]+(_[a-z0-9]+)*$'
      or not private.jsonb_is_text(rows.value -> 'label')
      or not private.jsonb_is_text(rows.value -> 'fieldValue')
      or not private.jsonb_is_text(rows.value -> 'sourceText')
  ) then
    raise exception 'A manual summary field row is invalid.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'summaryFields') as rows(value)
    group by
      (rows.value ->> 'position')::integer,
      (rows.value ->> 'valuePosition')::integer
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'summaryFields') as rows(value)
    group by (rows.value ->> 'position')::integer
    having count(distinct rows.value ->> 'fieldKey') <> 1
      or count(distinct rows.value ->> 'label') <> 1
      or count(distinct rows.value ->> 'sourceText') <> 1
      or max((rows.value ->> 'valuePosition')::integer)
        <> count(distinct (rows.value ->> 'valuePosition')::integer)
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'summaryFields') as rows(value)
    group by rows.value ->> 'fieldKey'
    having count(distinct (rows.value ->> 'position')::integer) > 1
  ) or coalesce((
    select max((rows.value ->> 'position')::integer)
    from jsonb_array_elements(p_projection -> 'summaryFields') as rows(value)
  ), 0) <> (
    select count(distinct (rows.value ->> 'position')::integer)
    from jsonb_array_elements(p_projection -> 'summaryFields') as rows(value)
  ) then
    raise exception 'Manual summary fields must use unique contiguous positions and consistent metadata.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'evidence') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'position', 'fieldKey', 'sourceLocator', 'evidenceExcerpt', 'confidence',
      'method'
    ])
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'fieldKey')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator')
      or not private.jsonb_is_text(rows.value -> 'evidenceExcerpt')
      or not private.jsonb_is_number(rows.value -> 'confidence')
      or (rows.value ->> 'confidence')::numeric not between 0 and 1
      or not private.jsonb_is_text(rows.value -> 'method')
      or rows.value ->> 'method' not in ('deterministic', 'model')
  ) then
    raise exception 'A manual evidence row is invalid.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'sections') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'position', 'sectionKey', 'heading', 'markdown', 'sourceText',
      'sourceLocator'
    ])
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'sectionKey')
      or not private.jsonb_is_text(rows.value -> 'heading')
      or not private.jsonb_is_text(rows.value -> 'markdown')
      or not private.jsonb_is_text(rows.value -> 'sourceText')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'learningOutcomes') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'position', 'outcomeText', 'sourceText', 'sourceLocator'
    ])
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'outcomeText')
      or not private.jsonb_is_text(rows.value -> 'sourceText')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'fees') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'position', 'feeYear', 'audience', 'feeType', 'amount', 'currency',
      'basis', 'sourceLabel', 'sourceText', 'sourceLocator'
    ])
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
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
      or coalesce(rows.value ->> 'currency', 'AUD') <> 'AUD'
      or not private.jsonb_is_text(rows.value -> 'basis')
      or rows.value ->> 'basis' not in (
        'programme', 'unit', 'eftsl', 'annual', 'unknown'
      )
      or not private.jsonb_is_text(rows.value -> 'sourceLabel', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'relationships') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'position', 'relationshipKind', 'targetKind', 'targetCode',
      'targetTitle', 'sourceText', 'sourceLocator'
    ])
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'relationshipKind')
      or rows.value ->> 'relationshipKind' not in (
        'source_reference', 'relevant', 'option', 'required',
        'incompatible', 'other'
      )
      or not private.jsonb_is_text(rows.value -> 'targetKind')
      or rows.value ->> 'targetKind' not in (
        'programme', 'major', 'minor', 'specialisation', 'course'
      )
      or not private.jsonb_is_text(rows.value -> 'targetCode')
      or rows.value ->> 'targetCode' !~ '^[A-Z0-9][A-Z0-9-]{1,31}$'
      or not private.jsonb_is_text(rows.value -> 'targetTitle', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator')
  ) then
    raise exception 'A manual academic structure collection row is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_projection -> 'requirementGroups') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'key', 'parentGroupKey', 'position', 'operator', 'minimumCount',
      'minimumUnits', 'maximumUnits', 'title', 'description', 'sourceText',
      'sourceLocator'
    ])
      or not private.jsonb_is_text(rows.value -> 'key')
      or not private.jsonb_is_text(rows.value -> 'parentGroupKey', true)
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'operator')
      or rows.value ->> 'operator' not in ('all_of', 'any_of', 'minimum_count')
      or not private.jsonb_is_number(rows.value -> 'minimumCount', true, true)
      or not private.jsonb_is_number(rows.value -> 'minimumUnits', true)
      or not private.jsonb_is_number(rows.value -> 'maximumUnits', true)
      or not private.jsonb_is_text(rows.value -> 'title', true)
      or not private.jsonb_is_text(rows.value -> 'description', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'requirementConditions') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'key', 'groupKey', 'position', 'conditionKind', 'minimumUnits',
      'maximumUnits', 'minimumCourses', 'structureKind', 'subjectCode',
      'minimumLevel', 'maximumLevel', 'tag', 'freeText', 'sourceText',
      'sourceLocator'
    ])
      or not private.jsonb_is_text(rows.value -> 'key')
      or not private.jsonb_is_text(rows.value -> 'groupKey')
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'conditionKind')
      or rows.value ->> 'conditionKind' not in (
        'course_list', 'structure_list', 'unit_total', 'level', 'subject',
        'tag', 'unrestricted', 'free_text'
      )
      or not private.jsonb_is_number(rows.value -> 'minimumUnits', true)
      or not private.jsonb_is_number(rows.value -> 'maximumUnits', true)
      or not private.jsonb_is_number(rows.value -> 'minimumCourses', true, true)
      or not private.jsonb_is_text(rows.value -> 'structureKind', true)
      or not private.jsonb_is_text(rows.value -> 'subjectCode', true)
      or not private.jsonb_is_number(rows.value -> 'minimumLevel', true, true)
      or not private.jsonb_is_number(rows.value -> 'maximumLevel', true, true)
      or not private.jsonb_is_text(rows.value -> 'tag', true)
      or not private.jsonb_is_text(rows.value -> 'freeText', true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator')
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'requirementOptions') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'conditionKey', 'position', 'optionKind', 'optionCode', 'structureKind'
    ])
      or not private.jsonb_is_text(rows.value -> 'conditionKey')
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'optionKind')
      or rows.value ->> 'optionKind' not in ('course', 'structure')
      or not private.jsonb_is_text(rows.value -> 'optionCode')
      or not private.jsonb_is_text(rows.value -> 'structureKind', true)
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'unmodelledRequirements') as rows(value)
    where not private.jsonb_has_exact_keys(rows.value, array[
      'position', 'sourceText', 'sourceLocator'
    ])
      or not private.jsonb_is_number(rows.value -> 'position', false, true)
      or not private.jsonb_is_text(rows.value -> 'sourceText')
      or not private.jsonb_is_text(rows.value -> 'sourceLocator', true)
  ) then
    raise exception 'A manual requirement row is invalid.' using errcode = '22023';
  end if;

  if exists (
    select rows.value ->> 'key'
    from jsonb_array_elements(p_projection -> 'requirementGroups') as rows(value)
    group by rows.value ->> 'key'
    having count(*) > 1
  ) or exists (
    select rows.value ->> 'key'
    from jsonb_array_elements(p_projection -> 'requirementConditions') as rows(value)
    group by rows.value ->> 'key'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'requirementGroups') as rows(value)
    where rows.value ->> 'parentGroupKey' is not null
      and not exists (
        select 1
        from jsonb_array_elements(p_projection -> 'requirementGroups') as parents(value)
        where parents.value ->> 'key' = rows.value ->> 'parentGroupKey'
      )
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'requirementConditions') as rows(value)
    where not exists (
      select 1
      from jsonb_array_elements(p_projection -> 'requirementGroups') as groups(value)
      where groups.value ->> 'key' = rows.value ->> 'groupKey'
    )
  ) or exists (
    select 1
    from jsonb_array_elements(p_projection -> 'requirementOptions') as rows(value)
    where not exists (
      select 1
      from jsonb_array_elements(p_projection -> 'requirementConditions') as conditions(value)
      where conditions.value ->> 'key' = rows.value ->> 'conditionKey'
    )
  ) then
    raise exception 'The manual requirement tree contains duplicate or orphaned rows.'
      using errcode = '22023';
  end if;

  if (
    p_projection -> 'requirementRootKey' = 'null'::jsonb
    and jsonb_array_length(p_projection -> 'requirementGroups') <> 0
  ) or (
    p_projection -> 'requirementRootKey' <> 'null'::jsonb
    and (
      not private.jsonb_is_text(p_projection -> 'requirementRootKey')
      or (
        select count(*)
        from jsonb_array_elements(p_projection -> 'requirementGroups') as rows(value)
        where rows.value ->> 'parentGroupKey' is null
          and rows.value ->> 'key' = p_projection ->> 'requirementRootKey'
      ) <> 1
    )
  ) then
    raise exception 'The manual requirement tree must have one selected root.'
      using errcode = '22023';
  end if;
end;
$function$;

revoke all on function private.validate_academic_structure_manual_projection(
  jsonb,
  text,
  text,
  smallint
) from public, anon, authenticated;

create or replace function public.create_academic_structure_manual_snapshot(
  p_structure_year_id bigint,
  p_expected_base_snapshot_id bigint,
  p_projection jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  selected_year public.academic_structure_years%rowtype;
  base_snapshot public.academic_structure_snapshots%rowtype;
  base_snapshot_id bigint;
  selected_kind text;
  selected_code text;
  selected_academic_year smallint;
  base_projection jsonb;
  snapshot_data jsonb;
  new_snapshot_id bigint;
  new_group_id bigint;
  new_condition_id bigint;
  group_ids jsonb := '{}'::jsonb;
  condition_ids jsonb := '{}'::jsonb;
  item jsonb;
  inserted_count integer;
  pending_count integer;
  previous_draft_id bigint;
  previous_published_id bigint;
begin
  if actor is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if not private.has_permission('catalogue.write') then
    raise exception 'Catalogue write permission is required.' using errcode = '42501';
  end if;

  select * into selected_year
  from public.academic_structure_years
  where id = p_structure_year_id
  for update;
  if selected_year.id is null then
    raise exception 'The academic structure year was not found.' using errcode = 'P0002';
  end if;
  previous_draft_id := selected_year.draft_snapshot_id;
  previous_published_id := selected_year.published_snapshot_id;
  base_snapshot_id := coalesce(previous_draft_id, previous_published_id);
  if base_snapshot_id is distinct from p_expected_base_snapshot_id then
    raise exception 'The academic structure draft changed while it was being edited.'
      using errcode = '40001';
  end if;
  if base_snapshot_id is null then
    raise exception 'The academic structure year has no snapshot to edit.'
      using errcode = '55000';
  end if;

  select * into base_snapshot
  from public.academic_structure_snapshots
  where id = base_snapshot_id
    and structure_year_id = selected_year.id;
  if base_snapshot.id is null or base_snapshot.sealed_at is null then
    raise exception 'The current academic structure snapshot is not sealed.'
      using errcode = '55000';
  end if;

  select structures.kind, structures.code, academic_years.year
  into selected_kind, selected_code, selected_academic_year
  from public.academic_structures as structures
  join public.academic_years
    on academic_years.id = selected_year.academic_year_id
  where structures.id = selected_year.structure_id;

  perform private.validate_academic_structure_manual_projection(
    p_projection,
    selected_kind,
    selected_code,
    selected_academic_year
  );
  base_projection := private.academic_structure_manual_projection(base_snapshot_id);
  if p_projection = base_projection then
    raise exception 'No saved academic structure information changed.'
      using errcode = '22023';
  end if;

  snapshot_data := p_projection -> 'snapshot';
  insert into public.academic_structure_snapshots (
    structure_year_id,
    academic_year_id,
    source_page_id,
    import_target_id,
    parent_snapshot_id,
    origin,
    schema_version,
    semantic_hash,
    name,
    acronym,
    short_name,
    introduction,
    description,
    units,
    duration_years,
    academic_career,
    college,
    mode_of_delivery,
    selection_rank,
    atar,
    can_combine,
    can_combine_vertical,
    study_as,
    contact_text,
    overall_confidence,
    critical_uncertainty,
    confirmation_status,
    created_by
  ) values (
    selected_year.id,
    selected_year.academic_year_id,
    base_snapshot.source_page_id,
    null,
    base_snapshot_id,
    'manual',
    p_projection ->> 'schemaVersion',
    encode(
      extensions.digest(
        convert_to(
          private.canonical_jsonb_text(jsonb_build_object(
            'parentSnapshotId', base_snapshot_id,
            'projection', p_projection
          )),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ),
    snapshot_data ->> 'title',
    snapshot_data ->> 'acronym',
    snapshot_data ->> 'shortName',
    snapshot_data ->> 'introduction',
    snapshot_data ->> 'description',
    (snapshot_data ->> 'totalUnits')::numeric,
    (snapshot_data ->> 'durationYears')::numeric,
    snapshot_data ->> 'academicCareer',
    snapshot_data ->> 'college',
    snapshot_data ->> 'deliveryMode',
    (snapshot_data ->> 'selectionRank')::numeric,
    (snapshot_data ->> 'atar')::numeric,
    (snapshot_data ->> 'canCombine')::boolean,
    (snapshot_data ->> 'canCombineVertical')::boolean,
    snapshot_data ->> 'studyAs',
    snapshot_data ->> 'contactText',
    (snapshot_data ->> 'overallConfidence')::numeric,
    false,
    'not_required',
    actor
  ) returning id into new_snapshot_id;

  insert into public.academic_structure_summary_fields (
    snapshot_id, position, field_key, label, value_position, field_value,
    source_text
  )
  select
    new_snapshot_id,
    (rows.value ->> 'position')::integer,
    rows.value ->> 'fieldKey',
    rows.value ->> 'label',
    (rows.value ->> 'valuePosition')::integer,
    rows.value ->> 'fieldValue',
    rows.value ->> 'sourceText'
  from jsonb_array_elements(p_projection -> 'summaryFields') as rows(value);

  insert into public.academic_structure_snapshot_evidence (
    snapshot_id, position, field_key, source_locator, evidence_excerpt,
    confidence, method
  )
  select
    new_snapshot_id,
    (rows.value ->> 'position')::integer,
    rows.value ->> 'fieldKey',
    rows.value ->> 'sourceLocator',
    rows.value ->> 'evidenceExcerpt',
    (rows.value ->> 'confidence')::numeric,
    rows.value ->> 'method'
  from jsonb_array_elements(p_projection -> 'evidence') as rows(value);

  insert into public.academic_structure_snapshot_sections (
    snapshot_id, section_key, heading, markdown, source_text, source_locator,
    position
  )
  select
    new_snapshot_id,
    rows.value ->> 'sectionKey',
    rows.value ->> 'heading',
    rows.value ->> 'markdown',
    rows.value ->> 'sourceText',
    rows.value ->> 'sourceLocator',
    (rows.value ->> 'position')::integer
  from jsonb_array_elements(p_projection -> 'sections') as rows(value);

  insert into public.academic_structure_learning_outcomes (
    snapshot_id, position, outcome_text, source_text, source_locator
  )
  select
    new_snapshot_id,
    (rows.value ->> 'position')::integer,
    rows.value ->> 'outcomeText',
    rows.value ->> 'sourceText',
    rows.value ->> 'sourceLocator'
  from jsonb_array_elements(p_projection -> 'learningOutcomes') as rows(value);

  insert into public.academic_structure_fees (
    snapshot_id, position, fee_year, audience, fee_type, amount, currency,
    basis, source_label, source_text, source_locator
  )
  select
    new_snapshot_id,
    (rows.value ->> 'position')::integer,
    (rows.value ->> 'feeYear')::smallint,
    rows.value ->> 'audience',
    rows.value ->> 'feeType',
    (rows.value ->> 'amount')::numeric,
    rows.value ->> 'currency',
    rows.value ->> 'basis',
    rows.value ->> 'sourceLabel',
    rows.value ->> 'sourceText',
    rows.value ->> 'sourceLocator'
  from jsonb_array_elements(p_projection -> 'fees') as rows(value);

  insert into public.academic_structure_snapshot_relationships (
    snapshot_id, position, relationship_kind, target_kind, target_code,
    target_title, source_text, source_locator
  )
  select
    new_snapshot_id,
    (rows.value ->> 'position')::integer,
    rows.value ->> 'relationshipKind',
    rows.value ->> 'targetKind',
    rows.value ->> 'targetCode',
    rows.value ->> 'targetTitle',
    rows.value ->> 'sourceText',
    rows.value ->> 'sourceLocator'
  from jsonb_array_elements(p_projection -> 'relationships') as rows(value);

  for item in
    select rows.value
    from jsonb_array_elements(p_projection -> 'requirementGroups') as rows(value)
    where rows.value ->> 'parentGroupKey' is null
    order by (rows.value ->> 'position')::integer
  loop
    insert into public.academic_structure_requirement_groups (
      snapshot_id, parent_group_id, group_key, title, description, operator,
      minimum_count, minimum_units, maximum_units, source_text, source_locator,
      position
    ) values (
      new_snapshot_id,
      null,
      item ->> 'key',
      item ->> 'title',
      item ->> 'description',
      item ->> 'operator',
      (item ->> 'minimumCount')::smallint,
      (item ->> 'minimumUnits')::numeric,
      (item ->> 'maximumUnits')::numeric,
      item ->> 'sourceText',
      item ->> 'sourceLocator',
      (item ->> 'position')::integer
    ) returning id into new_group_id;
    group_ids := group_ids || jsonb_build_object(item ->> 'key', new_group_id);
  end loop;

  loop
    select count(*) into pending_count
    from jsonb_array_elements(p_projection -> 'requirementGroups') as rows(value)
    where rows.value ->> 'parentGroupKey' is not null
      and not group_ids ? (rows.value ->> 'key');
    exit when pending_count = 0;
    inserted_count := 0;
    for item in
      select rows.value
      from jsonb_array_elements(p_projection -> 'requirementGroups') as rows(value)
      where rows.value ->> 'parentGroupKey' is not null
        and not group_ids ? (rows.value ->> 'key')
        and group_ids ? (rows.value ->> 'parentGroupKey')
      order by (rows.value ->> 'position')::integer
    loop
      insert into public.academic_structure_requirement_groups (
        snapshot_id, parent_group_id, group_key, title, description, operator,
        minimum_count, minimum_units, maximum_units, source_text,
        source_locator, position
      ) values (
        new_snapshot_id,
        (group_ids ->> (item ->> 'parentGroupKey'))::bigint,
        item ->> 'key',
        item ->> 'title',
        item ->> 'description',
        item ->> 'operator',
        (item ->> 'minimumCount')::smallint,
        (item ->> 'minimumUnits')::numeric,
        (item ->> 'maximumUnits')::numeric,
        item ->> 'sourceText',
        item ->> 'sourceLocator',
        (item ->> 'position')::integer
      ) returning id into new_group_id;
      group_ids := group_ids || jsonb_build_object(item ->> 'key', new_group_id);
      inserted_count := inserted_count + 1;
    end loop;
    if inserted_count = 0 then
      raise exception 'The manual requirement groups contain a cycle.'
        using errcode = '22023';
    end if;
  end loop;

  for item in
    select rows.value
    from jsonb_array_elements(p_projection -> 'requirementConditions') as rows(value)
    order by (rows.value ->> 'position')::integer
  loop
    insert into public.academic_structure_requirement_conditions (
      snapshot_id, requirement_group_id, position, projection_key,
      condition_kind, structure_kind, subject_code, minimum_level,
      maximum_level, minimum_units, maximum_units, minimum_courses, tag,
      free_text, source_text, source_locator
    ) values (
      new_snapshot_id,
      (group_ids ->> (item ->> 'groupKey'))::bigint,
      (item ->> 'position')::integer,
      item ->> 'key',
      item ->> 'conditionKind',
      item ->> 'structureKind',
      item ->> 'subjectCode',
      (item ->> 'minimumLevel')::smallint,
      (item ->> 'maximumLevel')::smallint,
      (item ->> 'minimumUnits')::numeric,
      (item ->> 'maximumUnits')::numeric,
      (item ->> 'minimumCourses')::smallint,
      item ->> 'tag',
      item ->> 'freeText',
      item ->> 'sourceText',
      item ->> 'sourceLocator'
    ) returning id into new_condition_id;
    condition_ids := condition_ids || jsonb_build_object(
      item ->> 'key',
      new_condition_id
    );
  end loop;

  insert into public.academic_structure_requirement_options (
    snapshot_id, requirement_condition_id, position, option_kind,
    option_code, structure_kind
  )
  select
    new_snapshot_id,
    (condition_ids ->> (rows.value ->> 'conditionKey'))::bigint,
    (rows.value ->> 'position')::integer,
    rows.value ->> 'optionKind',
    rows.value ->> 'optionCode',
    rows.value ->> 'structureKind'
  from jsonb_array_elements(p_projection -> 'requirementOptions') as rows(value);

  insert into public.academic_structure_unmodelled_requirements (
    snapshot_id, position, source_text, source_locator
  )
  select
    new_snapshot_id,
    (rows.value ->> 'position')::integer,
    rows.value ->> 'sourceText',
    rows.value ->> 'sourceLocator'
  from jsonb_array_elements(p_projection -> 'unmodelledRequirements') as rows(value);

  update public.academic_structure_years
  set draft_snapshot_id = new_snapshot_id, updated_at = now()
  where id = selected_year.id
    and draft_snapshot_id is not distinct from previous_draft_id
    and published_snapshot_id is not distinct from previous_published_id;
  if not found then
    raise exception 'The academic structure draft changed before it could be saved.'
      using errcode = '40001';
  end if;

  return new_snapshot_id;
end;
$function$;

revoke all on function public.create_academic_structure_manual_snapshot(
  bigint,
  bigint,
  jsonb
) from public, anon;
grant execute on function public.create_academic_structure_manual_snapshot(
  bigint,
  bigint,
  jsonb
) to authenticated;

comment on function public.create_academic_structure_manual_snapshot(
  bigint,
  bigint,
  jsonb
) is
  'Creates a sealed manual descendant of the current academic structure draft, replaces every editable relational row and advances only the draft pointer.';
