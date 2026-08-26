import { notFound } from "next/navigation";
import { CourseReview } from "./course-review";
import { loadAdminCourseReview } from "@/lib/coursemap/admin-catalogue";
import { toStudentPreviewCourse } from "@/lib/coursemap/admin-course-preview";
import { loadPublishedCoursesByCodes } from "@/lib/coursemap/published-catalogue";
import { isDemoMode } from "@/lib/supabase/config";

const COURSE_CODE_PATTERN = /\b[A-Z]{4}\d{4}\b/gu;

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const record = await loadAdminCourseReview(code);
  if (!record) notFound();

  const referenced = [
    ...new Set(
      record.rules
        .flatMap((rule) => rule.sourceText.match(COURSE_CODE_PATTERN) ?? [])
        .filter((referencedCode) => referencedCode !== record.code),
    ),
  ];
  let publishedCourseCodes: string[] = [];
  try {
    const published = await loadPublishedCoursesByCodes(
      referenced,
      record.year,
    );
    publishedCourseCodes = published.map((course) => course.code);
  } catch {
    publishedCourseCodes = [];
  }

  return (
    <CourseReview
      canEdit={!isDemoMode() && record.publicationStatus === "draft"}
      previewCourse={toStudentPreviewCourse(record, publishedCourseCodes)}
      record={record}
    />
  );
}

export const dynamic = "force-dynamic";
