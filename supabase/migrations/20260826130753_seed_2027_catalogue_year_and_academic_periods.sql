-- 2027 catalogue year and its six academic periods.
--
-- catalogue_years held only 2026 and academic_periods held only 2026 periods,
-- so a 2027 class scraped from a course page had nowhere to land.
--
-- NOTE (corrected 2026-08-27): an earlier version of this comment claimed this
-- seed was the root cause of ~180 of the 445 open review items. It is not.
-- All 108 ACADEMIC_PERIOD_DERIVED_FROM_CLASS_DATES rows name *2026* periods
-- (2026:AUTUMN, 2026:S1) and are unaffected by seeding 2027 -- they are
-- derived because the University Calendar adapter never supplied authoritative
-- dates for those 2026 periods. Seeding 2027 is still correct and necessary;
-- it just is not the fix for that diagnostic.
--
-- Dates are ANU's published 2027 university calendar, not derived or assumed.
-- Codes, names, short names and sort order mirror the existing 2026 rows.
--
-- 2028 is deliberately NOT seeded: ANU has not published its 2028 calendar
-- yet, and inventing term dates would recreate the same class of bug.

insert into catalogue_years (year, status)
values (2027, 'draft')
on conflict (year) do nothing;

insert into academic_periods
  (calendar_year, code, name, short_name, starts_on, ends_on, sort_order, status)
values
  (2027, 'SUMMER', 'Summer Session',  'Summer', date '2027-01-01', date '2027-03-31',  5, 'draft'),
  (2027, 'S1',     'First Semester',  'S1',     date '2027-02-22', date '2027-05-28', 10, 'draft'),
  (2027, 'AUTUMN', 'Autumn Session',  'Autumn', date '2027-04-01', date '2027-06-30', 15, 'draft'),
  (2027, 'WINTER', 'Winter Session',  'Winter', date '2027-07-01', date '2027-09-30', 20, 'draft'),
  (2027, 'S2',     'Second Semester', 'S2',     date '2027-07-26', date '2027-10-29', 30, 'draft'),
  (2027, 'SPRING', 'Spring Session',  'Spring', date '2027-10-01', date '2027-12-31', 35, 'draft')
on conflict (calendar_year, code) do nothing;
