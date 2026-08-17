-- Make the user-requested course page and its direct imported prerequisite
-- available for production verification. Their source rules remain in review
-- state, so the UI continues to label unstructured logic as unknown.
update public.course_versions as versions
set publication_status = 'published'
from public.courses
where courses.id = versions.course_id
  and courses.code in ('ACST8040', 'STAT6045')
  and versions.publication_status = 'draft';
