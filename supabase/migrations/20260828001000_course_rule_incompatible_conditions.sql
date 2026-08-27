-- Administrators can record "must not have completed" as a first-class
-- course-rule condition, distinct from a completed-course prerequisite.

alter table public.course_rule_conditions
  drop constraint course_rule_conditions_kind_check;

alter table public.course_rule_conditions
  add constraint course_rule_conditions_kind_check check (
    condition_kind in (
      'course',
      'incompatible',
      'units_total',
      'subject_units',
      'level_units',
      'permission',
      'admission',
      'other',
      'gpa'
    )
  );

alter table public.course_rule_conditions
  drop constraint course_rule_conditions_typed_value_check;

alter table public.course_rule_conditions
  add constraint course_rule_conditions_typed_value_check check (
    (
      condition_kind = 'course'
      and required_course_id is not null
      and num_nonnulls(
        required_structure_id,
        minimum_units,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'incompatible'
      and required_course_id is not null
      and num_nonnulls(
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'units_total'
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'subject_units'
      and subject_code is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        minimum_course_level,
        maximum_course_level,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'level_units'
      and minimum_course_level is not null
      and minimum_units is not null
      and minimum_units > 0
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_mark,
        subject_code,
        free_text,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'permission'
      and free_text is not null
      and btrim(free_text) <> ''
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'admission'
      and num_nonnulls(required_structure_id, free_text) = 1
      and (free_text is null or btrim(free_text) <> '')
      and num_nonnulls(
        required_course_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'other'
      and free_text is not null
      and btrim(free_text) <> ''
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        minimum_gpa
      ) = 0
    )
    or (
      condition_kind = 'gpa'
      and minimum_gpa is not null
      and minimum_gpa between 0 and 7
      and num_nonnulls(
        required_course_id,
        required_structure_id,
        minimum_units,
        minimum_mark,
        subject_code,
        minimum_course_level,
        maximum_course_level,
        free_text
      ) = 0
    )
  );
