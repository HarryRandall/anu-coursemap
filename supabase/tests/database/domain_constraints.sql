begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(11);

insert into public.catalogue_years (year)
values (2194), (2195);

insert into public.catalogue_sources (name, kind, base_url)
values
  ('Domain source A', 'test', 'https://source-a.example.test'),
  ('Domain source B', 'test', 'https://source-b.example.test');

insert into public.catalogue_source_documents (
  source_id,
  catalogue_year_id,
  entity_kind,
  external_key,
  canonical_url,
  content_sha256
)
values
  (
    (select id from public.catalogue_sources where name = 'Domain source A'),
    (select id from public.catalogue_years where year = 2194),
    'course',
    'course-a-2194',
    'https://source-a.example.test/2194/course',
    repeat('a', 64)
  ),
  (
    (select id from public.catalogue_sources where name = 'Domain source A'),
    (select id from public.catalogue_years where year = 2194),
    'structure',
    'structure-a-2194',
    'https://source-a.example.test/2194/structure',
    repeat('b', 64)
  ),
  (
    (select id from public.catalogue_sources where name = 'Domain source A'),
    (select id from public.catalogue_years where year = 2195),
    'course',
    'course-a-2195',
    'https://source-a.example.test/2195/course',
    repeat('c', 64)
  ),
  (
    (select id from public.catalogue_sources where name = 'Domain source B'),
    (select id from public.catalogue_years where year = 2194),
    'course',
    'course-b-2194',
    'https://source-b.example.test/2194/course',
    repeat('d', 64)
  );

insert into public.catalogue_import_runs (
  id,
  source_id,
  catalogue_year_id,
  scope,
  trigger_kind,
  parser_version
)
values (
  '40000000-0000-4000-8000-000000000001',
  (select id from public.catalogue_sources where name = 'Domain source A'),
  (select id from public.catalogue_years where year = 2194),
  'domain constraint fixture',
  'cli',
  'test-v1'
);

select extensions.lives_ok(
  $$
    insert into public.catalogue_import_items (
      run_id,
      source_document_id,
      source_id,
      catalogue_year_id,
      outcome
    )
    select
      '40000000-0000-4000-8000-000000000001',
      documents.id,
      sources.id,
      years.id,
      'unchanged'
    from public.catalogue_source_documents as documents
    join public.catalogue_sources as sources
      on sources.id = documents.source_id
    join public.catalogue_years as years
      on years.id = documents.catalogue_year_id
    where documents.external_key = 'course-a-2194'
  $$,
  'matching import provenance is accepted'
);

select extensions.throws_ok(
  $$
    insert into public.catalogue_import_items (
      run_id,
      source_document_id,
      source_id,
      catalogue_year_id,
      outcome
    )
    select
      '40000000-0000-4000-8000-000000000001',
      documents.id,
      (select id from public.catalogue_sources where name = 'Domain source A'),
      (select id from public.catalogue_years where year = 2194),
      'unchanged'
    from public.catalogue_source_documents as documents
    where documents.external_key = 'course-b-2194'
  $$,
  '23503',
  null,
  'an import item cannot combine a run and document from different sources'
);

insert into public.courses (code)
values ('TREE1000'), ('BADY1000');

select extensions.throws_ok(
  $$
    insert into public.course_versions (
      course_id,
      catalogue_year_id,
      title,
      units,
      level,
      subject,
      school,
      description,
      source_document_id
    )
    select
      courses.id,
      (select id from public.catalogue_years where year = 2194),
      'Mismatched provenance course',
      6,
      1000,
      'BADY',
      'Test school',
      'This insert must fail.',
      documents.id
    from public.courses as courses
    cross join public.catalogue_source_documents as documents
    where courses.code = 'BADY1000'
      and documents.external_key = 'course-a-2195'
  $$,
  '23503',
  null,
  'a course version cannot cite a source document from another catalogue year'
);

insert into public.course_versions (
  course_id,
  catalogue_year_id,
  title,
  units,
  level,
  subject,
  school,
  description,
  source_document_id
)
select
  courses.id,
  years.id,
  'Tree test course',
  6,
  1000,
  'TREE',
  'Test school',
  'A valid course rule tree fixture.',
  documents.id
from public.courses as courses
cross join public.catalogue_years as years
cross join public.catalogue_source_documents as documents
where courses.code = 'TREE1000'
  and years.year = 2194
  and documents.external_key = 'course-a-2194';

insert into public.academic_structures (code, kind)
values ('TEST-DEGREE', 'degree');

