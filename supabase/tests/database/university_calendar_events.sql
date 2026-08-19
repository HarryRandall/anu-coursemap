begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(8);

insert into public.catalogue_years (year, status)
values (2199, 'draft');

insert into public.catalogue_sources (name, kind, base_url, is_active)
values (
  'ANU university calendar test source',
  'anu_university_calendar_test',
  'https://calendar.example.test',
  true
);

select extensions.lives_ok(
  $$
    insert into public.catalogue_source_documents (
      source_id,
      catalogue_year_id,
      entity_kind,
      external_key,
      canonical_url,
      content_sha256
    )
    select
      sources.id,
      years.id,
      'calendar',
      'university-calendar-2199',
      'https://calendar.example.test/?year=2199',
      repeat('a', 64)
    from public.catalogue_sources as sources
    cross join public.catalogue_years as years
    where sources.kind = 'anu_university_calendar_test'
      and years.year = 2199
  $$,
  'catalogue source documents accept the calendar entity kind'
);

insert into public.university_calendar_events (calendar_year, event_date, title, status)
values
  (2199, '2199-02-23', 'Semester 1 begins', 'published'),
  (2199, '2199-06-04', 'Semester 1 examination period', 'draft'),
  (2199, '2199-12-25', 'Christmas Day public holiday', 'archived');

select extensions.throws_ok(
  $$
    insert into public.university_calendar_events (calendar_year, event_date, title)
    values (2199, '2198-01-01', 'Event outside its year')
  $$,
  '23514',
  null,
  'events must fall inside their calendar year'
);

select extensions.throws_ok(
  $$
    insert into public.university_calendar_events (calendar_year, event_date, title)
    values (2199, '2199-01-01', '   ')
  $$,
  '23514',
  null,
  'events must carry a non-blank title'
);

select extensions.throws_ok(
  $$
    insert into public.university_calendar_events (calendar_year, event_date, title, status)
    values (2199, '2199-01-01', 'Event with a bad status', 'live')
  $$,
  '23514',
  null,
  'events only accept draft, published or archived statuses'
);

select extensions.throws_ok(
  $$
    insert into public.university_calendar_events (calendar_year, event_date, title)
    values (2199, '2199-02-23', 'Semester 1 begins')
  $$,
  '23505',
  null,
  'the year, date and title natural key is unique'
);

set local role anon;

select extensions.results_eq(
  $$
    select title
    from public.university_calendar_events
    where calendar_year = 2199
    order by event_date
  $$,
  $$ values ('Semester 1 begins'::text) $$,
  'anonymous visitors only see published events'
);

select extensions.throws_ok(
  $$
    insert into public.university_calendar_events (calendar_year, event_date, title)
    values (2199, '2199-03-01', 'Anonymous write attempt')
  $$,
  '42501',
  null,
  'anonymous visitors cannot write events'
);

reset role;

set local role authenticated;

select extensions.results_eq(
  $$
    select count(*)::int
    from public.university_calendar_events
    where calendar_year = 2199
  $$,
  $$ values (1) $$,
  'authenticated users also only see published events'
);

reset role;

select extensions.finish();

rollback;
