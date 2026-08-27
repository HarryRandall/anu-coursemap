-- ANU publishes a class number and four dates for every offering. None of
-- them were storable: offering_sessions held only delivery_mode and location.
--
-- class_number is ANU's own identifier and is stable across rescrapes, so it
-- is the right natural key alongside the period. A tuple assembled from
-- (offering, period, mode) is not: two classes can share all three.

alter table public.offering_sessions
  add column if not exists class_number     text,
  add column if not exists starts_on        date,
  add column if not exists enrol_closes_on  date,
  add column if not exists census_on        date,
  add column if not exists ends_on          date,
  add column if not exists class_summary_url text;

alter table public.offering_sessions
  drop constraint if exists offering_sessions_dates_check;

alter table public.offering_sessions
  add constraint offering_sessions_dates_check
  check (ends_on is null or starts_on is null or ends_on >= starts_on);

comment on column public.offering_sessions.class_number is
  'ANU class number, e.g. 10186. ANU''s own stable identifier for the class.';

-- Distinguishes two classes in the same period, which currently collapse into
-- one row and raise MULTIPLE_CLASSES_IN_ACADEMIC_PERIOD.
--
-- NOTE (corrected 2026-08-27): as written this index is INERT. It was added
-- without dropping offering_sessions_offering_period_unique, which still
-- enforces one session row per (course_offering_id, academic_period_id), so
-- the class grain this index describes is unreachable. See the later
-- offering_sessions_class_grain migration, which drops that constraint and
-- replaces this index with a NULLS NOT DISTINCT unique constraint.
create unique index if not exists offering_sessions_class_unique
  on public.offering_sessions (course_offering_id, academic_period_id, class_number);
