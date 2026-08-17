begin;

create or replace function public.publish_catalogue_course_version(
  p_course_code text,
  p_catalogue_year smallint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_course_version_id bigint;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if not (select private.has_permission('catalogue.write')) then
    raise exception using errcode = '42501', message = 'Catalogue publishing permission is required.';
  end if;

  select versions.id
  into v_course_version_id
  from public.course_versions as versions
  join public.courses as courses on courses.id = versions.course_id
  join public.catalogue_years as years on years.id = versions.catalogue_year_id
  where courses.code = upper(btrim(p_course_code))
    and years.year = p_catalogue_year;

  if v_course_version_id is null then
    raise exception using errcode = 'P0002', message = 'The imported course version was not found.';
  end if;

  update public.course_versions
  set publication_status = 'published'
  where id = v_course_version_id;

  update public.course_offerings
  set status = 'published'
  where course_version_id = v_course_version_id;

  return v_course_version_id;
end;
$function$;

comment on function public.publish_catalogue_course_version(text, smallint) is
  'Publishes a reviewed imported course version and its offerings for students.';

revoke all on function public.publish_catalogue_course_version(text, smallint) from public;
revoke all on function public.publish_catalogue_course_version(text, smallint) from anon;
revoke all on function public.publish_catalogue_course_version(text, smallint) from service_role;
grant execute on function public.publish_catalogue_course_version(text, smallint) to authenticated;

create or replace function public.publish_catalogue_structure_version(
  p_structure_code text,
  p_catalogue_year smallint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_structure_version_id bigint;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;

  if not (select private.has_permission('catalogue.write')) then
    raise exception using errcode = '42501', message = 'Catalogue publishing permission is required.';
  end if;

  select versions.id
  into v_structure_version_id
  from public.academic_structure_versions as versions
  join public.academic_structures as structures on structures.id = versions.structure_id
  join public.catalogue_years as years on years.id = versions.catalogue_year_id
  where structures.code = upper(btrim(p_structure_code))
    and years.year = p_catalogue_year;

  if v_structure_version_id is null then
    raise exception using errcode = 'P0002', message = 'The imported programme version was not found.';
  end if;

  update public.academic_structure_versions
  set publication_status = 'published'
  where id = v_structure_version_id;

  return v_structure_version_id;
end;
$function$;

comment on function public.publish_catalogue_structure_version(text, smallint) is
  'Publishes a reviewed imported degree, major, minor or specialisation version for student selection.';

revoke all on function public.publish_catalogue_structure_version(text, smallint) from public;
revoke all on function public.publish_catalogue_structure_version(text, smallint) from anon;
revoke all on function public.publish_catalogue_structure_version(text, smallint) from service_role;
grant execute on function public.publish_catalogue_structure_version(text, smallint) to authenticated;

commit;
