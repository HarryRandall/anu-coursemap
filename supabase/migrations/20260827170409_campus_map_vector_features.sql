begin;

create table public.campus_map_campuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  boundary_geojson jsonb not null,
  west double precision not null,
  south double precision not null,
  east double precision not null,
  north double precision not null,
  initial_longitude double precision not null,
  initial_latitude double precision not null,
  initial_zoom double precision not null default 18,
  min_zoom double precision not null default 15,
  max_zoom double precision not null default 19,
  source_identifier text not null,
  source_url text not null,
  source_license text not null,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_map_campuses_slug_unique unique (slug),
  constraint campus_map_campuses_slug_format_check check (
    slug ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'
  ),
  constraint campus_map_campuses_name_not_blank_check check (
    btrim(name) <> ''
  ),
  constraint campus_map_campuses_boundary_geojson_check check (
    jsonb_typeof(boundary_geojson) = 'object'
    and boundary_geojson ->> 'type' = 'Polygon'
    and jsonb_typeof(boundary_geojson -> 'coordinates') = 'array'
  ),
  constraint campus_map_campuses_bounds_check check (
    west between -180 and 180
    and east between -180 and 180
    and south between -90 and 90
    and north between -90 and 90
    and west < east
    and south < north
  ),
  constraint campus_map_campuses_centre_check check (
    initial_longitude between west and east
    and initial_latitude between south and north
  ),
  constraint campus_map_campuses_zoom_check check (
    min_zoom >= 0
    and min_zoom <= initial_zoom
    and initial_zoom <= max_zoom
    and max_zoom <= 24
  ),
  constraint campus_map_campuses_source_identifier_not_blank_check check (
    btrim(source_identifier) <> ''
  ),
  constraint campus_map_campuses_source_url_check check (
    source_url ~ '^https://'
  ),
  constraint campus_map_campuses_source_license_not_blank_check check (
    btrim(source_license) <> ''
  ),
  constraint campus_map_campuses_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint campus_map_campuses_sort_order_check check (sort_order >= 0)
);

create trigger campus_map_campuses_set_updated_at
before update on public.campus_map_campuses
for each row execute function private.set_updated_at();

alter table public.campus_map_campuses enable row level security;

create policy campus_map_campuses_read_published
on public.campus_map_campuses
for select
to anon
using (status = 'published');

create policy campus_map_campuses_read_authenticated
on public.campus_map_campuses
for select
to authenticated
using (
  status = 'published'
  or (select private.has_permission('rooms.manage'))
);

create policy campus_map_campuses_admin_insert
on public.campus_map_campuses
for insert
to authenticated
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_campuses_admin_update
on public.campus_map_campuses
for update
to authenticated
using ((select private.has_permission('rooms.manage')))
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_campuses_admin_delete
on public.campus_map_campuses
for delete
to authenticated
using ((select private.has_permission('rooms.manage')));

insert into public.campus_map_campuses (
  id,
  slug,
  name,
  boundary_geojson,
  west,
  south,
  east,
  north,
  initial_longitude,
  initial_latitude,
  initial_zoom,
  min_zoom,
  max_zoom,
  source_identifier,
  source_url,
  source_license,
  status,
  sort_order
)
values (
  '00000000-0000-4000-8000-000000000001',
  'anu-acton',
  'ANU Acton campus',
  $json$
  {
    "type": "Polygon",
    "coordinates": [[
      [149.1098826, -35.2830191],
      [149.1103178, -35.2836835],
      [149.1108063, -35.2839965],
      [149.11512, -35.2863447],
      [149.1151302, -35.2879243],
      [149.1153657, -35.2881374],
      [149.1170365, -35.28829],
      [149.1169638, -35.2890607],
      [149.1180279, -35.2900054],
      [149.118583, -35.2896696],
      [149.1183578, -35.2879485],
      [149.1178261, -35.2866025],
      [149.1213223, -35.2854183],
      [149.1222195, -35.2845],
      [149.122075, -35.2840208],
      [149.1204952, -35.2839926],
      [149.1196713, -35.283616],
      [149.1213854, -35.2816597],
      [149.1222234, -35.2819466],
      [149.1230524, -35.2818804],
      [149.1238086, -35.2813622],
      [149.1250824, -35.2798978],
      [149.1237325, -35.2791221],
      [149.1257826, -35.2767166],
      [149.1263704, -35.276655],
      [149.1265367, -35.2756131],
      [149.124677, -35.275333],
      [149.1212697, -35.273358],
      [149.1173368, -35.2726359],
      [149.1100104, -35.280961],
      [149.1113411, -35.2817823],
      [149.1109395, -35.2821],
      [149.1104271, -35.2829808],
      [149.1098826, -35.2830191]
    ]]
  }
  $json$::jsonb,
  149.1098826,
  -35.2900054,
  149.1265367,
  -35.2726359,
  149.1208,
  -35.2779,
  18,
  15,
  19,
  'way/279984863',
  'https://www.openstreetmap.org/way/279984863',
  'OpenStreetMap contributors, ODbL 1.0',
  'published',
  10
);