insert into public.academic_structure_versions (
  structure_id,
  catalogue_year_id,
  name,
  units,
  duration_years,
  description,
  source_document_id
)
select
  structures.id,
  years.id,
  'Test degree',
  144,
  3,
  'A valid requirement tree fixture.',
  documents.id
from public.academic_structures as structures
cross join public.catalogue_years as years
cross join public.catalogue_source_documents as documents
where structures.code = 'TEST-DEGREE'
  and years.year = 2194
  and documents.external_key = 'structure-a-2194';

insert into public.requirement_groups (
  structure_version_id,
  catalogue_year_id,
  parent_group_id,
  code,
  name,
  source_text,
  operator,
  position,
  source_document_id
)
select
  versions.id,
  versions.catalogue_year_id,
  null,
  'ROOT',
  'Root',
  'Root source requirement.',
  'all_of',
  0,
  versions.source_document_id
from public.academic_structure_versions as versions
join public.academic_structures as structures
  on structures.id = versions.structure_id
where structures.code = 'TEST-DEGREE';

insert into public.requirement_groups (
  structure_version_id,
  catalogue_year_id,
  parent_group_id,
  code,
  name,
  source_text,
  operator,
  position,
  source_document_id
)
select
  roots.structure_version_id,
  roots.catalogue_year_id,
  roots.id,
  'CHILD',
  'Child',
  'Child source requirement.',
  'all_of',
  0,
  roots.source_document_id
from public.requirement_groups as roots
join public.academic_structure_versions as versions
  on versions.id = roots.structure_version_id
join public.academic_structures as structures
  on structures.id = versions.structure_id
where roots.code = 'ROOT'
  and structures.code = 'TEST-DEGREE';

insert into public.requirement_groups (
  structure_version_id,
  catalogue_year_id,
  parent_group_id,
  code,
  name,
  source_text,
  operator,
  position,
  source_document_id
)
select
  children.structure_version_id,
  children.catalogue_year_id,
  children.id,
  'GRANDCHILD',
  'Grandchild',
  'Grandchild source requirement.',
  'all_of',
  0,
  children.source_document_id
from public.requirement_groups as children
join public.academic_structure_versions as versions
  on versions.id = children.structure_version_id
join public.academic_structures as structures
  on structures.id = versions.structure_id
where children.code = 'CHILD'
  and structures.code = 'TEST-DEGREE';

insert into public.course_rules (
  course_version_id,
  catalogue_year_id,
  rule_kind,
  source_text,
  source_document_id
)
select
  versions.id,
  versions.catalogue_year_id,
  'prerequisite',
  'Tree fixture prerequisite',
  versions.source_document_id
from public.course_versions as versions
join public.courses as courses on courses.id = versions.course_id
where courses.code = 'TREE1000';

insert into public.course_rule_groups (course_rule_id, parent_group_id, operator, position)
select rules.id, null, 'all_of', 0
from public.course_rules as rules
where rules.source_text = 'Tree fixture prerequisite';

insert into public.course_rule_groups (course_rule_id, parent_group_id, operator, position)
select roots.course_rule_id, roots.id, 'all_of', 0
from public.course_rule_groups as roots
join public.course_rules as rules on rules.id = roots.course_rule_id
join public.course_versions as versions on versions.id = rules.course_version_id
join public.courses as courses on courses.id = versions.course_id
where roots.parent_group_id is null
  and courses.code = 'TREE1000';

insert into public.course_rule_groups (course_rule_id, parent_group_id, operator, position)
select children.course_rule_id, children.id, 'all_of', 0
from public.course_rule_groups as children
join public.course_rules as rules on rules.id = children.course_rule_id
join public.course_versions as versions on versions.id = rules.course_version_id
join public.courses as courses on courses.id = versions.course_id
where children.parent_group_id is not null
  and courses.code = 'TREE1000';

set constraints all immediate;

select extensions.ok(
  (
    select count(*) = 3
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'TEST-DEGREE'
  )
  and (
    select count(*) = 3
    from public.course_rule_groups as groups
    join public.course_rules as rules on rules.id = groups.course_rule_id
    join public.course_versions as versions on versions.id = rules.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    where courses.code = 'TREE1000'
  ),
  'valid connected requirement and course rule trees pass deferred validation'
);

select extensions.throws_ok(
  $$
    update public.requirement_groups
    set parent_group_id = (
      select groups.id
      from public.requirement_groups as groups
      join public.academic_structure_versions as versions
        on versions.id = groups.structure_version_id
      join public.academic_structures as structures
        on structures.id = versions.structure_id
      where groups.code = 'GRANDCHILD'
        and structures.code = 'TEST-DEGREE'
    )
    where id = (
      select groups.id
      from public.requirement_groups as groups
      join public.academic_structure_versions as versions
        on versions.id = groups.structure_version_id
      join public.academic_structures as structures
        on structures.id = versions.structure_id
      where groups.code = 'CHILD'
        and structures.code = 'TEST-DEGREE'
    )
  $$,
  '23514',
  null,
  'a disconnected cycle is rejected in a requirement tree'
);

