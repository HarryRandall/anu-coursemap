-- These are supporting records for the two reviewed public course samples.
-- Publishing only their actual periods and offerings makes availability visible
-- without exposing the rest of the draft timetable or catalogue.
update public.academic_periods
set status = 'published'
where calendar_year = (
  select years.year
  from public.catalogue_years as years
  where years.status = 'published'
  order by years.year desc
  limit 1
)
  and code in ('S1', 'S2')
  and status = 'draft';

update public.course_offerings as offerings
set status = 'published'
from public.course_versions as versions
join public.courses on courses.id = versions.course_id
join public.catalogue_years as years on years.id = versions.catalogue_year_id
where offerings.course_version_id = versions.id
  and courses.code in ('ACST8040', 'STAT6045')
  and versions.publication_status = 'published'
  and years.status = 'published'
  and offerings.status = 'draft';
