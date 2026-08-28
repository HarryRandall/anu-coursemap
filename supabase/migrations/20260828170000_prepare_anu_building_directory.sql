begin;

alter table public.campus_map_places
add column search_terms text[] not null default '{}',
add column source_provider text,
add column source_identifier text,
add column source_url text,
add column source_license text,
add column source_version bigint,
add column source_updated_at timestamptz;

alter table public.campus_map_places
drop constraint campus_map_places_data_status_check,
add constraint campus_map_places_data_status_check check (
  data_status in ('example', 'mapped', 'verified')
),
add constraint campus_map_places_source_check check (
  (
    source_provider is null
    and source_identifier is null
    and source_url is null
    and source_license is null
    and source_version is null
    and source_updated_at is null
  )
  or (
    source_provider is not null
    and source_identifier is not null
    and source_url is not null
    and source_license is not null
    and btrim(source_provider) <> ''
    and btrim(source_identifier) <> ''
    and source_url ~ '^https://'
    and btrim(source_license) <> ''
    and (source_version is null or source_version > 0)
  )
);

create unique index campus_map_places_source_unique
on public.campus_map_places (source_provider, source_identifier)
where source_provider is not null and source_identifier is not null;

alter table public.campus_map_features
add column height_metres double precision not null default 5,
add column minimum_height_metres double precision not null default 0,
add column source_properties jsonb not null default '{}';

alter table public.campus_map_features
drop constraint campus_map_features_geometry_geojson_check,
add constraint campus_map_features_geometry_geojson_check check (
  jsonb_typeof(geometry_geojson) = 'object'
  and geometry_geojson ->> 'type' in (
    'Polygon',
    'MultiPolygon',
    'LineString'
  )
  and jsonb_typeof(geometry_geojson -> 'coordinates') = 'array'
  and (
    (
      feature_kind = 'building'
      and geometry_geojson ->> 'type' in ('Polygon', 'MultiPolygon')
    )
    or (
      feature_kind = 'walking_path'
      and geometry_geojson ->> 'type' = 'LineString'
    )
  )
),
add constraint campus_map_features_height_check check (
  height_metres >= 0
  and minimum_height_metres >= 0
  and minimum_height_metres <= height_metres
),
add constraint campus_map_features_source_properties_check check (
  jsonb_typeof(source_properties) = 'object'
);

update public.campus_map_layers
set
  description = 'All mapped ANU Acton building footprints. Surrounding buildings remain flat for context.',
  style_layer_patterns = array[
    'building',
    'coursemap-anu-buildings-3d'
  ]
where slug = 'buildings';

drop policy campus_map_layers_read_published on public.campus_map_layers;
create policy campus_map_layers_read_published
on public.campus_map_layers
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.campus_map_campuses as campuses
    where campuses.id = campus_map_layers.campus_id
      and campuses.status = 'published'
  )
);

drop policy campus_map_layers_read_authenticated on public.campus_map_layers;
create policy campus_map_layers_read_authenticated
on public.campus_map_layers
for select
to authenticated
using (
  (
    status = 'published'
    and exists (
      select 1
      from public.campus_map_campuses as campuses
      where campuses.id = campus_map_layers.campus_id
        and campuses.status = 'published'
    )
  )
  or (select private.has_permission('rooms.manage'))
);

drop policy campus_map_places_read_published on public.campus_map_places;
create policy campus_map_places_read_published
on public.campus_map_places
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.campus_map_layers as layers
    join public.campus_map_campuses as campuses
      on campuses.id = layers.campus_id
    where layers.id = campus_map_places.layer_id
      and layers.status = 'published'
      and campuses.status = 'published'
  )
);

drop policy campus_map_places_read_authenticated on public.campus_map_places;
create policy campus_map_places_read_authenticated
on public.campus_map_places
for select
to authenticated
using (
  (
    status = 'published'
    and exists (
      select 1
      from public.campus_map_layers as layers
      join public.campus_map_campuses as campuses
        on campuses.id = layers.campus_id
      where layers.id = campus_map_places.layer_id
        and layers.status = 'published'
        and campuses.status = 'published'
    )
  )
  or (select private.has_permission('rooms.manage'))
);

drop policy campus_map_place_details_read_published
on public.campus_map_place_details;
create policy campus_map_place_details_read_published
on public.campus_map_place_details
for select
to anon
using (
  exists (
    select 1
    from public.campus_map_places as places
    join public.campus_map_layers as layers on layers.id = places.layer_id
    join public.campus_map_campuses as campuses
      on campuses.id = layers.campus_id
    where places.id = campus_map_place_details.place_id
      and places.status = 'published'
      and layers.status = 'published'
      and campuses.status = 'published'
  )
);

drop policy campus_map_place_details_read_authenticated
on public.campus_map_place_details;
create policy campus_map_place_details_read_authenticated
on public.campus_map_place_details
for select
to authenticated
using (
  (
    exists (
      select 1
      from public.campus_map_places as places
      join public.campus_map_layers as layers on layers.id = places.layer_id
      join public.campus_map_campuses as campuses
        on campuses.id = layers.campus_id
      where places.id = campus_map_place_details.place_id
        and places.status = 'published'
        and layers.status = 'published'
        and campuses.status = 'published'
    )
  )
  or (select private.has_permission('rooms.manage'))
);

comment on column public.campus_map_places.search_terms is
  'Normalised aliases and source identifiers included in Room Finder search.';
comment on column public.campus_map_places.source_identifier is
  'Stable identifier from the external source used to update mapped places.';
comment on column public.campus_map_features.height_metres is
  'Safe display height for the ANU-only building extrusion.';
comment on column public.campus_map_features.source_properties is
  'Selected source tags retained for provenance and future map refinements.';

commit;
