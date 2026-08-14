begin;

do $migration$
declare
  v_source_id bigint;
  v_year_id bigint;
  v_run_id uuid;
  v_bcomp_document_id bigint;
  v_soft_document_id bigint;
  v_bcomp_structure_id bigint;
  v_soft_structure_id bigint;
  v_bcomp_version_id bigint;
  v_soft_version_id bigint;
  v_bcomp_item_id bigint;
  v_soft_item_id bigint;
  v_bcomp_root_id bigint;
  v_bcomp_computing_id bigint;
  v_bcomp_programming_one_id bigint;
  v_bcomp_programming_two_id bigint;
  v_bcomp_math_id bigint;
  v_bcomp_core_id bigint;
  v_bcomp_path_id bigint;
  v_bcomp_majors_id bigint;
  v_bcomp_ict_id bigint;
  v_soft_root_id bigint;
  v_soft_compulsory_id bigint;
  v_soft_minimum_list_id bigint;
begin
  insert into public.catalogue_sources (name, kind, base_url)
  values (
    'ANU Programs and Courses',
    'anu_programs_courses_html',
    'https://programsandcourses.anu.edu.au'
  )
  on conflict (kind, base_url) do update
  set name = excluded.name,
      updated_at = now()
  returning id into v_source_id;

  insert into public.catalogue_years (year)
  values (2026)
  on conflict (year) do update
  set updated_at = public.catalogue_years.updated_at
  returning id into v_year_id;

  insert into public.catalogue_source_documents (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    canonical_url,
    content_sha256,
    fetched_at
  )
  values (
    v_source_id,
    v_year_id,
    'structure',
    'BCOMP',
    'https://programsandcourses.anu.edu.au/2026/program/BCOMP',
    '6f7ba448f357810eb574187f1a48a1748a8223392b665bad81b05cb6bc27fcc4',
    '2026-08-14 06:16:00+00'
  )
  on conflict (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    content_sha256
  ) do update
  set canonical_url = excluded.canonical_url
  returning id into v_bcomp_document_id;

  insert into public.catalogue_source_documents (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    canonical_url,
    content_sha256,
    fetched_at
  )
  values (
    v_source_id,
    v_year_id,
    'structure',
    'SOFT-MAJ',
    'https://programsandcourses.anu.edu.au/2026/major/SOFT-MAJ',
    '5502f3999911817064480589f7f57aa9c1cfb0fcb2ae5cded22a5abb4a9b87c1',
    '2026-08-14 06:16:00+00'
  )
  on conflict (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    content_sha256
  ) do update
  set canonical_url = excluded.canonical_url
  returning id into v_soft_document_id;

  insert into public.catalogue_import_runs (
    source_id,
    catalogue_year_id,
    scope,
    trigger_kind,
    parser_version,
    status,
    checked_count,
    added_count,
    changed_count,
    unchanged_count,
    failed_count,
    started_at,
    completed_at
  )
  values (
    v_source_id,
    v_year_id,
    'structure_codes:BCOMP,SOFT-MAJ',
    'manual',
    'normalised-official-structure-seed-v1',
    'succeeded',
    2,
    2,
    0,
    0,
    0,
    '2026-08-14 06:16:00+00',
    '2026-08-14 06:16:00+00'
  )
  returning id into v_run_id;

  insert into public.courses (code)
  select course_code
  from unnest(array[
    'ARTH2181', 'ASIA3032', 'COMP1100', 'COMP1110', 'COMP1130',
    'COMP1140', 'COMP1600', 'COMP2100', 'COMP2120', 'COMP2300',
    'COMP2400', 'COMP2700', 'COMP3500', 'COMP3600', 'COMP3610',
    'COMP3900', 'COMP4130', 'DESN2010', 'ENGN1211', 'ENGN2300',
    'ENVS2015', 'INFS2024', 'INFS3002', 'INFS3024', 'INFS3059',
    'MATH1005', 'MATH1013', 'MATH1115', 'MATH2222', 'MATH2301',
    'MATH2307', 'MGMT2009', 'MUSI3309', 'SCOM3029', 'SOCY2038',
    'SOCY2166', 'STAT1003', 'STAT1008'
  ]::text[]) as course_codes(course_code)
  on conflict (code) do nothing;

  insert into public.academic_structures (code, kind)
  values
    ('BCOMP', 'degree'),
    ('COMS-MAJ', 'major'),
    ('CSEC-MAJ', 'major'),
    ('DTSC-MAJ', 'major'),
    ('HCCC-MAJ', 'major'),
    ('INFS-MAJ', 'major'),
    ('INSY-MAJ', 'major'),
    ('SOFT-MAJ', 'major')
  on conflict (code) do nothing;

  if exists (
    select 1
    from public.academic_structures
    where (code = 'BCOMP' and kind <> 'degree')
       or (code in (
         'COMS-MAJ', 'CSEC-MAJ', 'DTSC-MAJ', 'HCCC-MAJ',
         'INFS-MAJ', 'INSY-MAJ', 'SOFT-MAJ'
       ) and kind <> 'major')
  ) then
    raise exception 'Existing academic structure kind conflicts with the official 2026 source.';
  end if;

  select id into strict v_bcomp_structure_id
  from public.academic_structures
  where code = 'BCOMP';

  select id into strict v_soft_structure_id
  from public.academic_structures
  where code = 'SOFT-MAJ';

  insert into public.academic_structure_versions (
    structure_id,
    catalogue_year_id,
    name,
    units,
    duration_years,
    college,
    description,
    publication_status,
    review_state,
    source_document_id
  )
  values (
    v_bcomp_structure_id,
    v_year_id,
    'Bachelor of Computing',
    144,
    3.0,
    'ANU College of Systems and Society',
    'A three-year undergraduate computing degree with core computing study, an optional computing major pathway and university electives.',
    'draft',
    'review',
    v_bcomp_document_id
  )
  on conflict (structure_id, catalogue_year_id) do update
  set name = excluded.name,
      units = excluded.units,
      duration_years = excluded.duration_years,
      college = excluded.college,
      description = excluded.description,
      publication_status = 'draft',
      review_state = 'review',
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_version_id;

  insert into public.academic_structure_versions (
    structure_id,
    catalogue_year_id,
    name,
    units,
    duration_years,
    college,
    description,
    publication_status,
    review_state,
    source_document_id
  )
  values (
    v_soft_structure_id,
    v_year_id,
    'Software Development',
    48,
    null,
    'ANU College of Engineering Computing & Cybernetics',
    'A computing major focused on the conceptual and practical skills used to create high-quality software systems.',
    'draft',
    'review',
    v_soft_document_id
  )
  on conflict (structure_id, catalogue_year_id) do update
  set name = excluded.name,
      units = excluded.units,
      duration_years = excluded.duration_years,
      college = excluded.college,
      description = excluded.description,
      publication_status = 'draft',
      review_state = 'review',
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_soft_version_id;

  insert into public.academic_structure_relationships (
    catalogue_year_id,
    parent_structure_version_id,
    child_structure_version_id,
    relationship_kind,
    position,
    source_document_id
  )
  values (
    v_year_id,
    v_bcomp_version_id,
    v_soft_version_id,
    'option',
    6,
    v_bcomp_document_id
  )
  on conflict (
    parent_structure_version_id,
    child_structure_version_id,
    relationship_kind
  ) do update
  set position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now();

  insert into public.requirement_groups (
    structure_version_id,
    catalogue_year_id,
    parent_group_id,
    code,
    name,
    description,
    source_text,
    operator,
    minimum_count,
    minimum_units,
    position,
    source_document_id
  )
  values (
    v_bcomp_version_id,
    v_year_id,
    null,
    'BCOMP_ROOT',
    'Bachelor of Computing requirements',
    'Completion of 144 units under the 2026 programme rules.',
    'The Bachelor of Computing requires completion of 144 units, of which:',
    'all_of',
    null,
    null,
    0,
    v_bcomp_document_id
  )
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      description = excluded.description,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = excluded.minimum_count,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_root_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    description, source_text, operator, minimum_units, position,
    source_document_id
  )
  values (
    v_bcomp_version_id, v_year_id, v_bcomp_root_id,
    'BCOMP_COMPUTING_96', 'Listed computing requirements',
    'At least 96 units from the listed computing requirements.',
    'A minimum of 96 units from completion of courses from the following lists:',
    'at_least', 96, 0, v_bcomp_document_id
  )
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      description = excluded.description,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_computing_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, minimum_units, position, source_document_id
  ) values
    (v_bcomp_version_id, v_year_id, v_bcomp_computing_id,
     'BCOMP_PROGRAMMING_ONE', 'First programming course',
     '6 units from completion of a course from the following list: COMP1100 or COMP1130.',
     'at_least', 6, 0, v_bcomp_document_id)
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_programming_one_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, minimum_units, position, source_document_id
  ) values
    (v_bcomp_version_id, v_year_id, v_bcomp_computing_id,
     'BCOMP_PROGRAMMING_TWO', 'Second programming course',
     '6 units from completion of a course from the following list: COMP1110 or COMP1140.',
     'at_least', 6, 1, v_bcomp_document_id)
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_programming_two_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, minimum_units, position, source_document_id
  ) values
    (v_bcomp_version_id, v_year_id, v_bcomp_computing_id,
     'BCOMP_MATH_CHOICE', 'Mathematics choice',
     '6 units from completion of MATH1005 or MATH2222.',
     'at_least', 6, 2, v_bcomp_document_id)
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_math_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, position, source_document_id
  ) values
    (v_bcomp_version_id, v_year_id, v_bcomp_computing_id,
     'BCOMP_CORE', 'Compulsory computing courses',
     '24 units from the completion of the following compulsory courses.',
     'all_of', 3, v_bcomp_document_id)
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = null,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_core_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, position, source_document_id
  ) values
    (v_bcomp_version_id, v_year_id, v_bcomp_computing_id,
     'BCOMP_COMPUTING_PATH', 'Computing study or major',
     '48 units from COMP courses OR completion of one listed computing major.',
     'any_of', 4, v_bcomp_document_id)
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = null,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_path_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, position, source_document_id
  ) values
    (v_bcomp_version_id, v_year_id, v_bcomp_path_id,
     'BCOMP_MAJOR_OPTIONS', 'Computing major options',
     'OR completion of one of the following computing majors.',
     'any_of', 0, v_bcomp_document_id)
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = null,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_majors_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, minimum_units, position, source_document_id
  ) values
    (v_bcomp_version_id, v_year_id, v_bcomp_computing_id,
     'BCOMP_ICT_CHOICE', 'ICT-related course choice',
     '6 units from the listed Information and Communications Technology-related courses.',
     'at_least', 6, 5, v_bcomp_document_id)
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_bcomp_ict_id;

  insert into public.requirement_conditions (
    structure_version_id,
    requirement_group_id,
    code,
    condition_kind,
    course_id,
    source_text,
    position
  )
  select
    v_bcomp_version_id,
    condition_data.group_id,
    condition_data.condition_code,
    'course',
    courses.id,
    condition_data.source_text,
    condition_data.position
  from (
    values
      (v_bcomp_programming_one_id, 'BCOMP_COMP1100', 'COMP1100', 'COMP1100 Programming as Problem Solving (6 units)', 0),
      (v_bcomp_programming_one_id, 'BCOMP_COMP1130', 'COMP1130', 'COMP1130 Programming as Problem Solving (Advanced) (6 units)', 1),
      (v_bcomp_programming_two_id, 'BCOMP_COMP1110', 'COMP1110', 'COMP1110 Structured Programming (6 units)', 0),
      (v_bcomp_programming_two_id, 'BCOMP_COMP1140', 'COMP1140', 'COMP1140 Structured Programming (Advanced) (6 units)', 1),
      (v_bcomp_math_id, 'BCOMP_MATH1005', 'MATH1005', 'MATH1005 Discrete Mathematical Models (6 units)', 0),
      (v_bcomp_math_id, 'BCOMP_MATH2222', 'MATH2222', 'MATH2222 Introduction to Mathematical Thinking: Problem-Solving and Proofs (6 units)', 1),
      (v_bcomp_core_id, 'BCOMP_COMP1600', 'COMP1600', 'COMP1600 Foundations of Computing (6 units)', 0),
      (v_bcomp_core_id, 'BCOMP_COMP2100', 'COMP2100', 'COMP2100 Software Construction (6 units)', 1),
      (v_bcomp_core_id, 'BCOMP_COMP2300', 'COMP2300', 'COMP2300 Computer Architecture (6 units)', 2),
      (v_bcomp_core_id, 'BCOMP_COMP2400', 'COMP2400', 'COMP2400 Relational Databases (6 units)', 3),
      (v_bcomp_ict_id, 'BCOMP_ARTH2181', 'ARTH2181', 'ARTH2181 Digital Approaches to Art History and Curatorship (6 units)', 0),
      (v_bcomp_ict_id, 'BCOMP_ASIA3032', 'ASIA3032', 'ASIA3032 Digital Asia: Technology and Society (6 units)', 1),
      (v_bcomp_ict_id, 'BCOMP_DESN2010', 'DESN2010', 'DESN2010 Making Creative and Critical Technologies: Physical Computing for Design and Art (6 units)', 2),
      (v_bcomp_ict_id, 'BCOMP_ENGN1211', 'ENGN1211', 'ENGN1211 Engineering Design 1: Discovering Engineering (6 units)', 3),
      (v_bcomp_ict_id, 'BCOMP_ENVS2015', 'ENVS2015', 'ENVS2015 GIS and Spatial Analysis', 4),
      (v_bcomp_ict_id, 'BCOMP_INFS2024', 'INFS2024', 'INFS2024 Information Systems Analysis (6 units)', 5),
      (v_bcomp_ict_id, 'BCOMP_INFS3002', 'INFS3002', 'INFS3002 Enterprise Systems in Business (6 units)', 6),
      (v_bcomp_ict_id, 'BCOMP_INFS3024', 'INFS3024', 'INFS3024 Information Systems Management (6 units)', 7),
      (v_bcomp_ict_id, 'BCOMP_MATH1013', 'MATH1013', 'MATH1013 Mathematics and Applications 1 (6 units)', 8),
      (v_bcomp_ict_id, 'BCOMP_MATH1115', 'MATH1115', 'MATH1115 Advanced Mathematics and Applications 1 (6 units)', 9),
      (v_bcomp_ict_id, 'BCOMP_MATH2301', 'MATH2301', 'MATH2301 Games, Graphs and Machines (6 units)', 10),
      (v_bcomp_ict_id, 'BCOMP_MATH2307', 'MATH2307', 'MATH2307 Bioinformatics and Biological Modelling (6 units)', 11),
      (v_bcomp_ict_id, 'BCOMP_MGMT2009', 'MGMT2009', 'MGMT2009 Design Thinking: Human-Centred Innovation (6 units)', 12),
      (v_bcomp_ict_id, 'BCOMP_MUSI3309', 'MUSI3309', 'MUSI3309 Music and Digital Media (6 units)', 13),
      (v_bcomp_ict_id, 'BCOMP_SCOM3029', 'SCOM3029', 'SCOM3029 Science Communication and Planetary Crises (6 units)', 14),
      (v_bcomp_ict_id, 'BCOMP_SOCY2038', 'SOCY2038', 'SOCY2038 Introduction to Quantitative Research Methods (6 units)', 15),
      (v_bcomp_ict_id, 'BCOMP_SOCY2166', 'SOCY2166', 'SOCY2166 Social Science of the Internet (6 units)', 16),
      (v_bcomp_ict_id, 'BCOMP_STAT1003', 'STAT1003', 'STAT1003 Statistical Techniques (6 units)', 17),
      (v_bcomp_ict_id, 'BCOMP_STAT1008', 'STAT1008', 'STAT1008 Quantitative Research Methods (6 units)', 18)
  ) as condition_data(group_id, condition_code, course_code, source_text, position)
  join public.courses on courses.code = condition_data.course_code
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = excluded.course_id,
      target_structure_id = null,
      subject_code = null,
      minimum_course_level = null,
      maximum_course_level = null,
      minimum_units = null,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.requirement_conditions (
    structure_version_id, requirement_group_id, code, condition_kind,
    subject_code, minimum_units, source_text, position
  ) values (
    v_bcomp_version_id,
    v_bcomp_path_id,
    'BCOMP_COMP_SUBJECT_48',
    'subject',
    'COMP',
    48,
    '48 units from completion of courses from the subject area COMP Computer Science.',
    0
  )
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = null,
      target_structure_id = null,
      subject_code = excluded.subject_code,
      minimum_course_level = null,
      maximum_course_level = null,
      minimum_units = excluded.minimum_units,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.requirement_conditions (
    structure_version_id,
    requirement_group_id,
    code,
    condition_kind,
    target_structure_id,
    source_text,
    position
  )
  select
    v_bcomp_version_id,
    v_bcomp_majors_id,
    'BCOMP_' || replace(structures.code, '-', '_'),
    'structure',
    structures.id,
    structures.code,
    row_number() over (order by structures.code)::integer - 1
  from public.academic_structures as structures
  where structures.code in (
    'COMS-MAJ', 'CSEC-MAJ', 'DTSC-MAJ', 'HCCC-MAJ',
    'INFS-MAJ', 'INSY-MAJ', 'SOFT-MAJ'
  )
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = null,
      target_structure_id = excluded.target_structure_id,
      subject_code = null,
      minimum_course_level = null,
      maximum_course_level = null,
      minimum_units = null,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.requirement_conditions (
    structure_version_id, requirement_group_id, code, condition_kind,
    minimum_units, source_text, position
  ) values (
    v_bcomp_version_id,
    v_bcomp_root_id,
    'BCOMP_ELECTIVES_48',
    'elective',
    48,
    'A minimum of 48 units from completion of elective courses offered by ANU.',
    0
  )
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = null,
      target_structure_id = null,
      subject_code = null,
      minimum_course_level = null,
      maximum_course_level = null,
      minimum_units = excluded.minimum_units,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.requirement_conditions (
    structure_version_id, requirement_group_id, code, condition_kind,
    source_text, position
  ) values
    (
      v_bcomp_version_id,
      v_bcomp_root_id,
      'BCOMP_TRANSDISCIPLINARY_12',
      'other',
      'A minimum of 12 units must come from completion of courses tagged as Transdisciplinary Problem-Solving.',
      1
    ),
    (
      v_bcomp_version_id,
      v_bcomp_root_id,
      'BCOMP_ADVANCED_COMP_24',
      'other',
      'A minimum of 24 units must come from completion of 3000 and 4000-level COMP courses.',
      2
    ),
    (
      v_bcomp_version_id,
      v_bcomp_root_id,
      'BCOMP_MAX_1000_LEVEL_60',
      'other',
      'A maximum of 60 units may come from completion of 1000-level courses.',
      3
    )
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = null,
      target_structure_id = null,
      subject_code = null,
      minimum_course_level = null,
      maximum_course_level = null,
      minimum_units = null,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.requirement_groups (
    structure_version_id,
    catalogue_year_id,
    parent_group_id,
    code,
    name,
    description,
    source_text,
    operator,
    minimum_count,
    minimum_units,
    position,
    source_document_id
  ) values (
    v_soft_version_id,
    v_year_id,
    null,
    'SOFT_ROOT',
    'Software Development major requirements',
    'Completion of 48 units under the 2026 major rules.',
    'The SOFT major requires the completion of 48 units, which must consist of:',
    'all_of',
    null,
    null,
    0,
    v_soft_document_id
  )
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      description = excluded.description,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = excluded.minimum_count,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_soft_root_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, position, source_document_id
  ) values (
    v_soft_version_id,
    v_year_id,
    v_soft_root_id,
    'SOFT_COMPULSORY',
    'Compulsory courses',
    '24 units from the completion of the following compulsory courses.',
    'all_of',
    0,
    v_soft_document_id
  )
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = null,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_soft_compulsory_id;

  insert into public.requirement_groups (
    structure_version_id, catalogue_year_id, parent_group_id, code, name,
    source_text, operator, minimum_units, position, source_document_id
  ) values (
    v_soft_version_id,
    v_year_id,
    v_soft_root_id,
    'SOFT_MINIMUM_LIST',
    'Advanced software course list',
    'A minimum of 12 units from the following list.',
    'at_least',
    12,
    1,
    v_soft_document_id
  )
  on conflict (structure_version_id, code) do update
  set parent_group_id = excluded.parent_group_id,
      name = excluded.name,
      source_text = excluded.source_text,
      operator = excluded.operator,
      minimum_count = null,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now()
  returning id into v_soft_minimum_list_id;

  insert into public.requirement_conditions (
    structure_version_id,
    requirement_group_id,
    code,
    condition_kind,
    course_id,
    source_text,
    position
  )
  select
    v_soft_version_id,
    condition_data.group_id,
    condition_data.condition_code,
    'course',
    courses.id,
    condition_data.source_text,
    condition_data.position
  from (
    values
      (v_soft_compulsory_id, 'SOFT_COMP2120', 'COMP2120', 'COMP2120 Software Engineering (6 units)', 0),
      (v_soft_compulsory_id, 'SOFT_COMP3500', 'COMP3500', 'COMP3500 Software Engineering Project (6+6 units)', 1),
      (v_soft_compulsory_id, 'SOFT_COMP4130', 'COMP4130', 'COMP4130 Managing Software Quality and Process (6 units)', 2),
      (v_soft_minimum_list_id, 'SOFT_COMP3600', 'COMP3600', 'COMP3600 Algorithms (6 units)', 0),
      (v_soft_minimum_list_id, 'SOFT_COMP3610', 'COMP3610', 'COMP3610 Principles of Programming Languages (6 units)', 1),
      (v_soft_minimum_list_id, 'SOFT_COMP3900', 'COMP3900', 'COMP3900 Human-Computer Interaction (6 units)', 2),
      (v_soft_minimum_list_id, 'SOFT_INFS3024', 'INFS3024', 'INFS3024 Information Systems Management (6 units)', 3),
      (v_soft_minimum_list_id, 'SOFT_INFS3059', 'INFS3059', 'INFS3059 Project Management and Information Systems (6 units)', 4)
  ) as condition_data(group_id, condition_code, course_code, source_text, position)
  join public.courses on courses.code = condition_data.course_code
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = excluded.course_id,
      target_structure_id = null,
      subject_code = null,
      minimum_course_level = null,
      maximum_course_level = null,
      minimum_units = null,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.requirement_conditions (
    structure_version_id, requirement_group_id, code, condition_kind,
    minimum_course_level, maximum_course_level, minimum_units,
    source_text, position
  ) values (
    v_soft_version_id,
    v_soft_root_id,
    'SOFT_ADVANCED_LEVEL_18',
    'level',
    3000,
    4999,
    18,
    'A minimum of 18 units must come from completion of 3000 and 4000-level courses.',
    0
  )
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = null,
      target_structure_id = null,
      subject_code = null,
      minimum_course_level = excluded.minimum_course_level,
      maximum_course_level = excluded.maximum_course_level,
      minimum_units = excluded.minimum_units,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.requirement_conditions (
    structure_version_id, requirement_group_id, code, condition_kind,
    source_text, position
  ) values
    (
      v_soft_version_id,
      v_soft_root_id,
      'SOFT_MAX_1000_LEVEL_18',
      'other',
      'A maximum of 18 units may come from completion of 1000-level courses.',
      1
    ),
    (
      v_soft_version_id,
      v_soft_root_id,
      'SOFT_MAXIMUM_LIST_12',
      'other',
      'A maximum of 12 units may come from ASIA3032, COMP2700, ENGN1211, ENGN2300, INFS3002, MGMT2009 and SCOM3029.',
      2
    ),
    (
      v_soft_version_id,
      v_soft_root_id,
      'SOFT_PROGRAMME_EXCLUSIONS',
      'other',
      'The SOFT-MAJ is not available to AENSE/ASENG, AACOM or AACRD students.',
      3
    )
  on conflict (requirement_group_id, code) do update
  set condition_kind = excluded.condition_kind,
      course_id = null,
      target_structure_id = null,
      subject_code = null,
      minimum_course_level = null,
      maximum_course_level = null,
      minimum_units = null,
      source_text = excluded.source_text,
      position = excluded.position,
      updated_at = now();

  insert into public.catalogue_import_items (
    run_id,
    source_document_id,
    source_id,
    catalogue_year_id,
    outcome,
    target_kind,
    target_key,
    diagnostics
  ) values (
    v_run_id,
    v_bcomp_document_id,
    v_source_id,
    v_year_id,
    'review',
    'academic_structure_version',
    'BCOMP',
    jsonb_build_object('warning_count', 4)
  )
  returning id into v_bcomp_item_id;

  insert into public.catalogue_import_items (
    run_id,
    source_document_id,
    source_id,
    catalogue_year_id,
    outcome,
    target_kind,
    target_key,
    diagnostics
  ) values (
    v_run_id,
    v_soft_document_id,
    v_source_id,
    v_year_id,
    'review',
    'academic_structure_version',
    'SOFT-MAJ',
    jsonb_build_object('warning_count', 4)
  )
  returning id into v_soft_item_id;

  insert into public.catalogue_review_items (
    import_item_id,
    issue_code,
    summary,
    details
  ) values
    (
      v_bcomp_item_id,
      'UNSUPPORTED_TAG_REQUIREMENT',
      'BCOMP transdisciplinary tag requirement needs a catalogue tag model',
      jsonb_build_object(
        'structure_code', 'BCOMP',
        'source_text', 'A minimum of 12 units must come from completion of courses tagged as Transdisciplinary Problem-Solving.'
      )
    ),
    (
      v_bcomp_item_id,
      'UNSUPPORTED_INTERSECTION_REQUIREMENT',
      'BCOMP advanced COMP requirement combines subject and level filters',
      jsonb_build_object(
        'structure_code', 'BCOMP',
        'source_text', 'A minimum of 24 units must come from completion of 3000 and 4000-level COMP courses.'
      )
    ),
    (
      v_bcomp_item_id,
      'UNSUPPORTED_MAXIMUM_UNITS',
      'BCOMP maximum 1000-level units are preserved for review',
      jsonb_build_object(
        'structure_code', 'BCOMP',
        'source_text', 'A maximum of 60 units may come from completion of 1000-level courses.'
      )
    ),
    (
      v_bcomp_item_id,
      'UNRESOLVED_STRUCTURE_VERSIONS',
      'Six BCOMP major options do not yet have imported 2026 versions',
      jsonb_build_object(
        'structure_code', 'BCOMP',
        'target_codes', jsonb_build_array(
          'COMS-MAJ', 'CSEC-MAJ', 'DTSC-MAJ',
          'HCCC-MAJ', 'INFS-MAJ', 'INSY-MAJ'
        )
      )
    ),
    (
      v_soft_item_id,
      'UNSUPPORTED_MAXIMUM_UNITS',
      'SOFT-MAJ maximum 1000-level units are preserved for review',
      jsonb_build_object(
        'structure_code', 'SOFT-MAJ',
        'source_text', 'A maximum of 18 units may come from completion of 1000-level courses.'
      )
    ),
    (
      v_soft_item_id,
      'UNSUPPORTED_MAXIMUM_LIST',
      'SOFT-MAJ maximum list rule is preserved for review',
      jsonb_build_object(
        'structure_code', 'SOFT-MAJ',
        'source_text', 'A maximum of 12 units may come from the listed courses.'
      )
    ),
    (
      v_soft_item_id,
      'REPEATED_CONSECUTIVE_COURSE',
      'COMP3500 must be interpreted as a 6+6 unit project sequence',
      jsonb_build_object(
        'structure_code', 'SOFT-MAJ',
        'course_code', 'COMP3500',
        'source_text', 'COMP3500 Software Engineering Project (6+6 units)'
      )
    ),
    (
      v_soft_item_id,
      'PROGRAMME_EXCLUSIONS_UNMODELLED',
      'SOFT-MAJ programme exclusions require a typed eligibility model',
      jsonb_build_object(
        'structure_code', 'SOFT-MAJ',
        'source_text', 'The SOFT-MAJ is not available to AENSE/ASENG, AACOM or AACRD students.'
      )
    );
end;
$migration$;

commit;
