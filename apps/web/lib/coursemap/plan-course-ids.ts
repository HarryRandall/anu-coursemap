type CourseIdRow = { course_id: number };

export function collectPlanCatalogueCourseIds(
  planItems: readonly CourseIdRow[],
  courseAttempts: readonly CourseIdRow[],
) {
  return [
    ...new Set(
      [...planItems, ...courseAttempts].map((record) => record.course_id),
    ),
  ];
}
