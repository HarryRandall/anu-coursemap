begin;

update private.app_permissions
set
  name = 'Manage Room Finder',
  description = 'Create, edit and publish campus maps, floor plans and indoor routes.'
where key = 'rooms.manage';

create table public.campus_indoor_maps (
  id uuid primary key default gen_random_uuid(),
  building_place_id uuid not null,
  name text not null,
  document jsonb not null,
  status text not null default 'draft',
  revision integer not null default 1,
  source_provider text,
  source_url text,
  source_license text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_indoor_maps_building_place_id_fkey
    foreign key (building_place_id)
    references public.campus_map_places (id)
    on delete cascade,
  constraint campus_indoor_maps_building_unique unique (building_place_id),
  constraint campus_indoor_maps_name_check check (
    btrim(name) <> '' and char_length(btrim(name)) <= 200
  ),
  constraint campus_indoor_maps_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint campus_indoor_maps_revision_check check (revision > 0),
  constraint campus_indoor_maps_document_check check (
    jsonb_typeof(document) = 'object'
    and document ->> 'version' = '1'
    and jsonb_typeof(document -> 'viewBox') = 'object'
    and jsonb_typeof(document -> 'levels') = 'array'
    and jsonb_typeof(document -> 'spaces') = 'array'
    and jsonb_typeof(document -> 'connectors') = 'array'
    and jsonb_typeof(document -> 'routeNodes') = 'array'
    and jsonb_typeof(document -> 'routeEdges') = 'array'
  ),
  constraint campus_indoor_maps_source_provider_not_blank_check check (
    source_provider is null or btrim(source_provider) <> ''
  ),
  constraint campus_indoor_maps_source_url_check check (
    source_url is null or source_url ~ '^https://'
  ),
  constraint campus_indoor_maps_source_license_not_blank_check check (
    source_license is null or btrim(source_license) <> ''
  ),
  constraint campus_indoor_maps_published_at_check check (
    status <> 'published' or published_at is not null
  )
);

create index campus_indoor_maps_status_building_idx
  on public.campus_indoor_maps (status, building_place_id);

create trigger campus_indoor_maps_set_updated_at
before update on public.campus_indoor_maps
for each row execute function private.set_updated_at();

alter table public.campus_indoor_maps enable row level security;

create policy campus_indoor_maps_read_published
on public.campus_indoor_maps
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.campus_map_places as places
    join public.campus_map_layers as layers on layers.id = places.layer_id
    where places.id = campus_indoor_maps.building_place_id
      and places.status = 'published'
      and layers.status = 'published'
  )
);

create policy campus_indoor_maps_read_authenticated
on public.campus_indoor_maps
for select
to authenticated
using (
  (
    status = 'published'
    and exists (
      select 1
      from public.campus_map_places as places
      join public.campus_map_layers as layers on layers.id = places.layer_id
      where places.id = campus_indoor_maps.building_place_id
        and places.status = 'published'
        and layers.status = 'published'
    )
  )
  or (select private.has_permission('rooms.manage'))
);

create policy campus_indoor_maps_admin_insert
on public.campus_indoor_maps
for insert
to authenticated
with check ((select private.has_permission('rooms.manage')));

create policy campus_indoor_maps_admin_update
on public.campus_indoor_maps
for update
to authenticated
using ((select private.has_permission('rooms.manage')))
with check ((select private.has_permission('rooms.manage')));

create policy campus_indoor_maps_admin_delete
on public.campus_indoor_maps
for delete
to authenticated
using ((select private.has_permission('rooms.manage')));

revoke all on table public.campus_indoor_maps from anon, authenticated;
grant select on table public.campus_indoor_maps to anon, authenticated;
grant insert, update, delete on table public.campus_indoor_maps to authenticated;

comment on table public.campus_indoor_maps is
  'Versioned indoor floor-plan, connector and routing documents for Room Finder buildings.';
comment on column public.campus_indoor_maps.document is
  'Coursemap indoor document using local SVG coordinates and GeoJSON-like features.';

