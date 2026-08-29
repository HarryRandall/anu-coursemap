import { notFound } from "next/navigation";
import { CourseImportTargetReview } from "@/components/admin/imports/course-import-target-review";
import { loadCourseImportTargetDetail } from "@/lib/coursemap/admin-course-imports";

export const dynamic = "force-dynamic";

export default async function CourseImportTargetPage({
  params,
}: {
  params: Promise<{ runId: string; targetId: string }>;
}) {
  const { runId, targetId } = await params;
  const detail = await loadCourseImportTargetDetail({ runId, targetId });
  if (!detail) notFound();
  return <CourseImportTargetReview detail={detail} />;
}
