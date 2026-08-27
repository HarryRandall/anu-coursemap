begin;

alter table public.campus_map_places
add column map_display_kind text not null default 'point',
add constraint campus_map_places_display_kind_check check (
  map_display_kind in ('building', 'point')
);

update public.campus_map_places
set map_display_kind = 'building'
where slug in (
  'ad-hope-building',
  'beryl-rawson-building',
  'chifley-library',
  'marie-reay-teaching-centre',
  'student-hub-kambri'
);

update public.campus_map_layers
set
  slug = 'points-of-interest',
  name = 'Points of interest',
  description = 'Shops, amenities, facilities and other map icons.',
  colour = '#db2777',
  style_layer_patterns = array['poi_*', '!poi_transit', 'airport'],
  sort_order = 80
where slug = 'labels-and-places';

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
    '10000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    'place-labels',
    'Place labels',
    'Campus, suburb, park and other area labels.',
    '#7c3aed',
    true,
    'published',
    90,
    'map',
    array['label_*']
  ),
  (
    '10000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    'road-and-water-names',
    'Road and water names',
    'Street names, route shields, rivers, creeks and lake names.',
    '#2563eb',
    true,
    'published',
    100,
    'map',
    array[
      'highway-name-*',
      'highway-shield-*',
      'road_one_way_arrow*',
      'road_shield_us',
      'waterway_line_label',
      'water_name_*'
    ]
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000001',
    'boundaries',
    'Boundaries',
    'Administrative and mapped area boundaries.',
    '#64748b',
    true,
    'published',
    110,
    'map',
    array['boundary_*']
  );

update public.campus_map_layers
set sort_order = 200
where slug = 'study-spaces';

update public.campus_map_layers
set sort_order = 210
where slug = 'student-services';

update public.campus_map_campuses
set
  west = 149.09,
  south = -35.305,
  east = 149.15,
  north = -35.25,
  min_zoom = 16
where slug = 'anu-acton';

comment on column public.campus_map_places.map_display_kind is
  'Selects whether a place resolves to a live building footprint or remains a non-building point.';

commit;
