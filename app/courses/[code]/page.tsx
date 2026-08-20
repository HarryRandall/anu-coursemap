import { CloudOff } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
      <AppShell>
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="sr-only">Course catalogue temporarily unavailable</h1>
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="error">
                  <CloudOff aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  Course catalogue temporarily unavailable
                </EmptyTitle>
                <EmptyDescription>Please try again shortly.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <ButtonLink
                  href={`/courses/${encodeURIComponent(code)}`}
                  size="sm"
                  variant="primary"
                >
                  Try again
                </ButtonLink>
              </EmptyContent>
            </Empty>
          </Card>
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
