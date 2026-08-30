-- Keep the directory workspace tied to the newest import target for each
-- directory entry. Selecting this in Postgres avoids application-side result
-- caps and makes ties deterministic when targets share a timestamp.
create view public.academic_structure_directory_latest_import_targets
with (security_invoker = true)
as
select distinct on (targets.directory_entry_id)
  targets.id,
  targets.run_id,
  targets.academic_year_id,
  targets.directory_entry_id,
  targets.processing_status,
  targets.review_status,
  targets.change_kind,
  targets.error_summary,
  targets.created_at
from public.academic_structure_import_targets as targets
order by
  targets.directory_entry_id,
  targets.created_at desc,
  targets.id desc;

revoke all on table public.academic_structure_directory_latest_import_targets
from anon, authenticated;

grant select on table public.academic_structure_directory_latest_import_targets
to authenticated;
