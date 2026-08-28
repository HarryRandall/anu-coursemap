begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(38);

select extensions.ok(
  has_table_privilege('anon', 'public.campus_map_layers', 'select')
  and not has_table_privilege(
    'anon',
    'public.campus_map_layers',
    'insert,update,delete'
  ),
  'anonymous users have read-only access to map layers'
);

select extensions.ok(
  has_table_privilege('anon', 'public.campus_map_campuses', 'select')
  and has_table_privilege('anon', 'public.campus_map_features', 'select')
  and not has_table_privilege(
    'anon',
    'public.campus_map_features',
    'insert,update,delete'
  ),
  'anonymous users have read-only access to campus vector features'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.campus_map_places', 'select')
  and has_table_privilege(
    'authenticated',
    'public.campus_map_places',
    'insert,update,delete'
  ),
  'authenticated users have grants that RLS narrows by permission'
);

select extensions.ok(
  has_table_privilege('anon', 'public.campus_indoor_maps', 'select')
  and not has_table_privilege(
    'anon',
    'public.campus_indoor_maps',
    'insert,update,delete'
  ),
  'anonymous users have read-only access to published indoor maps'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_indoor_maps
    where building_place_id = '85c7bba8-af82-525a-9689-1da96813c244'
      and status = 'draft'
      and document ->> 'version' = '1'
      and jsonb_array_length(document -> 'levels') = 3
  ),
  1,
  'the migration creates one three-level Copland editor draft'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_layers
    where status = 'published'
  ),
  13,
  'the migrations publish thirteen independently toggleable layers'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_layers
    where status = 'published'
      and layer_kind in ('map', 'hybrid')
      and cardinality(style_layer_patterns) > 0
  ),
  11,
  'eleven published layers dynamically control live map vectors'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_layers
    where status = 'published'
      and layer_kind = 'place'
      and cardinality(style_layer_patterns) = 0
  ),
  2,
  'two published layers filter place categories without changing the map style'
);

select extensions.ok(
  (
    select initial_zoom - min_zoom = 3
      and west = 149.09
      and south = -35.305
      and east = 149.15
      and north = -35.25
    from public.campus_map_campuses
    where slug = 'anu-acton'
  ),
  'the map allows three zoom-out steps inside a bounded ANU area'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_campuses
    where status = 'published'
  ),
  1,
  'the migration publishes one ANU campus boundary'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_places
    where status = 'published'
  ),
  282,
  'the migration publishes every canonical mapped ANU building footprint'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_places
    where status = 'published'
      and map_display_kind = 'building'
  ),
  282,
  'every published place selects its stored building footprint'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_places
    where status = 'published'
      and data_status = 'mapped'
      and source_provider = 'openstreetmap'
      and source_identifier is not null
      and source_url ~ '^https://www.openstreetmap.org/(way|relation)/'
      and source_license = 'OpenStreetMap contributors, ODbL 1.0'
  ),
  282,
  'every published building place retains OpenStreetMap provenance'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_places as places
    where places.status = 'published'
      and exists (
        select 1
        from public.campus_map_features as features
        where features.place_id = places.id
          and features.feature_kind = 'building'
          and features.status = 'published'
      )
  ),
  282,
  'every directory place links to a published building geometry'
);

select extensions.is(
  (
    select count(distinct source_identifier)::integer
    from public.campus_map_places
    where source_provider = 'openstreetmap'
  ),
  282,
  'mapped place source identities are unique'
);

select extensions.throws_ok(
  $$
    insert into public.campus_map_places (
      layer_id,
      slug,
      name,
      marker_label,
      address,
      longitude,
      latitude,
      map_display_kind
    )
    select
      id,
      'invalid-display-kind',
      'Invalid display kind',
      'ID',
      'Acton',
      149.12,
      -35.28,
      'pin'
    from public.campus_map_layers
    limit 1
  $$,
  '23514',
  null,
  'places reject unsupported map display kinds'
);

select extensions.throws_ok(
  $$
    insert into public.campus_map_places (
      layer_id,
      slug,
      name,
      marker_label,
      address,
      longitude,
      latitude,
      source_provider
    )
    select
      id,
      'partial-source-provenance',
      'Partial source provenance',
      'PS',
      'Acton',
      149.12,
      -35.28,
      'openstreetmap'
    from public.campus_map_layers
    limit 1
  $$,
  '23514',
  null,
  'places reject partially populated source provenance'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_features
    where status = 'published'
  ),
  285,
  'the migration publishes all building footprints and walking paths'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_features
    where feature_kind = 'building'
  ),
  282,
  'all canonical ANU building geometries are published'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_features
    where feature_kind = 'walking_path'
  ),
  3,
  'three published vectors are walking paths'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_features
    where feature_kind = 'building'
      and height_metres >= minimum_height_metres
      and minimum_height_metres >= 0
      and jsonb_typeof(source_properties) = 'object'
  ),
  282,
  'every building has valid extrusion measurements and source properties'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_features
    where feature_kind = 'building'
      and source_properties ->> 'building' in ('0', 'false', 'no')
  ),
  0,
  'false OpenStreetMap building tags are not published as buildings'
);

select extensions.lives_ok(
  $$
    insert into public.campus_map_features (
      campus_id,
      layer_id,
      slug,
      name,
      feature_kind,
      geometry_geojson,
      source_identifier,
      source_url,
      source_license
    )
    select
      campuses.id,
      layers.id,
      'valid-multipolygon-building',
      'Valid multipolygon building',
      'building',
      '{"type":"MultiPolygon","coordinates":[[[[149.12,-35.28],[149.121,-35.28],[149.121,-35.281],[149.12,-35.28]]]]}'::jsonb,
      'relation/0',
      'https://www.openstreetmap.org/relation/0',
      'OpenStreetMap contributors, ODbL 1.0'
    from public.campus_map_campuses as campuses
    join public.campus_map_layers as layers on layers.campus_id = campuses.id
    limit 1
  $$,
  'building vectors accept valid multipolygon geometry'
);

