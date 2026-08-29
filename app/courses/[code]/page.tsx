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
import {
  loadAcademicYearOptions,
  loadPublishedCourse,
} from "@/lib/coursemap/published-courses";
import {
  loadCurrentUserRequisiteCompletion,
  type RequisiteCompletionSnapshot,
} from "@/lib/coursemap/requisite-progress";
import { CourseDetailClient } from "./course-detail-client";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const { code } = await params;
  const requestedYearParam = (await searchParams).year;
  const requestedYear = Number(
    Array.isArray(requestedYearParam)
      ? requestedYearParam[0]
      : requestedYearParam,
  );
  let academicYear = new Date().getFullYear();
  let course = null;
  let requisiteCompletion: RequisiteCompletionSnapshot = {
    completedCourses: [],
    enrolledProgrammeCodes: [],
    isAuthenticated: false,
  };
  let unavailable = false;
  try {
    const years = await loadAcademicYearOptions();
    const availableYears = new Set(years.map((year) => year.year));
    academicYear = availableYears.has(requestedYear)
      ? requestedYear
      : availableYears.has(academicYear)
        ? academicYear
        : (years[0]?.year ?? academicYear);
    [course, requisiteCompletion] = await Promise.all([
      loadPublishedCourse(code, academicYear),
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
                  href={`/courses/${encodeURIComponent(code)}?year=${academicYear}`}
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
