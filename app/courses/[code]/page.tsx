import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { loadPublishedCourse } from "@/lib/coursemap/published-catalogue";
import { CourseDetailClient } from "./course-detail-client";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let course = null;
  let unavailable = false;
  try {
    course = await loadPublishedCourse(code);
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
  return <CourseDetailClient course={course} />;
}

export const dynamic = "force-dynamic";
