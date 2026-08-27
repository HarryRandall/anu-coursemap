begin;

insert into private.app_permissions (
  key,
  name,
  description,
  category
)
values (
  'rooms.manage',
  'Manage campus map',
  'Create and update Room Finder layers, places and details.',
  'rooms'
);

insert into private.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from private.app_roles as roles
cross join private.app_permissions as permissions
where roles.key = 'admin'
  and permissions.key = 'rooms.manage'
on conflict (role_id, permission_id) do nothing;

create table public.campus_map_layers (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  colour text not null default '#52525b',
  is_visible_by_default boolean not null default true,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_map_layers_slug_unique unique (slug),
  constraint campus_map_layers_slug_format_check check (
    slug ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'
  ),
  constraint campus_map_layers_name_not_blank_check check (
    btrim(name) <> ''
  ),
  constraint campus_map_layers_description_not_blank_check check (
    description is null or btrim(description) <> ''
  ),
  constraint campus_map_layers_colour_format_check check (
    colour ~ '^#[0-9a-fA-F]{6}$'
  ),
  constraint campus_map_layers_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint campus_map_layers_sort_order_check check (sort_order >= 0)
);

create table public.campus_map_places (
  id uuid primary key default gen_random_uuid(),
  layer_id uuid not null,
  slug text not null,
  name text not null,
  marker_label text not null,
  address text not null,
  longitude double precision not null,
  latitude double precision not null,
  official_url text,
  data_status text not null default 'example',
  is_routable boolean not null default true,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_map_places_layer_id_fkey
    foreign key (layer_id)
    references public.campus_map_layers (id)
    on delete restrict,
  constraint campus_map_places_slug_unique unique (slug),
  constraint campus_map_places_slug_format_check check (
    slug ~ '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$'
  ),
  constraint campus_map_places_name_not_blank_check check (
    btrim(name) <> ''
  ),
  constraint campus_map_places_marker_label_check check (
    btrim(marker_label) <> '' and char_length(marker_label) <= 4
  ),
  constraint campus_map_places_address_not_blank_check check (
    btrim(address) <> ''
  ),
  constraint campus_map_places_longitude_check check (
    longitude between -180 and 180
  ),
  constraint campus_map_places_latitude_check check (
    latitude between -90 and 90
  ),
  constraint campus_map_places_official_url_check check (
    official_url is null or official_url ~ '^https://'
  ),
  constraint campus_map_places_data_status_check check (
    data_status in ('example', 'verified')
  ),
  constraint campus_map_places_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint campus_map_places_sort_order_check check (sort_order >= 0)
);

create table public.campus_map_place_details (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null,
  kind text not null default 'place',
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campus_map_place_details_place_id_fkey
    foreign key (place_id)
    references public.campus_map_places (id)
    on delete cascade,
  constraint campus_map_place_details_place_label_unique unique (
    place_id,
    label
  ),
  constraint campus_map_place_details_kind_format_check check (
    kind ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint campus_map_place_details_label_not_blank_check check (
    btrim(label) <> ''
  ),
  constraint campus_map_place_details_sort_order_check check (sort_order >= 0)
);

create index campus_map_layers_status_sort_idx
  on public.campus_map_layers (status, sort_order, name);
create index campus_map_places_layer_status_sort_idx
  on public.campus_map_places (layer_id, status, sort_order, name);
create index campus_map_place_details_place_sort_idx
  on public.campus_map_place_details (place_id, sort_order, label);

create trigger campus_map_layers_set_updated_at
before update on public.campus_map_layers
for each row execute function private.set_updated_at();

create trigger campus_map_places_set_updated_at
before update on public.campus_map_places
for each row execute function private.set_updated_at();

create trigger campus_map_place_details_set_updated_at
before update on public.campus_map_place_details
for each row execute function private.set_updated_at();

alter table public.campus_map_layers enable row level security;
alter table public.campus_map_places enable row level security;
alter table public.campus_map_place_details enable row level security;

create policy campus_map_layers_read_published
on public.campus_map_layers
for select
to anon
using (status = 'published');

create policy campus_map_layers_read_authenticated
on public.campus_map_layers
for select
to authenticated
using (
  status = 'published'
  or (select private.has_permission('rooms.manage'))
);

create policy campus_map_layers_admin_insert
on public.campus_map_layers
for insert
to authenticated
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_layers_admin_update
on public.campus_map_layers
for update
to authenticated
using ((select private.has_permission('rooms.manage')))
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_layers_admin_delete
on public.campus_map_layers
for delete
to authenticated
using ((select private.has_permission('rooms.manage')));

create policy campus_map_places_read_published
on public.campus_map_places
for select
to anon
using (
  status = 'published'
  and exists (
    select 1
    from public.campus_map_layers as layers
    where layers.id = campus_map_places.layer_id
      and layers.status = 'published'
  )
);

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
      where layers.id = campus_map_places.layer_id
        and layers.status = 'published'
    )
  )
  or (select private.has_permission('rooms.manage'))
);

