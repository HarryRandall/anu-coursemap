begin;

alter function public.publish_catalogue_course_version(text, smallint)
  security invoker;

alter function public.publish_catalogue_structure_version(text, smallint)
  security invoker;

commit;
