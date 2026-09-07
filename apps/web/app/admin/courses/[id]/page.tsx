import { notFound, redirect } from "next/navigation";
import { canManageCourseImports } from "@/lib/auth/viewer";
import { loadAdminCourseYear } from "@/lib/coursemap/admin-course-year";
import { adminCourseDetailPath } from "@/lib/coursemap/course-routes";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * A course without a year in the path is still a valid entry point, and so is
 * a course code rather than an identifier. Both resolve to a year and redirect
 * to the address that names it.
 *
 * `?year=` is still read here so links written before the year moved into the
 * path land on the year they asked for rather than silently on another one.
 */
export default async function AdminCourseYearlessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    year?: string | string[];
    snapshot?: string | string[];
  }>;
}) {
  const [{ id }, query, canViewImports] = await Promise.all([
    params,
    searchParams,
    canManageCourseImports(),
  ]);
  const legacyYearValue = Number(first(query.year));
  const legacyYear = Number.isSafeInteger(legacyYearValue)
    ? legacyYearValue
    : undefined;
  const snapshotValue = Number(first(query.snapshot));
  const requestedSnapshotId = Number.isSafeInteger(snapshotValue)
    ? snapshotValue
    : undefined;
  const record = await loadAdminCourseYear(
    id,
    legacyYear,
    canViewImports,
    requestedSnapshotId,
  );
  if (!record) notFound();
  redirect(
    adminCourseDetailPath({
      publicId: record.publicId,
      year: record.year,
      snapshotId:
        record.currentSnapshotId !== record.activeSnapshotId
          ? record.currentSnapshotId
          : null,
    }),
  );
}

export const dynamic = "force-dynamic";
