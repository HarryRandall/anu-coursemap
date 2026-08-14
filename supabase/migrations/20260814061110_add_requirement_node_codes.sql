begin;

alter table public.requirement_groups
add constraint requirement_groups_structure_version_code_unique
unique (structure_version_id, code);

alter table public.requirement_groups
add column source_text text;

update public.requirement_groups
set source_text = coalesce(nullif(btrim(description), ''), name);

alter table public.requirement_groups
alter column source_text set not null;

alter table public.requirement_groups
add constraint requirement_groups_source_text_not_blank_check
check (btrim(source_text) <> '');

alter table public.requirement_conditions
add column code text;

update public.requirement_conditions
set code = 'condition-' || position::text;

alter table public.requirement_conditions
alter column code set not null;

alter table public.requirement_conditions
add constraint requirement_conditions_code_not_blank_check
check (btrim(code) <> '');

alter table public.requirement_conditions
add constraint requirement_conditions_group_code_unique
unique (requirement_group_id, code);

commit;
