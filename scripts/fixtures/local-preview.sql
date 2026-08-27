-- Explicit local preview data. Apply only through the loopback-guarded local
-- preview scripts. Supabase's configured default seed must stay empty.
-- Every catalogue record below uses explicit mock provenance and intentionally
-- separate DEMO structure codes so imported BCOMP and SOFT-MAJ drafts retain
-- their review and publication state.

begin;

do $seed$
declare
  demo_user_id uuid;
  demo_year_id bigint;
  demo_source_id bigint;
  demo_plan_id uuid;
  demo_programme_version_id bigint;
  demo_major_version_id bigint;
  course_row record;
  rule_row record;
  rule_id bigint;
  demo_group_id bigint;
  prerequisite_code text;
  prerequisite_position integer;
begin
  select users.id
  into demo_user_id
  from auth.users as users
  where lower(users.email) = 'test@test.com'
  limit 1;

  if demo_user_id is null then
    demo_user_id := '91000000-0000-4000-8000-000000000001';

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      phone_change,
      phone_change_token,
      email_change_token_current,
      email_change_confirm_status,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      is_sso_user,
      is_anonymous,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      'test@test.com',
      extensions.crypt('testtest', extensions.gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      0,
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Test Student"}'::jsonb,
      false,
      false,
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = extensions.crypt(
          'testtest',
          extensions.gen_salt('bf')
        ),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        phone_change = '',
        phone_change_token = '',
        email_change_token_current = '',
        email_change_confirm_status = 0,
        reauthentication_token = '',
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = jsonb_set(
          coalesce(raw_user_meta_data, '{}'::jsonb),
          '{full_name}',
          '"Test Student"'::jsonb,
          true
        ),
        updated_at = now()
    where id = demo_user_id;
  end if;

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  )
  values (
    demo_user_id::text,
    demo_user_id,
    jsonb_build_object(
      'sub', demo_user_id::text,
      'email', 'test@test.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = now();

  insert into public.profiles (id, email, display_name, student_number)
  values (demo_user_id, 'test@test.com', 'Test Student', 'u1234567')
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      student_number = excluded.student_number,
      updated_at = now();

  insert into private.user_roles (user_id, role_id, granted_by)
  select demo_user_id, roles.id, null
  from private.app_roles as roles
  where roles.key = 'admin'
  on conflict (user_id) do update
  set role_id = excluded.role_id,
      granted_by = null,
      granted_at = now();

  insert into public.catalogue_years (year, status, published_at)
  values (2026, 'published', '2026-08-01 00:00:00+10')
  on conflict (year) do update
  set status = excluded.status,
      published_at = excluded.published_at,
      updated_at = now()
  returning id into demo_year_id;

  insert into public.catalogue_sources (name, kind, base_url, is_active)
  values (
    'Coursemap local demonstration catalogue',
    'local_mock',
    'https://coursemap.local.test',
    true
  )
  on conflict (kind, base_url) do update
  set name = excluded.name,
      is_active = true,
      updated_at = now()
  returning id into demo_source_id;

  insert into public.catalogue_source_documents (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    canonical_url,
    content_sha256,
    source_last_modified,
    fetched_at
  )
  values (
    demo_source_id,
    demo_year_id,
    'calendar',
    '2026-KEY-DATES',
    'https://coursemap.local.test/2026/key-dates',
    md5('coursemap-local-2026-key-dates') || md5('published-calendar'),
    '2026-08-01 00:00:00+10',
    '2026-08-01 00:00:00+10'
  )
  on conflict (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    content_sha256
  ) do update
  set canonical_url = excluded.canonical_url,
      source_last_modified = excluded.source_last_modified,
      fetched_at = excluded.fetched_at;

  insert into public.university_calendar_events (
    calendar_year,
    event_date,
    title,
    status,
    source_document_id
  )
  select
    2026,
    events.event_date,
    events.title,
    'published',
    documents.id
  from (
    values
      ('2026-01-01'::date, 'New Year''s Day public holiday'),
      ('2026-01-02'::date, 'University offices re-open'),
      ('2026-02-16'::date, 'Orientation Week begins'),
      ('2026-02-23'::date, 'First Semester begins'),
      ('2026-03-31'::date, 'First Semester census date'),
      ('2026-04-03'::date, 'Good Friday public holiday'),
      ('2026-05-25'::date, 'First Semester examination period begins'),
      ('2026-06-26'::date, 'First Semester results released'),
      ('2026-07-20'::date, 'Second Semester orientation begins'),
      ('2026-07-27'::date, 'Second Semester begins'),
      ('2026-08-31'::date, 'Second Semester census date'),
      ('2026-09-07'::date, 'Teaching break commences'),
      ('2026-09-21'::date, 'Teaching resumes after the break'),
      ('2026-10-26'::date, 'Second Semester examination period begins'),
      ('2026-11-20'::date, 'Second Semester results released'),
      ('2026-12-14'::date, 'Graduation ceremonies commence')
  ) as events(event_date, title)
  join public.catalogue_source_documents as documents
    on documents.source_id = demo_source_id
   and documents.catalogue_year_id = demo_year_id
   and documents.entity_kind = 'calendar'
   and documents.external_key = '2026-KEY-DATES'
   and documents.content_sha256 =
     md5('coursemap-local-2026-key-dates') || md5('published-calendar')
  on conflict (calendar_year, event_date, title) do update
  set status = excluded.status,
      source_document_id = excluded.source_document_id,
      updated_at = now();

  create temporary table coursemap_demo_courses (
    code text primary key,
    title text not null,
    subject text not null,
    level smallint not null,
    school text not null,
    convener text,
    description text not null,
    delivery_summary text not null,
    sessions text[] not null
  ) on commit drop;

  insert into coursemap_demo_courses
    (code, title, subject, level, school, convener, description, delivery_summary, sessions)
  values
    ('COMP1100', 'Programming as Problem Solving', 'COMP', 1000, 'School of Computing', 'Dr Alice Morgan', 'Introduces computational problem solving, functional programming and foundational software design.', 'On-campus lectures, workshops and laboratories.', array['S1']),
    ('MATH1005', 'Discrete Mathematical Models', 'MATH', 1000, 'Mathematical Sciences Institute', 'Dr Noah Evans', 'Develops the discrete mathematics used to reason about algorithms, graphs and formal systems.', 'On-campus lectures and tutorials.', array['S1']),
    ('COMP1110', 'Structured Programming', 'COMP', 1000, 'School of Computing', 'Dr Priya Shah', 'Builds practical object-oriented programming, testing and collaborative development skills.', 'On-campus lectures, laboratories and group work.', array['S2']),
    ('COMP1600', 'Foundations of Computing', 'COMP', 1000, 'School of Computing', 'Dr Liam Chen', 'Covers logic, data representation, digital systems and the mathematical foundations of computing.', 'On-campus lectures and tutorials.', array['S2']),
    ('COMP2100', 'Software Design Methodologies', 'COMP', 2000, 'School of Computing', 'Dr Mia Thompson', 'Explores maintainable software architecture, interfaces, testing and team-based delivery.', 'On-campus lectures, studios and project work.', array['S1']),
    ('COMP2120', 'Software Engineering', 'COMP', 2000, 'School of Computing', 'Dr Ethan Williams', 'Applies software engineering practices to requirements, design, delivery and quality assurance.', 'On-campus lectures and a team project.', array['S2']),
    ('COMP2300', 'Computer Organisation and Program Execution', 'COMP', 2000, 'School of Computing', 'Dr Sofia Nguyen', 'Connects high-level programs with processors, memory, operating systems and low-level execution.', 'On-campus lectures and hardware laboratories.', array['S1']),
    ('COMP2400', 'Relational Databases', 'COMP', 2000, 'School of Computing', 'Dr Oliver Brown', 'Introduces relational modelling, SQL, transactions and reliable database application design.', 'On-campus lectures and practical laboratories.', array['S2']),
    ('INFS2024', 'Information Systems Analysis and Modelling', 'INFS', 2000, 'Research School of Management', 'Dr Grace Wilson', 'Examines how to model organisational processes, data and requirements for information systems.', 'On-campus seminars and workshops.', array['S2']),
    ('COMP3600', 'Algorithms', 'COMP', 3000, 'School of Computing', 'Dr Lucas Martin', 'Studies algorithm design, correctness and complexity across common computational problems.', 'On-campus lectures and problem classes.', array['S1']),
    ('COMP3670', 'Introduction to Machine Learning', 'COMP', 3000, 'School of Computing', 'Dr Amelia Taylor', 'Introduces supervised and unsupervised learning with practical evaluation of predictive models.', 'On-campus lectures, tutorials and laboratories.', array['S1']),
    ('COMP3900', 'Computing Project', 'COMP', 3000, 'School of Computing', 'Dr Jack Robinson', 'A capstone project integrating technical, communication and project management skills.', 'Team-based project with regular studio sessions.', array['S2']);

  insert into public.courses (code)
  select courses.code
  from coursemap_demo_courses as courses
  on conflict (code) do update
  set updated_at = now();

  insert into public.catalogue_source_documents (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    canonical_url,
    content_sha256,
    source_last_modified,
    fetched_at
  )
  select
    demo_source_id,
    demo_year_id,
    'course',
    courses.code,
    'https://coursemap.local.test/2026/courses/' || lower(courses.code),
    md5('coursemap-local-2026-' || courses.code) || md5(courses.code || '-published'),
    '2026-08-01 00:00:00+10'::timestamptz,
    '2026-08-01 00:00:00+10'::timestamptz
  from coursemap_demo_courses as courses
  on conflict (
    source_id,
    catalogue_year_id,
    entity_kind,
    external_key,
    content_sha256
  ) do update
  set canonical_url = excluded.canonical_url,
      source_last_modified = excluded.source_last_modified,
      fetched_at = excluded.fetched_at;

  insert into public.course_versions (
    course_id,
    catalogue_year_id,
    title,
    units,
    level,
    subject,
    school,
    convener,
    delivery_summary,
    description,
    publication_status,
    review_state,
    source_document_id,
    source_updated_at
  )
  select
    identities.id,
    demo_year_id,
    courses.title,
    6,
    courses.level,
    courses.subject,
    courses.school,
    courses.convener,
    courses.delivery_summary,
    courses.description,
    'published',
    'verified',
    documents.id,
    '2026-08-01 00:00:00+10'::timestamptz
  from coursemap_demo_courses as courses
  join public.courses as identities on identities.code = courses.code
  join public.catalogue_source_documents as documents
    on documents.source_id = demo_source_id
   and documents.catalogue_year_id = demo_year_id
   and documents.entity_kind = 'course'
   and documents.external_key = courses.code
   and documents.content_sha256 = md5('coursemap-local-2026-' || courses.code) || md5(courses.code || '-published')
  on conflict (course_id, catalogue_year_id) do update
  set title = excluded.title,
      units = excluded.units,
      level = excluded.level,
      subject = excluded.subject,
      school = excluded.school,
      convener = excluded.convener,
      delivery_summary = excluded.delivery_summary,
      description = excluded.description,
      publication_status = excluded.publication_status,
      review_state = excluded.review_state,
      source_document_id = excluded.source_document_id,
      source_updated_at = excluded.source_updated_at,
      updated_at = now();

  insert into public.academic_periods (
    calendar_year, code, name, short_name, starts_on, ends_on, sort_order, status
  )
  values
    (2026, 'S1', 'First Semester', 'Semester 1', '2026-02-23', '2026-06-28', 1, 'published'),
    (2026, 'S2', 'Second Semester', 'Semester 2', '2026-07-27', '2026-11-22', 2, 'published'),
    (2027, 'S1', 'First Semester', 'Semester 1', '2027-02-22', '2027-06-27', 1, 'published'),
    (2027, 'S2', 'Second Semester', 'Semester 2', '2027-07-26', '2027-11-21', 2, 'published'),
    (2028, 'S1', 'First Semester', 'Semester 1', '2028-02-21', '2028-06-25', 1, 'published'),
    (2028, 'S2', 'Second Semester', 'Semester 2', '2028-07-24', '2028-11-19', 2, 'published')
  on conflict (calendar_year, code) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      starts_on = excluded.starts_on,
      ends_on = excluded.ends_on,
      sort_order = excluded.sort_order,
      status = excluded.status,
      updated_at = now();

  insert into public.course_offerings (
    course_version_id,
    catalogue_year_id,
    delivery_mode,
    location,
    source_document_id,
    status
  )
  select
    versions.id,
    demo_year_id,
    'In person',
    'Acton campus',
    versions.source_document_id,
    'published'
  from public.course_versions as versions
  join public.courses as identities on identities.id = versions.course_id
  join coursemap_demo_courses as courses on courses.code = identities.code
  where versions.catalogue_year_id = demo_year_id
  on conflict (course_version_id) do update
  set catalogue_year_id = excluded.catalogue_year_id,
      delivery_mode = excluded.delivery_mode,
      location = excluded.location,
      source_document_id = excluded.source_document_id,
      status = excluded.status,
      updated_at = now();

  insert into public.offering_sessions (
    course_offering_id,
    catalogue_year_id,
    academic_period_id,
    delivery_mode,
    location,
    source_document_id
  )
  select
    offerings.id,
    demo_year_id,
    periods.id,
    offerings.delivery_mode,
    offerings.location,
    offerings.source_document_id
  from coursemap_demo_courses as courses
  cross join lateral unnest(courses.sessions) as session_codes(code)
  join public.courses as identities on identities.code = courses.code
  join public.course_versions as versions
    on versions.course_id = identities.id
   and versions.catalogue_year_id = demo_year_id
  join public.course_offerings as offerings on offerings.course_version_id = versions.id
  join public.academic_periods as periods
    on periods.calendar_year = 2026
   and periods.code = session_codes.code
  on conflict on constraint offering_sessions_offering_period_class_unique do update
  set delivery_mode = excluded.delivery_mode,
      location = excluded.location,
      source_document_id = excluded.source_document_id,
      updated_at = now();

  insert into public.catalogue_source_documents (
    source_id, catalogue_year_id, entity_kind, external_key, canonical_url,
    content_sha256, source_last_modified, fetched_at
  )
  values
    (demo_source_id, demo_year_id, 'structure', 'DEMO-BCOMP', 'https://coursemap.local.test/2026/programmes/demo-bcomp', md5('coursemap-local-demo-bcomp') || md5('2026-published'), '2026-08-01 00:00:00+10', '2026-08-01 00:00:00+10'),
    (demo_source_id, demo_year_id, 'structure', 'DEMO-SOFT', 'https://coursemap.local.test/2026/majors/demo-soft', md5('coursemap-local-demo-soft') || md5('2026-published'), '2026-08-01 00:00:00+10', '2026-08-01 00:00:00+10')
  on conflict (source_id, catalogue_year_id, entity_kind, external_key, content_sha256) do update
  set canonical_url = excluded.canonical_url,
      source_last_modified = excluded.source_last_modified,
      fetched_at = excluded.fetched_at;

  insert into public.academic_structures (code, kind)
  values ('DEMO-BCOMP', 'degree'), ('DEMO-SOFT', 'major')
  on conflict (code) do update
  set kind = excluded.kind,
      updated_at = now();

  insert into public.academic_structure_versions (
    structure_id, catalogue_year_id, name, units, duration_years, college,
    description, publication_status, review_state, source_document_id
  )
  select
    structures.id,
    demo_year_id,
    case structures.code
      when 'DEMO-BCOMP' then 'Bachelor of Computing (Demonstration)'
      else 'Software Development Major (Demonstration)'
    end,
    case structures.code when 'DEMO-BCOMP' then 144 else 48 end,
    case structures.code when 'DEMO-BCOMP' then 3 else 1 end,
    'ANU College of Systems and Society',
    case structures.code
      when 'DEMO-BCOMP' then 'A local demonstration programme for exploring Coursemap planning workflows.'
      else 'A local demonstration major focused on software design, engineering and project delivery.'
    end,
    'published',
    'verified',
    documents.id
  from public.academic_structures as structures
  join public.catalogue_source_documents as documents
    on documents.source_id = demo_source_id
   and documents.catalogue_year_id = demo_year_id
   and documents.entity_kind = 'structure'
   and documents.external_key = structures.code
  where structures.code in ('DEMO-BCOMP', 'DEMO-SOFT')
  on conflict (structure_id, catalogue_year_id) do update
  set name = excluded.name,
      units = excluded.units,
      duration_years = excluded.duration_years,
      college = excluded.college,
      description = excluded.description,
      publication_status = excluded.publication_status,
      review_state = excluded.review_state,
      source_document_id = excluded.source_document_id,
      updated_at = now();

  select versions.id
  into demo_programme_version_id
  from public.academic_structure_versions as versions
  join public.academic_structures as structures on structures.id = versions.structure_id
  where structures.code = 'DEMO-BCOMP'
    and versions.catalogue_year_id = demo_year_id;

  select versions.id
  into demo_major_version_id
  from public.academic_structure_versions as versions
  join public.academic_structures as structures on structures.id = versions.structure_id
  where structures.code = 'DEMO-SOFT'
    and versions.catalogue_year_id = demo_year_id;

  insert into public.requirement_groups (
    structure_version_id,
    catalogue_year_id,
    parent_group_id,
    code,
    name,
    description,
    operator,
    minimum_count,
    minimum_units,
    position,
    source_document_id,
    source_text
  )
  select
    versions.id,
    demo_year_id,
    null,
    'DEMO-ROOT',
    case structures.kind
      when 'degree' then 'Programme requirements'
      else 'Major requirements'
    end,
    'Local demonstration requirement root.',
    'all_of',
    null,
    null,
    0,
    versions.source_document_id,
    'Local demonstration requirements for interface previewing.'
  from public.academic_structure_versions as versions
  join public.academic_structures as structures
    on structures.id = versions.structure_id
  where versions.id in (demo_programme_version_id, demo_major_version_id)
  on conflict (structure_version_id) where parent_group_id is null do update
  set code = excluded.code,
      name = excluded.name,
      description = excluded.description,
      operator = excluded.operator,
      minimum_count = excluded.minimum_count,
      minimum_units = excluded.minimum_units,
      position = excluded.position,
      source_document_id = excluded.source_document_id,
      source_text = excluded.source_text,
      updated_at = now();

  insert into public.academic_structure_relationships (
    catalogue_year_id, parent_structure_version_id, child_structure_version_id,
    relationship_kind, position, source_document_id
  )
  select
    demo_year_id,
    demo_programme_version_id,
    demo_major_version_id,
    'option',
    0,
    versions.source_document_id
  from public.academic_structure_versions as versions
  where versions.id = demo_programme_version_id
  on conflict (parent_structure_version_id, child_structure_version_id, relationship_kind)
  do update
  set position = excluded.position,
      source_document_id = excluded.source_document_id,
      updated_at = now();

  create temporary table coursemap_demo_rules (
    course_code text primary key,
    prerequisite_codes text[] not null
  ) on commit drop;

  insert into coursemap_demo_rules (course_code, prerequisite_codes)
  values
    ('COMP1110', array['COMP1100']),
    ('COMP2100', array['COMP1110']),
    ('COMP3600', array['COMP1600', 'MATH1005']);

  for rule_row in select * from coursemap_demo_rules loop
    insert into public.course_rules (
      course_version_id, catalogue_year_id, rule_kind, hardness, source_text,
      review_state, confidence, source_document_id
    )
    select
      versions.id,
      demo_year_id,
      'prerequisite',
      'hard',
      'Prerequisite: ' || array_to_string(rule_row.prerequisite_codes, ' and '),
      'verified',
      1,
      versions.source_document_id
    from public.course_versions as versions
    join public.courses as identities on identities.id = versions.course_id
    where identities.code = rule_row.course_code
      and versions.catalogue_year_id = demo_year_id
    on conflict (course_version_id, rule_kind) do update
    set hardness = excluded.hardness,
        source_text = excluded.source_text,
        review_state = excluded.review_state,
        confidence = excluded.confidence,
        source_document_id = excluded.source_document_id,
        updated_at = now()
    returning id into rule_id;

    insert into public.course_rule_groups (
      course_rule_id, parent_group_id, operator, minimum_count, position
    )
    values (rule_id, null, 'all_of', null, 0)
    on conflict (course_rule_id) where parent_group_id is null do update
    set operator = excluded.operator,
        minimum_count = excluded.minimum_count,
        position = excluded.position,
        updated_at = now()
    returning id into demo_group_id;

    prerequisite_position := 0;
    foreach prerequisite_code in array rule_row.prerequisite_codes loop
      insert into public.course_rule_conditions (
        course_rule_id, group_id, condition_kind, required_course_id,
        source_text, confidence, review_state, position
      )
      select
        rule_id,
        demo_group_id,
        'course',
        identities.id,
        prerequisite_code,
        1,
        'verified',
        prerequisite_position
      from public.courses as identities
      where identities.code = prerequisite_code
      on conflict (group_id, position) do update
      set required_course_id = excluded.required_course_id,
          source_text = excluded.source_text,
          confidence = excluded.confidence,
          review_state = excluded.review_state,
          updated_at = now();

      insert into public.course_rule_course_references (
        course_rule_id, referenced_course_id, source_text, confidence, review_state
      )
      select rule_id, identities.id, prerequisite_code, 1, 'verified'
      from public.courses as identities
      where identities.code = prerequisite_code
      on conflict (course_rule_id, referenced_course_id) do update
      set source_text = excluded.source_text,
          confidence = excluded.confidence,
          review_state = excluded.review_state,
          updated_at = now();

      prerequisite_position := prerequisite_position + 1;
    end loop;
  end loop;

  insert into public.plans (
    owner_id, catalogue_year_id, name, is_primary, status,
    commencement_year, study_load, extension_years
  )
  values (
    demo_user_id, demo_year_id, 'Bachelor of Computing plan', true, 'active',
    2026, 'full_time', 0
  )
  on conflict (owner_id) where is_primary do update
  set catalogue_year_id = excluded.catalogue_year_id,
      name = excluded.name,
      status = excluded.status,
      commencement_year = excluded.commencement_year,
      study_load = excluded.study_load,
      extension_years = excluded.extension_years,
      updated_at = now()
  returning id into demo_plan_id;

  delete from public.plan_structures
  where plan_id = demo_plan_id
    and role in ('programme', 'major');

  insert into public.plan_structures (
    plan_id, owner_id, catalogue_year_id, structure_version_id, role, position
  )
  values
    (demo_plan_id, demo_user_id, demo_year_id, demo_programme_version_id, 'programme', 0),
    (demo_plan_id, demo_user_id, demo_year_id, demo_major_version_id, 'major', 0)
  on conflict (plan_id, structure_version_id) do update
  set role = excluded.role,
      position = excluded.position,
      updated_at = now();

  insert into public.plan_items (
    plan_id, owner_id, course_id, academic_period_id, sort_order, notes,
    planned_calendar_year, planned_period_code
  )
  select
    demo_plan_id,
    demo_user_id,
    identities.id,
    periods.id,
    planned.sort_order,
    'Local demonstration plan item',
    planned.calendar_year,
    planned.period_code
  from (
    values
      ('COMP1600', 2026::smallint, 'S2', 10::bigint),
      ('COMP2100', 2027::smallint, 'S1', 20::bigint),
      ('COMP2300', 2027::smallint, 'S1', 30::bigint),
      ('COMP2120', 2027::smallint, 'S2', 40::bigint),
      ('COMP2400', 2027::smallint, 'S2', 50::bigint),
      ('INFS2024', 2027::smallint, 'S2', 60::bigint),
      ('COMP3600', 2028::smallint, 'S1', 70::bigint),
      ('COMP3670', 2028::smallint, 'S1', 80::bigint),
      ('COMP3900', 2028::smallint, 'S2', 90::bigint)
  ) as planned(course_code, calendar_year, period_code, sort_order)
  join public.courses as identities on identities.code = planned.course_code
  join public.academic_periods as periods
    on periods.calendar_year = planned.calendar_year
   and periods.code = planned.period_code
  on conflict (plan_id, course_id) do update
  set academic_period_id = excluded.academic_period_id,
      sort_order = excluded.sort_order,
      notes = excluded.notes,
      planned_calendar_year = excluded.planned_calendar_year,
      planned_period_code = excluded.planned_period_code,
      updated_at = now();

  insert into public.course_attempts (
    owner_id, course_id, academic_period_id, status, mark, grade,
    units_attempted, units_earned, source
  )
  select
    demo_user_id,
    identities.id,
    periods.id,
    history.status,
    history.mark,
    history.grade,
    6,
    history.units_earned,
    'user_entered'
  from (
    values
      ('COMP1100', 2026::smallint, 'S1', 'completed', 78::numeric, 'D', 6::numeric),
      ('MATH1005', 2026::smallint, 'S1', 'completed', 72::numeric, 'CR', 6::numeric),
      ('COMP1110', 2026::smallint, 'S2', 'enrolled', null::numeric, null::text, 0::numeric)
  ) as history(course_code, calendar_year, period_code, status, mark, grade, units_earned)
  join public.courses as identities on identities.code = history.course_code
  join public.academic_periods as periods
    on periods.calendar_year = history.calendar_year
   and periods.code = history.period_code
  on conflict (owner_id, course_id, academic_period_id) do update
  set status = excluded.status,
      mark = excluded.mark,
      grade = excluded.grade,
      units_attempted = excluded.units_attempted,
      units_earned = excluded.units_earned,
      source = excluded.source,
      updated_at = now();

  delete from public.plan_items as items
  using public.courses as identities
  where items.plan_id = demo_plan_id
    and items.course_id = identities.id
    and identities.code in ('COMP1100', 'MATH1005', 'COMP1110');
end;
$seed$;

commit;