select extensions.throws_ok(
  $$
    with fixture_groups as (
      select groups.id, groups.parent_group_id
      from public.course_rule_groups as groups
      join public.course_rules as rules on rules.id = groups.course_rule_id
      join public.course_versions as versions on versions.id = rules.course_version_id
      join public.courses as courses on courses.id = versions.course_id
      where courses.code = 'TREE1000'
    ),
    fixture_root as (
      select id from fixture_groups where parent_group_id is null
    ),
    fixture_child as (
      select groups.id
      from fixture_groups as groups
      join fixture_root as root on root.id = groups.parent_group_id
    ),
    fixture_grandchild as (
      select groups.id
      from fixture_groups as groups
      join fixture_child as child on child.id = groups.parent_group_id
    )
    update public.course_rule_groups
    set parent_group_id = (select id from fixture_grandchild)
    where id = (select id from fixture_child)
  $$,
  '23514',
  null,
  'a disconnected cycle is rejected in a course rule tree'
);

select extensions.throws_ok(
  $$
    insert into public.requirement_groups (
      structure_version_id,
      catalogue_year_id,
      code,
      name,
      source_text,
      operator,
      position,
      source_document_id
    )
    select
      versions.id,
      versions.catalogue_year_id,
      'SECOND-ROOT',
      'Second root',
      'Second root source requirement.',
      'all_of',
      1,
      versions.source_document_id
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'TEST-DEGREE'
  $$,
  '23505',
  null,
  'a second requirement root is rejected'
);

select extensions.throws_ok(
  $$
    delete from public.requirement_groups as groups
    using public.academic_structure_versions as versions,
      public.academic_structures as structures
    where groups.structure_version_id = versions.id
      and versions.structure_id = structures.id
      and groups.code = 'ROOT'
      and structures.code = 'TEST-DEGREE'
  $$,
  '23514',
  null,
  'deleting the only requirement root is rejected'
);

select extensions.throws_ok(
  $$
    insert into public.requirement_groups (
      structure_version_id,
      catalogue_year_id,
      parent_group_id,
      code,
      name,
      source_text,
      operator,
      minimum_count,
      minimum_units,
      position,
      source_document_id
    )
    select
      roots.structure_version_id,
      roots.catalogue_year_id,
      roots.id,
      'BAD-MINIMUM',
      'Bad minimum',
      'Invalid minimum source requirement.',
      'at_least',
      -1,
      6,
      9,
      roots.source_document_id
    from public.requirement_groups as roots
    join public.academic_structure_versions as versions
      on versions.id = roots.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where roots.code = 'ROOT'
      and structures.code = 'TEST-DEGREE'
  $$,
  '23514',
  null,
  'every populated requirement minimum must be positive'
);

select extensions.throws_ok(
  $$
    insert into public.requirement_conditions (
      structure_version_id,
      requirement_group_id,
      code,
      condition_kind,
      subject_code,
      minimum_course_level,
      minimum_units
    )
    select
      roots.structure_version_id,
      roots.id,
      'BAD-TYPED-CONDITION',
      'subject',
      'COMP',
      2000,
      6
    from public.requirement_groups as roots
    join public.academic_structure_versions as versions
      on versions.id = roots.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where roots.code = 'ROOT'
      and structures.code = 'TEST-DEGREE'
  $$,
  '23514',
  null,
  'a typed requirement condition rejects fields from another condition kind'
);

select extensions.throws_ok(
  $$
    insert into public.course_rule_conditions (
      course_rule_id,
      group_id,
      condition_kind,
      required_structure_id,
      free_text
    )
    select
      groups.course_rule_id,
      groups.id,
      'admission',
      structures.id,
      'Conflicting free text admission rule'
    from public.course_rule_groups as groups
    join public.course_rules as rules on rules.id = groups.course_rule_id
    join public.course_versions as versions on versions.id = rules.course_version_id
    join public.courses as courses on courses.id = versions.course_id
    cross join public.academic_structures as structures
    where groups.parent_group_id is null
      and courses.code = 'TREE1000'
      and structures.code = 'TEST-DEGREE'
  $$,
  '23514',
  null,
  'a typed course condition rejects two competing admission values'
);

select * from extensions.finish();

rollback;
