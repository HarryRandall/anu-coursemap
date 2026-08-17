import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { loadPublishedCourse } from "@/lib/coursemap/published-catalogue";
import {
  loadCurrentUserRequisiteCompletion,
  type RequisiteCompletionSnapshot,
} from "@/lib/coursemap/requisite-progress";
import { CourseDetailClient } from "./course-detail-client";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let course = null;
  let requisiteCompletion: RequisiteCompletionSnapshot = {
    completedCourses: [],
    isAuthenticated: false,
  };
  let unavailable = false;
  try {
    [course, requisiteCompletion] = await Promise.all([
      loadPublishedCourse(code),
      loadCurrentUserRequisiteCompletion(),
    ]);
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <AppShell title={code.trim().toUpperCase()}>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">
            Course catalogue temporarily unavailable
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Please try again shortly.
          </p>
        </div>
      </AppShell>
    );
  }

  if (!course) notFound();
  return (
    <CourseDetailClient
      course={course}
      requisiteCompletion={requisiteCompletion}
    />
  );
}

export const dynamic = "force-dynamic";
