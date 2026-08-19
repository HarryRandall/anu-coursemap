-- course_rule_course_references shipped with only the published-read policy,
-- so catalogue administrators could not read draft references or manage rows
-- through the API at all. Mirror the draft-read and admin policies plus the
-- write grants that every other catalogue table received in the initial
-- schema, including sequence usage for the identity column.
create policy course_rule_course_references_read_drafts
on public.course_rule_course_references
for select
to authenticated
using ((select private.has_permission('catalogue.read_drafts')));

create policy course_rule_course_references_admin_all
on public.course_rule_course_references
for all
to authenticated
using ((select private.has_permission('catalogue.write')))
with check ((select private.has_permission('catalogue.write')));

grant insert, update, delete
on table public.course_rule_course_references
to authenticated;

grant usage, select
on sequence public.course_rule_course_references_id_seq
to authenticated;
