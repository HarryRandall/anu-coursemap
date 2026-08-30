import { notFound, redirect } from "next/navigation";
import { CourseReview } from "./course-review";
import { canManageCourseImports, canWriteCourses } from "@/lib/auth/viewer";
import { loadAdminCourseYear } from "@/lib/coursemap/admin-course-year";
import { toStudentPreviewCourseYear } from "@/lib/coursemap/admin-course-preview";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import { loadPublishedCoursesByCodes } from "@/lib/coursemap/published-courses";
import { prerequisiteCodesFromSnapshotProjection } from "@/lib/coursemap/snapshot-prerequisite-codes";
import { isDemoMode } from "@/lib/supabase/config";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    snapshot?: string | string[];
    year?: string | string[];
  }>;
}) {
  const [{ id }, query, canWrite, canViewImports] = await Promise.all([
    params,
    searchParams,
    canWriteCourses(),
    canManageCourseImports(),
  ]);
  const requestedYearValue = Number(first(query.year));
  const requestedYear = Number.isSafeInteger(requestedYearValue)
    ? requestedYearValue
    : undefined;
  const requestedSnapshotValue = Number(first(query.snapshot));
  const requestedSnapshotId = Number.isSafeInteger(requestedSnapshotValue)
    ? requestedSnapshotValue
    : undefined;
  const record = await loadAdminCourseYear(
    id,
    requestedYear,
    canViewImports,
    requestedSnapshotId,
  );
  if (!record) notFound();

  // Codes remain valid entry points, but permanent links use the stable course
  // identity and selected academic year.
  if (
    !isDemoMode() &&
    (id !== record.publicId ||
      requestedYear !== record.year ||
      (requestedSnapshotId !== undefined &&
        requestedSnapshotId !== record.currentSnapshotId))
  ) {
    const snapshotQuery =
      record.currentSnapshotId !== record.activeSnapshotId &&
      record.currentSnapshotId !== null
        ? `&snapshot=${record.currentSnapshotId}`
        : "";
    redirect(
      `/admin/courses/${record.publicId}?year=${record.year}${snapshotQuery}`,
    );
  }

  const referenced = [
    ...new Set(
      record.projection
        ? prerequisiteCodesFromSnapshotProjection(record.projection)
        : [],
    ),
  ].filter((code) => code !== record.code);
  let publishedPrerequisites: CourseDetails[] = [];
  try {
    publishedPrerequisites = await loadPublishedCoursesByCodes(
      referenced,
      record.year,
    );
  } catch {
    publishedPrerequisites = [];
  }

  return (
    <CourseReview
      key={`${record.courseYearId}:${record.currentSnapshotId ?? "none"}`}
      canWrite={!isDemoMode() && canWrite}
      previewCourse={toStudentPreviewCourseYear(record, publishedPrerequisites)}
      record={record}
    />
  );
}

export const dynamic = "force-dynamic";
