import { notFound } from "next/navigation";
import { CourseReview } from "./course-review";
import { loadAdminCourseReview } from "@/lib/coursemap/admin-catalogue";
import { isDemoMode } from "@/lib/supabase/config";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const record = await loadAdminCourseReview(code);
  if (!record) notFound();

  return (
    <CourseReview
      canEdit={!isDemoMode() && record.publicationStatus === "draft"}
      record={record}
    />
  );
}

export const dynamic = "force-dynamic";
