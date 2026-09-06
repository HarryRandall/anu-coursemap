-- Repair hosted installations which still reject version 2 maps.
-- Preserve all existing documents and revisions, including edited fixtures.
alter table public.campus_indoor_maps
  drop constraint campus_indoor_maps_document_check;

alter table public.campus_indoor_maps
  add constraint campus_indoor_maps_document_check check (
    jsonb_typeof(document) = 'object'
    and document ->> 'version' in ('1', '2')
    and jsonb_typeof(document -> 'viewBox') = 'object'
    and jsonb_typeof(document -> 'levels') = 'array'
    and jsonb_typeof(document -> 'spaces') = 'array'
    and jsonb_typeof(document -> 'connectors') = 'array'
    and jsonb_typeof(document -> 'routeNodes') = 'array'
    and jsonb_typeof(document -> 'routeEdges') = 'array'
    and (
      document -> 'walls' is null
      or jsonb_typeof(document -> 'walls') = 'array'
    )
  );

comment on column public.campus_indoor_maps.document is
  'Coursemap indoor document (version 2): levels, walls with openings, spaces, connectors and an explicit route graph in local units at ten units per metre.';