insert into public.campus_indoor_maps (
  id,
  building_place_id,
  name,
  document,
  status,
  source_provider,
  source_license
)
select
  '70000000-0000-4000-8000-000000000001',
  places.id,
  'Copland Building indoor map',
  $document$
  {
    "version": 1,
    "viewBox": { "width": 1000, "height": 700 },
    "levels": [
      {
        "id": "71000000-0000-4000-8000-000000000001",
        "number": 0,
        "ref": "G",
        "name": "Ground floor",
        "elevationMetres": 0,
        "heightMetres": 3.6,
        "outline": [
          { "x": 70, "y": 90 },
          { "x": 820, "y": 90 },
          { "x": 930, "y": 210 },
          { "x": 775, "y": 610 },
          { "x": 80, "y": 610 }
        ]
      },
      {
        "id": "71000000-0000-4000-8000-000000000002",
        "number": 1,
        "ref": "1",
        "name": "Level 1",
        "elevationMetres": 3.6,
        "heightMetres": 3.6,
        "outline": [
          { "x": 70, "y": 90 },
          { "x": 820, "y": 90 },
          { "x": 930, "y": 210 },
          { "x": 775, "y": 610 },
          { "x": 80, "y": 610 }
        ]
      },
      {
        "id": "71000000-0000-4000-8000-000000000003",
        "number": 2,
        "ref": "2",
        "name": "Level 2",
        "elevationMetres": 7.2,
        "heightMetres": 3.6,
        "outline": [
          { "x": 70, "y": 90 },
          { "x": 820, "y": 90 },
          { "x": 930, "y": 210 },
          { "x": 775, "y": 610 },
          { "x": 80, "y": 610 }
        ]
      }
    ],
    "spaces": [
      {
        "id": "72000000-0000-4000-8000-000000000001",
        "levelId": "71000000-0000-4000-8000-000000000001",
        "kind": "room",
        "ref": "G01",
        "name": "Example room G01",
        "searchable": true,
        "geometry": {
          "type": "rectangle",
          "x": 120,
          "y": 145,
          "width": 255,
          "height": 165,
          "cornerRadius": 12
        }
      },
      {
        "id": "72000000-0000-4000-8000-000000000002",
        "levelId": "71000000-0000-4000-8000-000000000001",
        "kind": "room",
        "ref": "G02",
        "name": "Example round room G02",
        "searchable": true,
        "geometry": {
          "type": "ellipse",
          "cx": 655,
          "cy": 245,
          "rx": 125,
          "ry": 95
        }
      },
      {
        "id": "72000000-0000-4000-8000-000000000003",
        "levelId": "71000000-0000-4000-8000-000000000001",
        "kind": "corridor",
        "ref": "",
        "name": "Ground floor corridor",
        "searchable": false,
        "geometry": {
          "type": "polygon",
          "points": [
            { "x": 105, "y": 370 },
            { "x": 825, "y": 370 },
            { "x": 790, "y": 465 },
            { "x": 105, "y": 465 }
          ]
        }
      },
      {
        "id": "72000000-0000-4000-8000-000000000004",
        "levelId": "71000000-0000-4000-8000-000000000002",
        "kind": "room",
        "ref": "1.01",
        "name": "Example room 1.01",
        "searchable": true,
        "geometry": {
          "type": "rectangle",
          "x": 125,
          "y": 145,
          "width": 310,
          "height": 180,
          "cornerRadius": 10
        }
      },
      {
        "id": "72000000-0000-4000-8000-000000000005",
        "levelId": "71000000-0000-4000-8000-000000000003",
        "kind": "room",
        "ref": "2.01",
        "name": "Example room 2.01",
        "searchable": true,
        "geometry": {
          "type": "polygon",
          "points": [
            { "x": 130, "y": 145 },
            { "x": 465, "y": 145 },
            { "x": 520, "y": 255 },
            { "x": 430, "y": 345 },
            { "x": 130, "y": 310 }
          ]
        }
      }
    ],
    "connectors": [
      {
        "id": "73000000-0000-4000-8000-000000000001",
        "kind": "stairs",
        "name": "Main stairs",
        "levelIds": [
          "71000000-0000-4000-8000-000000000001",
          "71000000-0000-4000-8000-000000000002",
          "71000000-0000-4000-8000-000000000003"
        ],
        "position": { "x": 535, "y": 420 },
        "accessibility": "inaccessible"
      },
      {
        "id": "73000000-0000-4000-8000-000000000002",
        "kind": "lift",
        "name": "Main lift",
        "levelIds": [
          "71000000-0000-4000-8000-000000000001",
          "71000000-0000-4000-8000-000000000002",
          "71000000-0000-4000-8000-000000000003"
        ],
        "position": { "x": 655, "y": 420 },
        "accessibility": "unknown"
      }
    ],
    "routeNodes": [],
    "routeEdges": []
  }
  $document$::jsonb,
  'draft',
  'Coursemap editor example',
  'Example data only'
from public.campus_map_places as places
where places.id = '85c7bba8-af82-525a-9689-1da96813c244'
on conflict (building_place_id) do nothing;

commit;
