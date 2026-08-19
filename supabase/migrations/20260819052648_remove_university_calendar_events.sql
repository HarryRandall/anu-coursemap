-- Revert the university calendar feature while preserving immutable migration
-- history. Calendar import runs own their import items and review items through
-- cascading foreign keys, so remove that provenance before its source records.
drop table public.university_calendar_events;

delete from public.catalogue_import_runs as runs
using public.catalogue_sources as sources
where runs.source_id = sources.id
  and sources.kind = 'anu_university_calendar';

delete from public.catalogue_source_documents as documents
using public.catalogue_sources as sources
where documents.source_id = sources.id
  and sources.kind = 'anu_university_calendar';

delete from public.catalogue_sources
where kind = 'anu_university_calendar';

alter table public.catalogue_source_documents
  drop constraint catalogue_source_documents_entity_kind_check;

alter table public.catalogue_source_documents
  add constraint catalogue_source_documents_entity_kind_check check (
    entity_kind in ('course', 'structure', 'offering')
  );