alter table public.campus_map_layers
add column campus_id uuid;

update public.campus_map_layers
set campus_id = '00000000-0000-4000-8000-000000000001';

alter table public.campus_map_layers
alter column campus_id set not null,
add constraint campus_map_layers_campus_id_fkey
  foreign key (campus_id)
  references public.campus_map_campuses (id)
  on delete restrict;

create index campus_map_layers_campus_status_sort_idx
  on public.campus_map_layers (campus_id, status, sort_order, name);

insert into public.campus_map_layers (
  id,
  campus_id,
  slug,
  name,
  description,
  colour,
  is_visible_by_default,
  status,
  sort_order
)
values (
  '10000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  'walking-paths',
  'Walking paths',
  'Selected paths sourced from OpenStreetMap inside the ANU boundary.',
  '#7c3aed',
  true,
  'published',
  40
);

create table public.campus_map_features (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null,
  layer_id uuid not null,
  place_id uuid,
  slug text not null,
  name text not null,
  feature_kind text not null,
  geometry_geojson jsonb not null,
  source_identifier text not null,
  source_url text not null,
  source_license text not null,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_map_features_campus_id_fkey
    foreign key (campus_id)
    references public.campus_map_campuses (id)
    on delete cascade,
  constraint campus_map_features_layer_id_fkey
    foreign key (layer_id)
    references public.campus_map_layers (id)
    on delete restrict,
  constraint campus_map_features_place_id_fkey
    foreign key (place_id)
    references public.campus_map_places (id)
    on delete set null,
  constraint campus_map_features_campus_slug_unique unique (campus_id, slug),
  constraint campus_map_features_source_unique unique (
    source_license,
    source_identifier
  ),
  constraint campus_map_features_slug_format_check check (
    slug ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'
  ),
  constraint campus_map_features_name_not_blank_check check (
    btrim(name) <> ''
  ),
  constraint campus_map_features_kind_check check (
    feature_kind in ('building', 'walking_path')
  ),
  constraint campus_map_features_geometry_geojson_check check (
    jsonb_typeof(geometry_geojson) = 'object'
    and geometry_geojson ->> 'type' in ('Polygon', 'LineString')
    and jsonb_typeof(geometry_geojson -> 'coordinates') = 'array'
    and (
      (feature_kind = 'building' and geometry_geojson ->> 'type' = 'Polygon')
      or (
        feature_kind = 'walking_path'
        and geometry_geojson ->> 'type' = 'LineString'
      )
    )
  ),
  constraint campus_map_features_source_identifier_not_blank_check check (
    btrim(source_identifier) <> ''
  ),
  constraint campus_map_features_source_url_check check (
    source_url ~ '^https://'
  ),
  constraint campus_map_features_source_license_not_blank_check check (
    btrim(source_license) <> ''
  ),
  constraint campus_map_features_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint campus_map_features_sort_order_check check (sort_order >= 0)
);

create index campus_map_features_campus_layer_status_sort_idx
  on public.campus_map_features (
    campus_id,
    layer_id,
    status,
    sort_order,
    name
  );
create index campus_map_features_place_id_idx
  on public.campus_map_features (place_id);

create index campus_map_features_layer_id_idx
  on public.campus_map_features (layer_id);

create trigger campus_map_features_set_updated_at
before update on public.campus_map_features
for each row execute function private.set_updated_at();

alter table public.campus_map_features enable row level security;

create policy campus_map_features_read_published
on public.campus_map_features
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.campus_map_campuses as campuses
    where campuses.id = campus_map_features.campus_id
      and campuses.status = 'published'
  )
  and exists (
    select 1
    from public.campus_map_layers as layers
    where layers.id = campus_map_features.layer_id
      and layers.status = 'published'
  )
);

create policy campus_map_features_read_authenticated
on public.campus_map_features
for select
to authenticated
using (
  (
    status = 'published'
    and exists (
      select 1
      from public.campus_map_campuses as campuses
      where campuses.id = campus_map_features.campus_id
        and campuses.status = 'published'
    )
    and exists (
      select 1
      from public.campus_map_layers as layers
      where layers.id = campus_map_features.layer_id
        and layers.status = 'published'
    )
  )
  or (select private.has_permission('rooms.manage'))
);

create policy campus_map_features_admin_insert
on public.campus_map_features
for insert
to authenticated
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_features_admin_update
on public.campus_map_features
for update
to authenticated
using ((select private.has_permission('rooms.manage')))
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_features_admin_delete
on public.campus_map_features
for delete
to authenticated
using ((select private.has_permission('rooms.manage')));

