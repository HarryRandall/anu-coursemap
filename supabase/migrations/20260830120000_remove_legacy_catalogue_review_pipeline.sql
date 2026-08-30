begin;

-- Course and academic-structure imports now own their review and diagnostic
-- tables. The generic catalogue review family has no remaining writer or
-- reader and contains no development data worth retaining.
drop table public.catalogue_review_items;
drop table public.catalogue_import_diagnostics;
drop function public.catalogue_change_issue_codes();

-- The only remaining generic catalogue consumer is the university-calendar
-- importer. Keep its provenance tables while preventing retired structure and
-- directory values from returning through this compatibility path.
alter table public.catalogue_source_documents
  drop constraint catalogue_source_documents_entity_kind_check,
  add constraint catalogue_source_documents_entity_kind_check check (
    entity_kind = 'calendar'
  );

alter table public.catalogue_import_items
  drop constraint catalogue_import_items_target_kind_check,
  add constraint catalogue_import_items_target_kind_check check (
    target_kind = 'university_calendar'
  );

-- Run numbers are assigned by privileged import RPCs. Authenticated clients
-- can read the table values without direct access to either identity sequence.
revoke usage, select
on sequence public.academic_structure_import_runs_run_number_seq
from authenticated;

revoke usage, select
on sequence public.course_import_runs_run_number_seq
from authenticated;

commit;
