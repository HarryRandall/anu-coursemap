begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(25);

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
    select initial_zoom - min_zoom = 2
      and west = 149.09
      and south = -35.305
      and east = 149.15
      and north = -35.25
    from public.campus_map_campuses
    where slug = 'anu-acton'
  ),
  'the map allows two zoom-out steps inside a bounded ANU area'
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
  5,
  'the migration supplies five example places through database rows'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_places
    where status = 'published'
      and map_display_kind = 'building'
  ),
  5,
  'all five places select their live vector building footprint'
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

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_features
    where status = 'published'
  ),
  7,
  'the migration publishes seven OSM-sourced campus vectors'
);

select extensions.is(
  (
    select count(*)::integer
    from public.campus_map_features
    where feature_kind = 'building'
  ),
  4,
  'four published vectors are building polygons'
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
  5,
  'anonymous users only see places in published layers'
);

select extensions.is(
  (select count(*)::integer from public.campus_map_place_details),
  16,
  'anonymous users see details belonging to published places'
);

select extensions.is(
  (select count(*)::integer from public.campus_map_features),
  7,
  'anonymous users only see published ANU vector features'
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

reset role;

select extensions.finish();

rollback;
