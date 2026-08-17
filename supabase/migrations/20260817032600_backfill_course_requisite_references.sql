-- The initial reference migration created the relation and public graph
-- functions. Backfill existing source wording with the PostgreSQL word-boundary
-- expression used by the importer so already-imported courses are included.
insert into public.courses (code)
select distinct upper(matches[1])
from public.course_rules as rules
cross join lateral regexp_matches(
  rules.source_text,
  '\m([A-Z]{4}[0-9]{4})\M',
  'g'
) as match(matches)
where rules.rule_kind = 'prerequisite'
on conflict (code) do nothing;

insert into public.course_rule_course_references (
  course_rule_id,
  referenced_course_id,
  source_text,
  confidence,
  review_state
)
select
  rules.id,
  courses.id,
  upper(matches[1]),
  0,
  'review'
from public.course_rules as rules
cross join lateral regexp_matches(
  rules.source_text,
  '\m([A-Z]{4}[0-9]{4})\M',
  'g'
) as match(matches)
join public.courses
  on courses.code = upper(matches[1])
where rules.rule_kind = 'prerequisite'
on conflict (course_rule_id, referenced_course_id) do nothing;
