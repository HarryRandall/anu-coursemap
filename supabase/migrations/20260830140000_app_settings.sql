-- Deployment-wide admin settings that outlive a single request, kept as one
-- row per key so a new setting never needs a schema change. Values are jsonb
-- so a setting can grow from a scalar to a shape without a rewrite.
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint app_settings_key_check check (
    key = btrim(key) and key <> '' and length(key) <= 120
  ),
  foreign key (updated_by) references auth.users (id) on delete set null
);

comment on table public.app_settings is
  'Admin-configured deployment settings, one row per setting key.';

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function private.set_updated_at();

alter table public.app_settings enable row level security;

create policy app_settings_import_admin_read
on public.app_settings
for select
to authenticated
using ((select private.has_permission('imports.manage')));

create policy app_settings_import_admin_insert
on public.app_settings
for insert
to authenticated
with check ((select private.has_permission('imports.manage')));

create policy app_settings_import_admin_update
on public.app_settings
for update
to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));

create policy app_settings_import_admin_delete
on public.app_settings
for delete
to authenticated
using ((select private.has_permission('imports.manage')));

revoke all on table public.app_settings from anon;
grant select, insert, update, delete on table public.app_settings to authenticated;
