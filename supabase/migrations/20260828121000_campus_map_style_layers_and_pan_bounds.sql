begin;

alter table public.campus_map_layers
add column layer_kind text not null default 'place',
add column style_layer_patterns text[] not null default '{}'::text[],
add constraint campus_map_layers_kind_check check (
  layer_kind in ('map', 'place', 'hybrid')
),
add constraint campus_map_layers_style_patterns_check check (
  array_position(style_layer_patterns, null) is null
  and array_position(style_layer_patterns, '') is null
);

update public.campus_map_layers
set
  layer_kind = 'hybrid',
  style_layer_patterns = array['building', 'building-3d'],
  description = 'All OpenStreetMap building footprints and available 3D heights.'
where slug = 'buildings';

update public.campus_map_layers
set
  layer_kind = 'map',
  style_layer_patterns = array[
    'road_path_pedestrian',
    'bridge_path_pedestrian*',
    'tunnel_path_pedestrian',
    'highway-name-path'
  ],
  description = 'All mapped footpaths and pedestrian bridges in the current view.',
  sort_order = 30
where slug = 'walking-paths';

update public.campus_map_layers
set sort_order = 100
where slug = 'study-spaces';

update public.campus_map_layers
set sort_order = 110
where slug = 'student-services';

insert into public.campus_map_layers (
  id,
  campus_id,
  slug,
  name,
  description,
  colour,
  is_visible_by_default,
  status,
  sort_order,
  layer_kind,
  style_layer_patterns
)
values
  (
    '10000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    'roads',
    'Roads',
    'Road surfaces, bridges and tunnels from the live vector style.',
    '#f97316',
    true,
    'published',
    20,
    'map',
    array[
      'road_*',
      'bridge_*',
      'tunnel_*',
      '!road_path_pedestrian',
      '!bridge_path_pedestrian*',
      '!tunnel_path_pedestrian',
      '!road_major_rail*',
      '!road_transit_rail*',
      '!bridge_major_rail*',
      '!bridge_transit_rail*',
      '!tunnel_major_rail*',
      '!tunnel_transit_rail*',
      '!road_one_way_arrow*'
    ]
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    'rail-and-transit',
    'Rail and transit',
    'Rail lines, light rail and public transport markers.',
    '#71717a',
    true,
    'published',
    40,
    'map',
    array[
      'road_major_rail*',
      'road_transit_rail*',
      'bridge_major_rail*',
      'bridge_transit_rail*',
      'tunnel_major_rail*',
      'tunnel_transit_rail*',
      'poi_transit'
    ]
  ),
  (
    '10000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000001',
    'landscape',
    'Parks and landscape',
    'Parks, woodland, grass, sports grounds and other land cover.',
    '#16a34a',
    true,
    'published',
    50,
    'map',
    array['natural_earth', 'park*', 'landcover_*', 'landuse_*', 'aeroway_*']
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000001',
    'water',
    'Water',
    'Lake, river, creek and waterway vectors.',
    '#0284c7',
    true,
    'published',
    60,
    'map',
    array['water', 'waterway_tunnel', 'waterway_river', 'waterway_other']
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000001',
    'terrain',
    'Terrain',
    'Open elevation hillshade and three-dimensional terrain.',
    '#a16207',
    true,
    'published',
    70,
    'map',
    array['coursemap-terrain-hillshade']
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    'labels-and-places',
    'Labels and places',
    'Road names, place labels, points of interest and map boundaries.',
    '#7c3aed',
    true,
    'published',
    80,
    'map',
    array[
      'poi_*',
      'label_*',
      'airport',
      'boundary_*',
      'highway-name-*',
      'highway-shield-*',
      'road_one_way_arrow*',
      'road_shield_us',
      'waterway_line_label',
      'water_name_*'
    ]
  );

update public.campus_map_campuses
set
  west = 149.075,
  south = -35.325,
  east = 149.175,
  north = -35.235
where slug = 'anu-acton';

comment on column public.campus_map_layers.layer_kind is
  'Controls whether a layer filters map vectors, place markers or both.';
comment on column public.campus_map_layers.style_layer_patterns is
  'Ordered MapLibre style layer globs. Prefix a glob with ! to exclude it from the group.';

commit;
