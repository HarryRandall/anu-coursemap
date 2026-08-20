import { CircleAlert } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  loadPublishedCoursePage,
  type PublishedCoursePage,
} from "@/lib/coursemap/published-catalogue";
import { CourseDirectory } from "./course-directory";

type CoursesSearchParams = {
  page?: string | string[];
};

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<CoursesSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(firstParam(params.page)) || 1);
  let result: PublishedCoursePage = {
    courses: [],
    page,
    pageSize: 24,
    total: 0,
  };
  let catalogueUnavailable = false;
  try {
    result = await loadPublishedCoursePage({ page });
  } catch {
    // Show an explicit outage state rather than an empty catalogue.
    catalogueUnavailable = true;
  }
  const paginationSearchParams = {};

  if (catalogueUnavailable) {
    const retryQuery = new URLSearchParams();
    if (page > 1) retryQuery.set("page", String(page));
    const retryHref = retryQuery.size
      ? `/courses?${retryQuery.toString()}`
      : "/courses";
    return (
      <AppShell>
        <h1 className="sr-only">Courses</h1>
        <Card className="mx-auto max-w-xl p-4 sm:p-5">
          <Alert tone="warning" role="alert">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Course catalogue temporarily unavailable</AlertTitle>
            <AlertDescription>
              Courses could not be loaded. Please try again shortly.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <ButtonLink href={retryHref} size="sm" variant="primary">
              Try again
            </ButtonLink>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="sr-only">Courses</h1>
      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col gap-5">
        <CourseDirectory
          courses={result.courses}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          searchParams={paginationSearchParams}
        />
      </div>
    </AppShell>
  );
}

export const dynamic = "force-dynamic";
