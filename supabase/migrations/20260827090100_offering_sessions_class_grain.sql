-- Moves offering_sessions from one row per (offering, period) to one row per
-- class, which is the grain ANU actually publishes.
--
-- 20260826130806 added class_number and the four class dates and created
-- offering_sessions_class_unique, but left offering_sessions_offering_period_unique
-- in place. That constraint is the binding one, so the class-grain index has
-- never been reachable and the importer has been discarding every class after
-- the first in a period (importer.mjs, importOffering: periodSessions[0]).
--
-- NULLS NOT DISTINCT (PG15+; this project runs PG 17.6) so that at most one
-- unnumbered session survives per period. A plain unique index treats NULL
-- class numbers as distinct and would not constrain them at all -- which is
-- the second reason the previous index was ineffective.

alter table public.offering_sessions
  drop constraint offering_sessions_offering_period_unique;

drop index if exists public.offering_sessions_class_unique;

alter table public.offering_sessions
  add constraint offering_sessions_offering_period_class_unique
  unique nulls not distinct (course_offering_id, academic_period_id, class_number);

create index offering_sessions_class_number_idx
  on public.offering_sessions (course_offering_id, class_number);
