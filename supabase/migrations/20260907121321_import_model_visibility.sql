alter table public.import_models add column visible boolean not null default true;

create or replace function private.guard_import_model_catalogue() returns trigger
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
    if not new.visible and exists (
      select 1 from public.app_settings where key = 'imports.model' and value = to_jsonb(old.id)
    ) then
      raise exception 'Choose another default model before hiding this model.' using errcode = '22023';
    end if;
  elsif tg_table_name = 'app_settings' then
    if new.key = 'imports.model' and not exists (
      select 1 from public.import_models where id = new.value #>> '{}' and enabled and visible
    ) then
      raise exception 'Choose an enabled import model.' using errcode = '22023';
    end if;
  else
    if not exists (select 1 from public.import_models where id = new.requested_model and enabled and visible) then
      raise exception 'Choose an enabled import model.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_import_model_catalogue() from public, anon, authenticated;
