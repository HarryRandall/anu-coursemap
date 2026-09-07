import { notFound, redirect } from "next/navigation";
import { CourseReview } from "./course-review";
import { canManageCourseImports, canWriteCourses } from "@/lib/auth/viewer";
import { loadAdminCourseYear } from "@/lib/coursemap/admin-course-year";
import { toStudentPreviewCourseYear } from "@/lib/coursemap/admin-course-preview";
import { adminCourseDetailPath } from "@/lib/coursemap/course-routes";
import type { CourseDetails } from "@/lib/coursemap/course-types";
import { loadPublishedCoursesByCodes } from "@/lib/coursemap/published-courses";
import { prerequisiteCodesFromSnapshotProjection } from "@/lib/coursemap/snapshot-prerequisite-codes";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; year: string }>;
  searchParams: Promise<{ snapshot?: string | string[] }>;
}) {
  const [{ id, year }, query, canWrite, canViewImports] = await Promise.all([
    params,
    searchParams,
    canWriteCourses(),
    canManageCourseImports(),
  ]);
  const requestedYearValue = Number(year);
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
    id !== record.publicId ||
    requestedYear !== record.year ||
    (requestedSnapshotId !== undefined &&
      requestedSnapshotId !== record.currentSnapshotId)
  ) {
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
      canWrite={canWrite}
      canReviewImports={canViewImports}
      previewCourse={toStudentPreviewCourseYear(record, publishedPrerequisites)}
      record={record}
    />
  );
}

export const dynamic = "force-dynamic";