revoke all on table
  public.campus_map_campuses,
  public.campus_map_features
from anon, authenticated;

grant select on table
  public.campus_map_campuses,
  public.campus_map_features
to anon, authenticated;

grant insert, update, delete on table
  public.campus_map_campuses,
  public.campus_map_features
to authenticated;

comment on table public.campus_map_campuses is
  'Published campus boundaries and camera constraints for Room Finder.';
comment on table public.campus_map_features is
  'ANU-scoped building polygons and walking lines with source provenance.';

insert into public.campus_map_features (
  id,
  campus_id,
  layer_id,
  place_id,
  slug,
  name,
  feature_kind,
  geometry_geojson,
  source_identifier,
  source_url,
  source_license,
  status,
  sort_order
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'marie-reay-building-outline',
    'Marie Reay Teaching Centre',
    'building',
    '{"type":"Polygon","coordinates":[[[149.1205593,-35.2777852],[149.1202794,-35.2776175],[149.120349,-35.27754],[149.1204849,-35.2773888],[149.1207648,-35.2775564],[149.1205871,-35.2777596],[149.1205593,-35.2777852]]]}'::jsonb,
    'way/674003253',
    'https://www.openstreetmap.org/way/674003253',
    'OpenStreetMap contributors, ODbL 1.0',
    'published',
    10
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'beryl-rawson-building-outline',
    'Beryl Rawson Building',
    'building',
    '{"type":"Polygon","coordinates":[[[149.1220769,-35.2792082],[149.1224247,-35.2788199],[149.1227081,-35.2789891],[149.1223603,-35.2793774],[149.1220769,-35.2792082]]]}'::jsonb,
    'way/50632679',
    'https://www.openstreetmap.org/way/50632679',
    'OpenStreetMap contributors, ODbL 1.0',
    'published',
    20
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000003',
    'ad-hope-building-outline',
    'A.D. Hope Building',
    'building',
    '{"type":"Polygon","coordinates":[[[149.1210117,-35.2780453],[149.1211797,-35.2778587],[149.1218406,-35.2782688],[149.1217544,-35.2783792],[149.1217478,-35.2783896],[149.1216853,-35.2784526],[149.1216577,-35.2784363],[149.1210117,-35.2780453]]]}'::jsonb,
    'way/50632683',
    'https://www.openstreetmap.org/way/50632683',
    'OpenStreetMap contributors, ODbL 1.0',
    'published',
    30
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000004',
    'chifley-building-outline',
    'JB Chifley Building',
    'building',
    '{"type":"Polygon","coordinates":[[[149.1199935,-35.2779323],[149.120202,-35.2776984],[149.1205289,-35.2778923],[149.1208518,-35.278084],[149.1207462,-35.2782062],[149.1206439,-35.2783198],[149.120525,-35.2782488],[149.1199935,-35.2779323]]]}'::jsonb,
    'way/5001918',
    'https://www.openstreetmap.org/way/5001918',
    'OpenStreetMap contributors, ODbL 1.0',
    'published',
    40
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    null,
    'university-avenue-path',
    'University Avenue',
    'walking_path',
    '{"type":"LineString","coordinates":[[149.1237932,-35.2789686],[149.1231287,-35.2785721],[149.1221918,-35.2780132],[149.121553,-35.2776321],[149.1214493,-35.2775704],[149.1214081,-35.2775458],[149.1213388,-35.2775007],[149.1210602,-35.2773414],[149.1210405,-35.2773299],[149.120853,-35.27722],[149.1208339,-35.2772089],[149.1205766,-35.2770637]]}'::jsonb,
    'way/672266049',
    'https://www.openstreetmap.org/way/672266049',
    'OpenStreetMap contributors, ODbL 1.0',
    'published',
    10
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    null,
    'denis-winston-walk-path',
    'Denis Winston Walk',
    'walking_path',
    '{"type":"LineString","coordinates":[[149.1191383,-35.2777672],[149.1194259,-35.2779271],[149.1198009,-35.2781643],[149.1198215,-35.2781766],[149.1205472,-35.2786115]]}'::jsonb,
    'way/29108598',
    'https://www.openstreetmap.org/way/29108598',
    'OpenStreetMap contributors, ODbL 1.0',
    'published',
    20
  ),
  (
    '40000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    null,
    'joplin-lane-path',
    'Joplin Lane',
    'walking_path',
    '{"type":"LineString","coordinates":[[149.1202345,-35.2776696],[149.1208663,-35.2780608],[149.1209209,-35.2780933]]}'::jsonb,
    'way/673020981',
    'https://www.openstreetmap.org/way/673020981',
    'OpenStreetMap contributors, ODbL 1.0',
    'published',
    30
  );

commit;
