/**
 * PostgREST does not type-check string column names passed to `order` or `in`.
 * Keep the less-obvious snapshot relationship keys in one tested contract.
 */
export const COURSE_SNAPSHOT_RELATIONAL_QUERY_SHAPE = {
  offeringOrder: "id",
  fieldEvidenceOrder: "field_key",
  conditionCoursesForeignKey: "condition_id",
} as const;
