begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(14);

select extensions.is(
  (
    select count(*)
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code in ('BCOMP', 'SOFT-MAJ')
      and versions.catalogue_year_id = (
        select id from public.catalogue_years where year = 2026
      )
  ),
  2::bigint,
  'the 2026 BCOMP and SOFT-MAJ versions exist'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'BCOMP'
      and structures.kind = 'degree'
      and versions.name = 'Bachelor of Computing'
      and versions.units = 144
      and versions.duration_years = 3.0
      and versions.publication_status = 'draft'
      and versions.review_state = 'review'
  ),
  'BCOMP metadata is imported as draft and review'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_versions as versions
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'SOFT-MAJ'
      and structures.kind = 'major'
      and versions.name = 'Software Development'
      and versions.units = 48
      and versions.publication_status = 'draft'
      and versions.review_state = 'review'
  ),
  'SOFT-MAJ metadata is imported as draft and review'
);

select extensions.is(
  (
    select count(*)
    from public.catalogue_source_documents
    where entity_kind = 'structure'
      and external_key in ('BCOMP', 'SOFT-MAJ')
      and content_sha256 in (
        '6f7ba448f357810eb574187f1a48a1748a8223392b665bad81b05cb6bc27fcc4',
        '5502f3999911817064480589f7f57aa9c1cfb0fcb2ae5cded22a5abb4a9b87c1'
      )
  ),
  2::bigint,
  'both official structure snapshots retain their source hashes'
);

select extensions.ok(
  exists (
    select 1
    from public.catalogue_import_runs
    where scope = 'structure_codes:BCOMP,SOFT-MAJ'
      and status = 'succeeded'
      and checked_count = 2
      and added_count = 2
      and failed_count = 0
  ),
  'the structure seed has a successful provenance run'
);

select extensions.is(
  (
    select count(*)
    from public.catalogue_review_items as reviews
    join public.catalogue_import_items as items
      on items.id = reviews.import_item_id
    join public.catalogue_import_runs as runs
      on runs.id = items.run_id
    where runs.scope = 'structure_codes:BCOMP,SOFT-MAJ'
      and reviews.status = 'open'
  ),
  8::bigint,
  'unsupported structure rules are explicitly queued for review'
);

select extensions.is(
  (
    select count(*)
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'BCOMP'
      and groups.parent_group_id is null
  ),
  1::bigint,
  'BCOMP has exactly one requirement root'
);

select extensions.is(
  (
    select count(*)
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'SOFT-MAJ'
      and groups.parent_group_id is null
  ),
  1::bigint,
  'SOFT-MAJ has exactly one requirement root'
);

select extensions.is(
  (
    select count(*)
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'BCOMP'
  ),
  9::bigint,
  'BCOMP has the expected requirement groups'
);

select extensions.is(
  (
    select count(*)
    from public.requirement_conditions as conditions
    join public.academic_structure_versions as versions
      on versions.id = conditions.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'BCOMP'
  ),
  41::bigint,
  'BCOMP has the expected typed and review conditions'
);

select extensions.is(
  (
    select count(*)
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'SOFT-MAJ'
  ),
  3::bigint,
  'SOFT-MAJ has the expected requirement groups'
);

select extensions.is(
  (
    select count(*)
    from public.requirement_conditions as conditions
    join public.academic_structure_versions as versions
      on versions.id = conditions.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code = 'SOFT-MAJ'
  ),
  12::bigint,
  'SOFT-MAJ has the expected typed and review conditions'
);

select extensions.ok(
  exists (
    select 1
    from public.academic_structure_relationships as relationships
    join public.academic_structure_versions as parent_versions
      on parent_versions.id = relationships.parent_structure_version_id
    join public.academic_structures as parents
      on parents.id = parent_versions.structure_id
    join public.academic_structure_versions as child_versions
      on child_versions.id = relationships.child_structure_version_id
    join public.academic_structures as children
      on children.id = child_versions.structure_id
    where parents.code = 'BCOMP'
      and children.code = 'SOFT-MAJ'
      and relationships.relationship_kind = 'option'
  ),
  'SOFT-MAJ is an option under BCOMP'
);

select extensions.ok(
  not exists (
    select 1
    from public.requirement_groups as groups
    join public.academic_structure_versions as versions
      on versions.id = groups.structure_version_id
    join public.academic_structures as structures
      on structures.id = versions.structure_id
    where structures.code in ('BCOMP', 'SOFT-MAJ')
      and (
        btrim(groups.code) = ''
        or btrim(groups.source_text) = ''
        or exists (
          select 1
          from public.requirement_conditions as conditions
          where conditions.requirement_group_id = groups.id
            and (
              btrim(conditions.code) = ''
              or btrim(conditions.source_text) = ''
            )
        )
      )
  ),
  'every imported requirement node has a stable code and source text'
);

select * from extensions.finish();

rollback;
