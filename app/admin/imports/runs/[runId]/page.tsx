import { notFound } from "next/navigation";
import { CourseImportRunDetailView } from "@/components/admin/imports/course-import-run-detail";
import { loadCourseImportRunDetail } from "@/lib/coursemap/admin-course-imports";

export const dynamic = "force-dynamic";

export default async function CourseImportRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const detail = await loadCourseImportRunDetail(runId);
  if (!detail) notFound();
  return <CourseImportRunDetailView detail={detail} />;
}