select extensions.throws_ok(
  $$
    insert into public.campus_map_places (
      layer_id,
      slug,
      name,
      marker_label,
      address,
      longitude,
      latitude
    )
    select
      id,
      'invalid-coordinate',
      'Invalid coordinate',
      'IC',
      'Acton',
      181,
      -35.28
    from public.campus_map_layers
    limit 1
  $$,
  '23514',
  null,
  'places reject invalid coordinates'
);

select extensions.throws_ok(
  $$
    insert into public.campus_map_features (
      campus_id,
      layer_id,
      slug,
      name,
      feature_kind,
      geometry_geojson,
      source_identifier,
      source_url,
      source_license
    )
    select
      campuses.id,
      layers.id,
      'invalid-building-geometry',
      'Invalid building geometry',
      'building',
      '{"type":"LineString","coordinates":[[149.12,-35.28],[149.13,-35.29]]}'::jsonb,
      'way/0',
      'https://www.openstreetmap.org/way/0',
      'OpenStreetMap contributors, ODbL 1.0'
    from public.campus_map_campuses as campuses
    join public.campus_map_layers as layers on layers.campus_id = campuses.id
    limit 1
  $$,
  '23514',
  null,
  'building vectors reject line geometry'
);

insert into public.campus_map_layers (
  id,
  campus_id,
  slug,
  name,
  colour,
  status,
  sort_order
)
values (
  '10000000-0000-4000-8000-000000000099',
  '00000000-0000-4000-8000-000000000001',
  'draft-test-layer',
  'Draft test layer',
  '#52525b',
  'draft',
  99
);

insert into public.campus_map_places (
  id,
  layer_id,
  slug,
  name,
  marker_label,
  address,
  longitude,
  latitude,
  status
)
values (
  '20000000-0000-4000-8000-000000000099',
  '10000000-0000-4000-8000-000000000099',
  'draft-test-place',
  'Draft test place',
  'DT',
  'Acton',
  149.12,
  -35.28,
  'draft'
);

set local role anon;

select extensions.is(
  (select count(*)::integer from public.campus_map_layers),
  13,
  'anonymous users only see published layers'
);

select extensions.is(
  (select count(*)::integer from public.campus_map_campuses),
  1,
  'anonymous users only see the published ANU campus'
);

select extensions.is(
  (select count(*)::integer from public.campus_map_places),
  282,
  'anonymous users only see places in published layers'
);

select extensions.is(
  (select count(*)::integer from public.campus_map_place_details),
  16,
  'anonymous users see details belonging to published places'
);

select extensions.is(
  (select count(*)::integer from public.campus_map_features),
  285,
  'anonymous users only see published ANU vector features'
);

select extensions.is(
  (select count(*)::integer from public.campus_indoor_maps),
  0,
  'anonymous users cannot see the Copland indoor draft'
);

select extensions.throws_ok(
  $$
    insert into public.campus_map_layers (campus_id, slug, name)
    values (
      '00000000-0000-4000-8000-000000000001',
      'anonymous-write',
      'Anonymous write'
    )
  $$,
  '42501',
  null,
  'anonymous users cannot create layers'
);

reset role;

select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.throws_ok(
  $$
    insert into public.campus_map_layers (campus_id, slug, name)
    values (
      '00000000-0000-4000-8000-000000000001',
      'student-write',
      'Student write'
    )
  $$,
  '42501',
  null,
  'an authenticated user without permission cannot create layers'
);

select extensions.throws_ok(
  $$
    insert into public.campus_indoor_maps (
      building_place_id,
      name,
      document
    )
    values (
      '20000000-0000-4000-8000-000000000001',
      'Unauthorised indoor map',
      '{"version":1,"viewBox":{},"levels":[],"spaces":[],"connectors":[],"routeNodes":[],"routeEdges":[]}'::jsonb
    )
  $$,
  '42501',
  null,
  'an authenticated user without permission cannot create indoor maps'
);

reset role;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '50000000-0000-4000-8000-000000000099',
  'authenticated',
  'authenticated',
  'campus-map-admin@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into private.user_roles (user_id, role_id, granted_by)
select
  '50000000-0000-4000-8000-000000000099',
  roles.id,
  '50000000-0000-4000-8000-000000000099'
from private.app_roles as roles
where roles.key = 'admin'
on conflict (user_id) do update
set
  role_id = excluded.role_id,
  granted_by = excluded.granted_by,
  granted_at = now();

select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000099","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000099',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select extensions.lives_ok(
  $$
    insert into public.campus_map_layers (campus_id, slug, name, status)
    values (
      '00000000-0000-4000-8000-000000000001',
      'admin-created-layer',
      'Admin-created layer',
      'draft'
    )
  $$,
  'an administrator with rooms.manage can create layers'
);

select extensions.is(
  public.current_user_has_permission('rooms.manage'),
  true,
  'the admin role receives the Room Finder management permission'
);

select extensions.lives_ok(
  $$
    update public.campus_indoor_maps
    set revision = revision + 1
    where building_place_id = '85c7bba8-af82-525a-9689-1da96813c244'
  $$,
  'an administrator with rooms.manage can update an indoor draft'
);

select extensions.is(
  (
    select revision
    from public.campus_indoor_maps
    where building_place_id = '85c7bba8-af82-525a-9689-1da96813c244'
  ),
  2,
  'indoor map revisions are persisted'
);

reset role;

select extensions.finish();

rollback;
