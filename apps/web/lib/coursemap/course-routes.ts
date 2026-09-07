/**
 * A course's identity and its academic year are both part of what a link
 * addresses: one course carries a separate record per year. The year is a path
 * segment rather than a query so the address reads as the thing it names and
 * the breadcrumb can show it.
 *
 * A specific snapshot stays a query, because it selects a version of the
 * record the path already identifies rather than a different record.
 */
export function adminCourseDetailPath({
  publicId,
  year,
  snapshotId,
}: {
  publicId: string;
  year?: number;
  snapshotId?: number | null;
}) {
  const base = `/admin/courses/${encodeURIComponent(publicId)}`;
  const pathname = year === undefined ? base : `${base}/${year}`;
  return snapshotId === undefined || snapshotId === null
    ? pathname
    : `${pathname}?snapshot=${snapshotId}`;
}