create policy campus_map_places_admin_insert
on public.campus_map_places
for insert
to authenticated
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_places_admin_update
on public.campus_map_places
for update
to authenticated
using ((select private.has_permission('rooms.manage')))
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_places_admin_delete
on public.campus_map_places
for delete
to authenticated
using ((select private.has_permission('rooms.manage')));

create policy campus_map_place_details_read_published
on public.campus_map_place_details
for select
to anon
using (
  exists (
    select 1
    from public.campus_map_places as places
    join public.campus_map_layers as layers on layers.id = places.layer_id
    where places.id = campus_map_place_details.place_id
      and places.status = 'published'
      and layers.status = 'published'
  )
);

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
      where places.id = campus_map_place_details.place_id
        and places.status = 'published'
        and layers.status = 'published'
    )
  )
  or (select private.has_permission('rooms.manage'))
);

create policy campus_map_place_details_admin_insert
on public.campus_map_place_details
for insert
to authenticated
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_place_details_admin_update
on public.campus_map_place_details
for update
to authenticated
using ((select private.has_permission('rooms.manage')))
with check ((select private.has_permission('rooms.manage')));

create policy campus_map_place_details_admin_delete
on public.campus_map_place_details
for delete
to authenticated
using ((select private.has_permission('rooms.manage')));

revoke all on table
  public.campus_map_layers,
  public.campus_map_places,
  public.campus_map_place_details
from anon, authenticated;

grant select on table
  public.campus_map_layers,
  public.campus_map_places,
  public.campus_map_place_details
to anon, authenticated;

grant insert, update, delete on table
  public.campus_map_layers,
  public.campus_map_places,
  public.campus_map_place_details
to authenticated;

comment on table public.campus_map_layers is
  'Published Room Finder layers with database-managed display settings.';
comment on table public.campus_map_places is
  'Searchable and routable campus points loaded dynamically by Room Finder.';
comment on table public.campus_map_place_details is
  'Ordered room, facility and service details belonging to a campus place.';

insert into public.campus_map_layers (
  id,
  slug,
  name,
  description,
  colour,
  is_visible_by_default,
  status,
  sort_order
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'buildings',
    'Buildings',
    'Example ANU buildings and teaching spaces.',
    '#52525b',
    true,
    'published',
    10
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'study-spaces',
    'Study spaces',
    'Libraries and other places intended for study.',
    '#0284c7',
    true,
    'published',
    20
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'student-services',
    'Student services',
    'Places where students can get in-person help.',
    '#059669',
    true,
    'published',
    30
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
  official_url,
  data_status,
  status,
  sort_order
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'marie-reay-teaching-centre',
    'Marie Reay Teaching Centre',
    'MR',
    '155 University Avenue, Acton',
    149.120685,
    -35.277786,
    'https://www.anu.edu.au/maps/kambri-precinct/marie-reay-teaching-centre',
    'example',
    'published',
    10
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'beryl-rawson-building',
    'Beryl Rawson Building',
    'BR',
    '13 Ellery Crescent, Acton',
    149.122333,
    -35.278959,
    'https://www.anu.edu.au/maps/beryl-rawson-building',
    'example',
    'published',
    20
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'ad-hope-building',
    'AD Hope Building',
    'AH',
    '14 Ellery Crescent, Acton',
    149.121713,
    -35.278353,
    'https://www.anu.edu.au/maps/ad-hope-building',
    'example',
    'published',
    30
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'chifley-library',
    'Chifley Library',
    'CL',
    '15 Concessions Lane, Acton',
    149.12039,
    -35.27802,
    'https://anulib.anu.edu.au/using-library/branches/chifley-library',
    'example',
    'published',
    10
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000003',
    'student-hub-kambri',
    'Student Hub Kambri',
    'SH',
    'Level 1, Building 154, University Avenue, Kambri',
    149.12105,
    -35.27765,
    'https://www.anu.edu.au/students/contacts/anu-student-hubs',
    'example',
    'published',
    10
  );

insert into public.campus_map_place_details (
  id,
  place_id,
  kind,
  label,
  sort_order
)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'room', 'Marie Reay 2.02', 10),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'room', 'Marie Reay 4.03', 20),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'room', 'Marie Reay 5.06', 30),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'room', 'Marie Reay 6.02', 40),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'place', 'Jean Martin Room', 10),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'service', 'CASS Student Office and Oasis Lounge', 20),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'facility', 'Unisex Accessible toilet Level 1 - 1.56A', 30),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'room', 'AD Hope 1.23', 10),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'room', 'AD Hope G12', 20),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000003', 'room', 'AD Hope LG1', 30),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000003', 'place', 'Classics Museum', 40),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000004', 'facility', 'Individual and group study spaces', 10),
  ('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000004', 'service', 'Chifley information desk', 20),
  ('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000005', 'service', 'General student enquiries', 10),
  ('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000005', 'service', 'Course and program advice', 20),
  ('30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000005', 'service', 'IT support', 30);

commit;
