create table public.import_models (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._:-]*$' and length(id) <= 120),
  name text not null check (length(btrim(name)) between 1 and 160),
  provider text not null check (length(btrim(provider)) between 1 and 80),
  enabled boolean not null default true,
  input_usd_per_million numeric check (input_usd_per_million >= 0 and input_usd_per_million < 1000000),
  output_usd_per_million numeric check (output_usd_per_million >= 0 and output_usd_per_million < 1000000),
  pricing_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.import_models enable row level security;
revoke all on public.import_models from anon, authenticated;
grant select, insert, update on public.import_models to authenticated;
grant all on public.import_models to service_role;
create policy import_models_read on public.import_models for select to authenticated
using ((select private.has_permission('imports.manage')));
create policy import_models_insert on public.import_models for insert to authenticated
with check ((select private.has_permission('imports.manage')));
create policy import_models_update on public.import_models for update to authenticated
using ((select private.has_permission('imports.manage')))
with check ((select private.has_permission('imports.manage')));
create trigger import_models_updated_at before update on public.import_models
for each row execute function private.set_updated_at();

-- Public OpenRouter catalogue rates retrieved on 7 September 2026, in USD per million tokens.
insert into public.import_models (id, name, provider, input_usd_per_million, output_usd_per_million, pricing_updated_at) values
('google/gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite', 'Google', 0.25, 1.5, '2026-09-07T11:29:00Z'),
('google/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'Google', 0.1, 0.4, '2026-09-07T11:29:00Z'),
('qwen/qwen3-32b', 'Qwen3 32B', 'Qwen', 0.08, 0.28, '2026-09-07T11:29:00Z');

-- Retain an existing default even if it was not one of the bundled models.
insert into public.import_models (id, name, provider)
select value #>> '{}', split_part(value #>> '{}', '/', 2), split_part(value #>> '{}', '/', 1)
from public.app_settings where key = 'imports.model' and jsonb_typeof(value) = 'string'
and (value #>> '{}') ~ '^[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._:-]*$'
on conflict do nothing;
insert into public.app_settings (key, value) values ('imports.model', '"google/gemini-3.1-flash-lite"')
on conflict do nothing;

-- Serialise catalogue changes with default selection and admission of new runs.
create function private.guard_import_model_catalogue() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(78241309);
  if tg_table_name = 'import_models' then
    if new.id <> old.id then
      raise exception 'The model identifier cannot be changed.' using errcode = '22023';
    end if;
    if not new.enabled and exists (
      select 1 from public.app_settings where key = 'imports.model' and value = to_jsonb(old.id)
    ) then
      raise exception 'Choose another default model before removing this model.' using errcode = '22023';
    end if;
  elsif tg_table_name = 'app_settings' then
    if new.key = 'imports.model' and not exists (
      select 1 from public.import_models where id = new.value #>> '{}' and enabled
    ) then
      raise exception 'Choose an enabled import model.' using errcode = '22023';
    end if;
  else
    if not exists (select 1 from public.import_models where id = new.requested_model and enabled) then
      raise exception 'Choose an enabled import model.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_import_model_catalogue() from public, anon, authenticated;
create trigger import_models_guard before update on public.import_models
for each row execute function private.guard_import_model_catalogue();
create trigger import_model_default_guard before insert or update on public.app_settings
for each row execute function private.guard_import_model_catalogue();
create trigger course_import_model_guard before insert on public.course_import_runs
for each row execute function private.guard_import_model_catalogue();
create trigger structure_import_model_guard before insert on public.academic_structure_import_runs
for each row execute function private.guard_import_model_catalogue();
